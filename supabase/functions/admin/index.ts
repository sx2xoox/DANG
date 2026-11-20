// =====================================================================
// 관리자(다웅) / 매니저용 서버 함수
// 모든 요청은 x-admin-token 헤더의 관리자 세션을 서버에서 확인한 뒤 처리합니다.
// 매니저는 사연 보기, 별표, 뽑기(+OBS 카드 표시)만 할 수 있습니다.
// =====================================================================
import { GOMIN } from "../_shared/boxes.ts";
import { clientIp, corsHeaders, HttpError, int, json, readJson, serve, str } from "../_shared/http.ts";
import { adminDb } from "../_shared/db.ts";
import { hashPassword, randomCode, randomToken, safeEqual, sha256, verifyPassword } from "../_shared/crypto.ts";
import { aiEnabled, createReplyDraft } from "../_shared/ai.ts";
import { generateAnimalFor, previousAnimals } from "../_shared/animalJob.ts";

type Role = "owner" | "manager";

const SESSION_HOURS = 12;
const MAX_FAILS = 5;
const LOCK_MINUTES = 10;
const GLOBAL_MAX_FAILS = 30;

const MANAGER_ACTIONS = new Set([
  "session", "logout", "list", "get", "waiting", "set_status", "pick", "today_picks", "broadcast", "broadcast_state",
]);

// ---------------------------------------------------------------------
// 로그인
// ---------------------------------------------------------------------

async function loginLockRemaining(keyHash: string): Promise<number> {
  const { data } = await adminDb()
    .from("auth_attempts")
    .select("success, created_at")
    .eq("kind", "admin")
    .eq("key_hash", keyHash)
    .order("created_at", { ascending: false })
    .limit(MAX_FAILS);
  if (!data || data.length < MAX_FAILS || data.some((r) => r.success)) return 0;
  const last = new Date(data[0].created_at).getTime();
  const remain = last + LOCK_MINUTES * 60_000 - Date.now();
  return remain > 0 ? remain : 0;
}

async function login(req: Request, body: Record<string, unknown>) {
  const password = str(body.password, 200);
  const remember = body.remember !== false;
  const keyHash = await sha256(`admin:${clientIp(req)}`);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 200);

  // IP 를 바꿔가며 시도하는 경우를 막기 위해 사이트 전체 실패 횟수도 봅니다.
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();
  const { count: globalFails } = await adminDb()
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("kind", "admin")
    .eq("success", false)
    .gte("created_at", since);
  if ((globalFails ?? 0) >= GLOBAL_MAX_FAILS) {
    throw new HttpError(429, `최근 ${LOCK_MINUTES}분 동안 틀린 시도가 너무 많아서 잠시 잠겼어요. 잠시 후 다시 시도해 주세요.`, "locked");
  }

  const remain = await loginLockRemaining(keyHash);
  if (remain > 0) {
    throw new HttpError(429, `비밀번호를 ${MAX_FAILS}번 틀려서 잠겼어요. ${Math.ceil(remain / 60000)}분 뒤에 다시 시도해 주세요.`, "locked");
  }
  if (!password) throw new HttpError(400, "비밀번호를 입력해 주세요.");

  const db = adminDb();
  const { data: st } = await db.from("settings").select("admin_password_hash, manager_enabled, manager_code_hash").eq("id", 1).single();

  let role: Role | null = null;
  if (st?.admin_password_hash) {
    if (await verifyPassword(password, st.admin_password_hash)) role = "owner";
  } else {
    const initial = Deno.env.get("ADMIN_INITIAL_PASSWORD") ?? "";
    if (!initial) {
      throw new HttpError(503, "관리자 비밀번호가 아직 설정되지 않았어요. 설치 안내의 'ADMIN_INITIAL_PASSWORD' 항목을 확인해 주세요.");
    }
    if (safeEqual(password, initial)) {
      role = "owner";
      // 처음 로그인하면 해시로 저장해 두고, 이후로는 해시로만 확인합니다.
      await db.from("settings").update({ admin_password_hash: await hashPassword(password), updated_at: new Date().toISOString() }).eq("id", 1);
    }
  }
  if (!role && st?.manager_enabled && st.manager_code_hash) {
    if (await verifyPassword(password, st.manager_code_hash)) role = "manager";
  }

  await db.from("auth_attempts").insert({
    kind: "admin",
    key_hash: keyHash,
    success: !!role,
    detail: `${role ?? "실패"} · ${ua}`.slice(0, 250),
  });
  if (!role) {
    const left = MAX_FAILS - 1 - (await recentFailCount(keyHash));
    throw new HttpError(
      401,
      left > 0 ? `비밀번호가 맞지 않아요. (${left}번 더 틀리면 ${LOCK_MINUTES}분 동안 잠겨요)` : `비밀번호가 맞지 않아요. ${LOCK_MINUTES}분 동안 잠겼어요.`,
      "wrong_password",
    );
  }

  const token = randomToken(32);
  const hours = remember ? SESSION_HOURS : 4;
  const expires = new Date(Date.now() + hours * 3600_000).toISOString();
  await db.from("admin_sessions").insert({ token_hash: await sha256(token), role, expires_at: expires, user_agent: ua });
  return json({ token, role, expires_at: expires });
}

async function recentFailCount(keyHash: string): Promise<number> {
  const { data } = await adminDb()
    .from("auth_attempts")
    .select("success")
    .eq("kind", "admin")
    .eq("key_hash", keyHash)
    .order("created_at", { ascending: false })
    .limit(MAX_FAILS);
  let n = 0;
  for (const r of data ?? []) {
    if (r.success) break;
    n++;
  }
  return n - 1;
}

async function sessionFrom(req: Request): Promise<{ role: Role; tokenHash: string; expires_at: string }> {
  const token = req.headers.get("x-admin-token") ?? "";
  if (!token) throw new HttpError(401, "관리자 로그인이 필요해요.", "no_session");
  const tokenHash = await sha256(token);
  const { data } = await adminDb().from("admin_sessions").select("role, expires_at").eq("token_hash", tokenHash).maybeSingle();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) {
    throw new HttpError(401, "로그인 시간이 끝났어요. 다시 로그인해 주세요.", "no_session");
  }
  return { role: data.role as Role, tokenHash, expires_at: data.expires_at };
}

// ---------------------------------------------------------------------
// 공통 도우미
// ---------------------------------------------------------------------

function kstStart(unit: "day" | "week" | "month"): string {
  const now = new Date(Date.now() + 9 * 3600_000); // KST 기준 날짜 계산
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  let start: number;
  if (unit === "day") start = Date.UTC(y, m, d);
  else if (unit === "month") start = Date.UTC(y, m, 1);
  else {
    const dow = (now.getUTCDay() + 6) % 7; // 월요일 시작
    start = Date.UTC(y, m, d - dow);
  }
  return new Date(start - 9 * 3600_000).toISOString();
}

/** 방송/관리 화면에서 보여줄 이름 (공개 방식 반영) */
function broadcastName(s: { display_name: string; visibility: string }): string {
  return s.visibility === "named" ? s.display_name : "익명의 사연자";
}

const LIST_FIELDS =
  "id, receipt_no, display_name, name_mode, age, gender, category, summary, temperature, wish, stamp, voice, visibility, badge, status, flags, animal_state, viewer_status, created_at, user_id, worry_animals(name, emoji, source), replies(sent_at, kind, draft), follow_ups(count)";

function listRow(s: any) {
  const reply = Array.isArray(s.replies) ? s.replies[0] : s.replies;
  const animal = Array.isArray(s.worry_animals) ? s.worry_animals[0] : s.worry_animals;
  return {
    id: s.id,
    receipt_no: s.receipt_no,
    display_name: s.display_name,
    broadcast_name: broadcastName(s),
    name_mode: s.name_mode,
    age: s.age,
    gender: s.gender,
    category: s.category,
    summary: s.summary,
    temperature: s.temperature,
    wish: s.wish,
    stamp: s.stamp,
    voice: s.voice,
    visibility: s.visibility,
    badge: s.badge,
    status: s.status,
    flags: s.flags,
    animal_state: s.animal_state,
    created_at: s.created_at,
    logged_in: !!s.user_id,
    animal: animal ? { name: animal.name, emoji: animal.emoji, source: animal.source } : null,
    reply_sent_at: reply?.sent_at ?? null,
    reply_kind: reply?.kind ?? null,
    has_draft: !!reply?.draft,
    follow_up_count: s.follow_ups?.[0]?.count ?? 0,
  };
}

function cleanSearch(q: string): string {
  return q.replace(/[,()%*\\]/g, " ").trim();
}

// ---------------------------------------------------------------------
// 사연 목록 / 상세
// ---------------------------------------------------------------------

async function list(body: Record<string, unknown>) {
  const f = (body.filters ?? {}) as Record<string, unknown>;
  const page = Math.max(0, int(body.page) ?? 0);
  const pageSize = 40;
  let q = adminDb().from("stories").select(LIST_FIELDS, { count: "exact" });

  const inList = (key: string, col: string) => {
    const v = f[key];
    if (Array.isArray(v) && v.length) q = q.in(col, v.map((x) => String(x)));
    else if (typeof v === "string" && v) q = q.eq(col, v);
  };
  inList("category", "category");
  inList("stamp", "stamp");
  inList("gender", "gender");
  inList("voice", "voice");
  inList("status", "status");
  inList("visibility", "visibility");
  const ageMin = int(f.age_min);
  const ageMax = int(f.age_max);
  if (ageMin !== null) q = q.gte("age", ageMin);
  if (ageMax !== null) q = q.lte("age", ageMax);
  if (f.replied === "yes") q = q.eq("viewer_status", "replied");
  if (f.replied === "no") q = q.neq("viewer_status", "replied");
  if (typeof f.flag === "string" && f.flag) q = q.contains("flags", [f.flag]);
  const search = cleanSearch(str(f.q, 50));
  if (search) q = q.or(`summary.ilike.%${search}%,body.ilike.%${search}%,display_name.ilike.%${search}%`);

  if (body.sort === "temperature") q = q.order("temperature", { ascending: false }).order("created_at", { ascending: false });
  else if (body.sort === "oldest") q = q.order("created_at", { ascending: true });
  else q = q.order("created_at", { ascending: false });

  const { data, count, error } = await q.range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw new HttpError(500, error.message);
  return json({ items: (data ?? []).map(listRow), total: count ?? 0, page, page_size: pageSize });
}

async function getStory(body: Record<string, unknown>, role: Role) {
  const id = str(body.id, 60);
  const db = adminDb();
  const { data: s } = await db.from("stories").select("*").eq("id", id).maybeSingle();
  if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
  const [{ data: animal }, { data: reply }, { data: followUps }, { data: picks }] = await Promise.all([
    db.from("worry_animals").select("*").eq("story_id", id).maybeSingle(),
    db.from("replies").select("*").eq("story_id", id).maybeSingle(),
    db.from("follow_ups").select("id, body, created_at").eq("story_id", id).order("created_at"),
    db.from("picks").select("picked_at").eq("story_id", id).order("picked_at", { ascending: false }).limit(5),
  ]);
  const { code_hash: _h, code_salt: _s, ...safe } = s;
  return json({
    story: { ...safe, broadcast_name: broadcastName(s), logged_in: !!s.user_id },
    animal,
    reply: role === "owner" ? reply : reply ? { sent_at: reply.sent_at, kind: reply.kind } : null,
    follow_ups: followUps ?? [],
    picks: picks ?? [],
  });
}

const STATUSES = ["new", "starred", "scheduled", "on_air", "read", "hold"];

async function setStatus(body: Record<string, unknown>, role: Role) {
  const id = str(body.id, 60);
  const status = str(body.status, 20);
  if (!STATUSES.includes(status)) throw new HttpError(400, "알 수 없는 상태예요.");
  const db = adminDb();
  const { data: s } = await db.from("stories").select("status").eq("id", id).maybeSingle();
  if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
  if (role === "manager") {
    const ok = (s.status === "new" && status === "starred") || (s.status === "starred" && status === "new");
    if (!ok) throw new HttpError(403, "매니저는 별표만 붙이거나 뗄 수 있어요.");
  }
  const patch: Record<string, unknown> = { status };
  if (status === "read") patch.aired_at = new Date().toISOString();
  await db.from("stories").update(patch).eq("id", id);
  return json({ ok: true });
}

async function toggleFlag(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const flag = str(body.flag, 20);
  if (!["care", "profanity", "targeting", "pii"].includes(flag)) throw new HttpError(400, "알 수 없는 표시예요.");
  const db = adminDb();
  const { data: s } = await db.from("stories").select("flags").eq("id", id).maybeSingle();
  if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
  const flags: string[] = s.flags ?? [];
  const next = flags.includes(flag) ? flags.filter((x) => x !== flag) : [...flags, flag];
  await db.from("stories").update({ flags: next }).eq("id", id);
  return json({ ok: true, flags: next });
}

async function deleteStory(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  await adminDb().from("stories").delete().eq("id", id);
  return json({ ok: true });
}

// ---------------------------------------------------------------------
// 고민 동물
// ---------------------------------------------------------------------

async function regenerateAnimal(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const db = adminDb();
  const { data: s } = await db.from("stories").select("*").eq("id", id).maybeSingle();
  if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
  const prev = s.user_id ? await previousAnimals(s.user_id, s.id) : [];
  await db.from("stories").update({ animal_state: "pending" }).eq("id", id);
  await generateAnimalFor(s, prev);
  const [{ data: animal }, { data: st }] = await Promise.all([
    db.from("worry_animals").select("*").eq("story_id", id).single(),
    db.from("stories").select("animal_state").eq("id", id).single(),
  ]);
  return json({ animal, animal_state: st?.animal_state, ai_enabled: aiEnabled() });
}

async function updateAnimal(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const a = (body.animal ?? {}) as Record<string, unknown>;
  const name = str(a.name, 12);
  const emoji = str(a.emoji, 16);
  const tags = Array.isArray(a.hashtags) ? (a.hashtags as unknown[]).map((t) => str(t, 20)).filter(Boolean).slice(0, 3) : [];
  if (!name || !emoji) throw new HttpError(400, "동물 이름(12자 이내)과 이모지를 넣어주세요.");
  const patch = {
    name,
    emoji,
    why: str(a.why, 120),
    description: str(a.description, 800),
    quote: str(a.quote, 80),
    hashtags: tags.map((t) => (t.startsWith("#") ? t : `#${t}`)),
    source: "manual",
    updated_at: new Date().toISOString(),
  };
  const db = adminDb();
  await db.from("worry_animals").update(patch).eq("story_id", id);
  await db.from("stories").update({ animal_state: "manual" }).eq("id", id);
  return json({ ok: true });
}

// ---------------------------------------------------------------------
// 답장
// ---------------------------------------------------------------------

async function draftReply(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const db = adminDb();
  const { data: s } = await db.from("stories").select("*").eq("id", id).maybeSingle();
  if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
  const [{ data: followUps }, { data: animal }] = await Promise.all([
    db.from("follow_ups").select("body").eq("story_id", id).order("created_at"),
    db.from("worry_animals").select("name, emoji").eq("story_id", id).maybeSingle(),
  ]);
  let draft: string;
  try {
    draft = await createReplyDraft({
      category: s.category,
      temperature: s.temperature,
      wish: s.wish,
      stamp: s.stamp,
      voice: s.voice,
      summary: s.summary,
      body: s.body,
      care: (s.flags ?? []).includes("care"),
      forbidden: [s.display_name],
      followUps: (followUps ?? []).map((f) => f.body),
      animal,
    });
  } catch (e) {
    throw new HttpError(502, e instanceof Error ? e.message : "AI 초안을 만들지 못했어요.");
  }
  await db.from("replies").upsert({ story_id: id, draft, updated_at: new Date().toISOString() }, { onConflict: "story_id" });
  return json({ draft });
}

function replyFields(body: Record<string, unknown>) {
  const yes = int(body.verdict_yes);
  const no = int(body.verdict_no);
  const vod = str(body.vod_url, 500);
  if (vod && !/^https?:\/\//i.test(vod)) throw new HttpError(400, "다시보기 링크는 http 로 시작해야 해요.");
  const aired = str(body.aired_on, 10);
  if (aired && !/^\d{4}-\d{2}-\d{2}$/.test(aired)) throw new HttpError(400, "방송 날짜 형식이 맞지 않아요.");
  return {
    body: str(body.body, 6000),
    aired_on: aired || null,
    vod_url: vod || null,
    verdict_yes: yes === null ? null : Math.min(100, Math.max(0, yes)),
    verdict_no: no === null ? null : Math.min(100, Math.max(0, no)),
  };
}

async function saveReply(body: Record<string, unknown>, send: boolean) {
  const id = str(body.id, 60);
  const fields = replyFields(body);
  if (send && fields.body.length < 2) throw new HttpError(400, "답장 내용을 써주세요.");
  const now = new Date().toISOString();
  const db = adminDb();
  const { data: existing } = await db.from("replies").select("sent_at").eq("story_id", id).maybeSingle();
  const row: Record<string, unknown> = { story_id: id, ...fields, updated_at: now };
  if (send) {
    row.kind = "manual";
    row.sent_at = now;
    row.draft = null;
    row.opened_at = null;
  } else if (!existing?.sent_at) {
    row.draft = fields.body || null;
  }
  const { error } = await db.from("replies").upsert(row, { onConflict: "story_id" });
  if (error) throw new HttpError(500, error.message);
  return json({ ok: true, sent_at: send ? now : existing?.sent_at ?? null });
}

async function unsendReply(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  await adminDb().from("replies").update({ sent_at: null, opened_at: null, updated_at: new Date().toISOString() }).eq("story_id", id);
  return json({ ok: true });
}

async function waiting() {
  const { data } = await adminDb()
    .from("stories")
    .select(LIST_FIELDS)
    .neq("viewer_status", "replied")
    .order("created_at", { ascending: true })
    .limit(300);
  const rows = (data ?? []).map(listRow);
  rows.sort((a, b) => {
    const ca = a.flags.includes("care") ? 0 : 1;
    const cb = b.flags.includes("care") ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return a.created_at < b.created_at ? -1 : 1;
  });
  return json({ items: rows });
}

// ---------------------------------------------------------------------
// 뽑기 / OBS
// ---------------------------------------------------------------------

async function pick(body: Record<string, unknown>) {
  const f = (body.filters ?? {}) as Record<string, unknown>;
  let q = adminDb()
    .from("stories")
    .select("id, receipt_no, display_name, visibility, summary, stamp, category, status, age, gender, voice")
    .neq("visibility", "private");
  const statuses = Array.isArray(f.statuses) ? (f.statuses as string[]).filter((x) => STATUSES.includes(x)) : [];
  if (statuses.length) q = q.in("status", statuses);
  const cats = Array.isArray(f.categories) ? (f.categories as string[]) : [];
  if (cats.length) q = q.in("category", cats);
  if (f.exclude_read !== false) q = q.neq("status", "read");
  if (f.exclude_hold !== false) q = q.neq("status", "hold");
  const { data } = await q.order("created_at", { ascending: false }).limit(500);
  const pool = data ?? [];
  if (!pool.length) throw new HttpError(404, "조건에 맞는 사연이 없어요. 조건을 바꿔보세요.");

  const result = pool[Math.floor(Math.random() * pool.length)];
  const others = pool.filter((s) => s.id !== result.id).sort(() => Math.random() - 0.5).slice(0, 11);
  const candidates = [...others, result].sort(() => Math.random() - 0.5);
  const roulette = {
    id: randomToken(8),
    started_at: new Date().toISOString(),
    duration_ms: 5200,
    result_index: candidates.findIndex((c) => c.id === result.id),
    candidates: candidates.map((c) => ({ id: c.id, name: broadcastName(c), summary: c.summary, stamp: c.stamp })),
  };
  const db = adminDb();
  await db.from("picks").insert({ story_id: result.id });
  if (body.show_on_obs !== false) {
    await db
      .from("broadcast_state")
      .update({ story_id: result.id, hidden: false, revealed: false, roulette, updated_at: new Date().toISOString() })
      .eq("id", 1);
  }
  return json({ result, roulette, pool_size: pool.length });
}

async function todayPicks() {
  const { data } = await adminDb()
    .from("picks")
    .select("picked_at, stories(id, receipt_no, display_name, visibility, summary, stamp, status)")
    .gte("picked_at", kstStart("day"))
    .order("picked_at", { ascending: false });
  return json({
    items: (data ?? [])
      .filter((p: any) => p.stories)
      .map((p: any) => ({ picked_at: p.picked_at, ...p.stories, broadcast_name: broadcastName(p.stories) })),
  });
}

async function broadcast(body: Record<string, unknown>) {
  const op = str(body.op, 20);
  const db = adminDb();
  const now = new Date().toISOString();
  if (op === "show") {
    const id = str(body.id, 60);
    const { data: s } = await db.from("stories").select("visibility").eq("id", id).maybeSingle();
    if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
    if (s.visibility === "private") throw new HttpError(400, "'방장만 보기' 사연은 방송 카드에 띄울 수 없어요.");
    await db.from("broadcast_state").update({ story_id: id, hidden: false, revealed: false, roulette: null, updated_at: now }).eq("id", 1);
  } else if (op === "hide") {
    await db.from("broadcast_state").update({ hidden: true, roulette: null, updated_at: now }).eq("id", 1);
  } else if (op === "reveal" || op === "unreveal") {
    await db.from("broadcast_state").update({ revealed: op === "reveal", updated_at: now }).eq("id", 1);
  } else {
    throw new HttpError(400, "알 수 없는 방송 동작이에요.");
  }
  return broadcastState();
}

async function broadcastState() {
  const { data } = await adminDb()
    .from("broadcast_state")
    .select("story_id, hidden, revealed, roulette, updated_at, stories(receipt_no, summary, display_name, visibility)")
    .eq("id", 1)
    .single();
  return json(data);
}

// ---------------------------------------------------------------------
// 통계 / 설정
// ---------------------------------------------------------------------

async function stats() {
  const db = adminDb();
  const week = kstStart("week");
  const [{ data: weekRows }, { count: total }, { count: replied }, { count: autoReplied }, { data: animals }, aiToday, aiMonth, aiFailToday] =
    await Promise.all([
      db.from("stories").select("category, age, stamp, viewer_status").gte("created_at", week),
      db.from("stories").select("id", { count: "exact", head: true }),
      db.from("replies").select("story_id", { count: "exact", head: true }).not("sent_at", "is", null),
      db.from("replies").select("story_id", { count: "exact", head: true }).not("sent_at", "is", null).eq("kind", "auto"),
      db.from("worry_animals").select("name, emoji").order("created_at", { ascending: false }).limit(500),
      db.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", kstStart("day")),
      db.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", kstStart("month")),
      db.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", kstStart("day")).eq("ok", false),
    ]);

  const count = <T,>(rows: T[], key: (r: T) => string) => {
    const m: Record<string, number> = {};
    for (const r of rows) {
      const k = key(r);
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  };
  const rows = weekRows ?? [];
  const ageBand = (a: number | null) => {
    if (a === null || a === undefined) return "모름";
    if (a < 14) return "13세 이하";
    if (a < 20) return "14~19세";
    if (a < 25) return "20~24세";
    if (a < 30) return "25~29세";
    if (a < 40) return "30대";
    return "40세 이상";
  };
  const animalCounts = count(animals ?? [], (a: any) => `${a.emoji} ${a.name}`);
  const topAnimals = Object.entries(animalCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return json({
    week_count: rows.length,
    week_by_category: count(rows, (r: any) => r.category),
    week_by_age: count(rows, (r: any) => ageBand(r.age)),
    week_by_stamp: count(rows, (r: any) => r.stamp),
    total: total ?? 0,
    replied: replied ?? 0,
    auto_replied: autoReplied ?? 0,
    reply_rate: total ? Math.round(((replied ?? 0) / total) * 100) : 0,
    top_animals: topAnimals,
    ai: { today: aiToday.count ?? 0, month: aiMonth.count ?? 0, failed_today: aiFailToday.count ?? 0, enabled: aiEnabled(), model: Deno.env.get("AI_MODEL") || "claude-opus-5-5" },
  });
}

async function getSettings(role: Role) {
  const { data } = await adminDb().from("settings").select("*").eq("id", 1).single();
  if (!data) throw new HttpError(500, "설정을 불러오지 못했어요.");
  const base = {
    site_name: data.site_name,
    tagline: data.tagline,
    week_theme: data.week_theme,
    preset: data.preset,
    accepting: data.accepting,
  };
  if (role !== "owner") return json(base);
  return json({
    ...base,
    auto_reply_enabled: data.auto_reply_enabled,
    auto_reply_days: data.auto_reply_days,
    manager_enabled: data.manager_enabled,
    obs_key: data.obs_key,
    ai_enabled: aiEnabled(),
    ai_model: Deno.env.get("AI_MODEL") || "claude-opus-5-5",
  });
}

async function updateSettings(body: Record<string, unknown>) {
  const s = (body.settings ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof s.site_name === "string") {
    const v = str(s.site_name, 40);
    if (!v) throw new HttpError(400, "사이트 이름을 비워둘 수 없어요.");
    patch.site_name = v;
  }
  if (typeof s.tagline === "string") patch.tagline = str(s.tagline, 80);
  if (typeof s.week_theme === "string") patch.week_theme = str(s.week_theme, 40);
  if (typeof s.preset === "string") {
    if (!["classic", "cork", "gacha"].includes(s.preset)) throw new HttpError(400, "알 수 없는 디자인이에요.");
    patch.preset = s.preset;
  }
  if (typeof s.accepting === "boolean") patch.accepting = s.accepting;
  if (typeof s.auto_reply_enabled === "boolean") patch.auto_reply_enabled = s.auto_reply_enabled;
  if (s.auto_reply_days !== undefined) {
    const d = int(s.auto_reply_days);
    if (d === null || d < 1 || d > 60) throw new HttpError(400, "자동 답장 기간은 1~60일 사이로 정해주세요.");
    patch.auto_reply_days = d;
  }
  await adminDb().from("settings").update(patch).eq("id", 1);
  return getSettings("owner");
}

async function changePassword(body: Record<string, unknown>, tokenHash: string) {
  const current = str(body.current, 200);
  const next = str(body.next, 200);
  const confirm = str(body.confirm, 200);
  if (next.length < 8) throw new HttpError(400, "새 비밀번호는 8자 이상으로 정해주세요.");
  if (next !== confirm) throw new HttpError(400, "새 비밀번호 두 번이 서로 달라요.");
  const db = adminDb();
  const { data: st } = await db.from("settings").select("admin_password_hash").eq("id", 1).single();
  const ok = st?.admin_password_hash
    ? await verifyPassword(current, st.admin_password_hash)
    : safeEqual(current, Deno.env.get("ADMIN_INITIAL_PASSWORD") ?? "\u0000");
  if (!ok) throw new HttpError(401, "지금 비밀번호가 맞지 않아요.");
  await db.from("settings").update({ admin_password_hash: await hashPassword(next), updated_at: new Date().toISOString() }).eq("id", 1);
  // 다른 기기의 방장 로그인은 모두 끊기
  await db.from("admin_sessions").delete().eq("role", "owner").neq("token_hash", tokenHash);
  return json({ ok: true });
}

async function managerCode(body: Record<string, unknown>) {
  const op = str(body.op, 10);
  const db = adminDb();
  if (op === "create") {
    const code = `M-${randomCode()}`;
    await db.from("settings").update({ manager_enabled: true, manager_code_hash: await hashPassword(code), updated_at: new Date().toISOString() }).eq("id", 1);
    await db.from("admin_sessions").delete().eq("role", "manager");
    return json({ code });
  }
  if (op === "disable") {
    await db.from("settings").update({ manager_enabled: false, manager_code_hash: null, updated_at: new Date().toISOString() }).eq("id", 1);
    await db.from("admin_sessions").delete().eq("role", "manager");
    return json({ ok: true });
  }
  throw new HttpError(400, "알 수 없는 요청이에요.");
}

async function rotateObsKey() {
  const key = randomToken(24);
  await adminDb().from("settings").update({ obs_key: key, updated_at: new Date().toISOString() }).eq("id", 1);
  return json({ obs_key: key });
}

async function attempts() {
  const { data } = await adminDb()
    .from("auth_attempts")
    .select("success, detail, created_at")
    .eq("kind", "admin")
    .order("created_at", { ascending: false })
    .limit(50);
  return json({ items: data ?? [] });
}

async function exportCsv() {
  const { data } = await adminDb()
    .from("stories")
    .select("receipt_no, created_at, display_name, name_mode, visibility, age, gender, category, summary, body, temperature, wish, stamp, voice, status, flags, viewer_status, worry_animals(name, emoji), replies(body, kind, sent_at)")
    .order("created_at", { ascending: true });
  const label = (list: { id: string; label: string }[], id: string) => list.find((o) => o.id === id)?.label ?? id;
  const head = ["접수번호", "날짜", "이름", "이름방식", "공개방식", "나이", "성별", "종류", "한줄요약", "본문", "온도", "듣고싶은말", "우표", "목소리", "상태", "표시", "고민동물", "답장종류", "답장", "답장일"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [head.map(esc).join(",")];
  for (const s of (data ?? []) as any[]) {
    const a = Array.isArray(s.worry_animals) ? s.worry_animals[0] : s.worry_animals;
    const r = Array.isArray(s.replies) ? s.replies[0] : s.replies;
    lines.push(
      [
        s.receipt_no,
        s.created_at,
        s.display_name,
        s.name_mode === "chzzk" ? "치지직 닉네임" : "익명",
        label(GOMIN.visibilities, s.visibility),
        s.age,
        label(GOMIN.genders, s.gender),
        label(GOMIN.categories, s.category),
        s.summary,
        s.body,
        s.temperature,
        label(GOMIN.wishes, s.wish),
        label(GOMIN.stamps, s.stamp),
        label(GOMIN.voices, s.voice),
        s.status,
        (s.flags ?? []).join(" "),
        a ? `${a.emoji} ${a.name}` : "",
        r?.sent_at ? (r.kind === "auto" ? "자동" : "직접") : "",
        r?.sent_at ? r.body : "",
        r?.sent_at ?? "",
      ].map(esc).join(","),
    );
  }
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { ...corsHeaders, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="sayeon.csv"' },
  });
}

// ---------------------------------------------------------------------

serve(async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "POST 로만 호출할 수 있어요.");
  const body = await readJson<Record<string, unknown>>(req);
  const action = str(body.action, 40);
  if (action === "login") return login(req, body);

  const session = await sessionFrom(req);
  if (session.role === "manager" && !MANAGER_ACTIONS.has(action)) {
    throw new HttpError(403, "매니저 권한으로는 할 수 없는 일이에요.", "forbidden");
  }

  switch (action) {
    case "session":
      return json({ role: session.role, expires_at: session.expires_at });
    case "logout":
      await adminDb().from("admin_sessions").delete().eq("token_hash", session.tokenHash);
      return json({ ok: true });
    case "list":
      return list(body);
    case "get":
      return getStory(body, session.role);
    case "set_status":
      return setStatus(body, session.role);
    case "toggle_flag":
      return toggleFlag(body);
    case "delete":
      return deleteStory(body);
    case "animal_regenerate":
      return regenerateAnimal(body);
    case "animal_update":
      return updateAnimal(body);
    case "reply_draft":
      return draftReply(body);
    case "reply_save":
      return saveReply(body, false);
    case "reply_send":
      return saveReply(body, true);
    case "reply_unsend":
      return unsendReply(body);
    case "waiting":
      return waiting();
    case "pick":
      return pick(body);
    case "today_picks":
      return todayPicks();
    case "broadcast":
      return broadcast(body);
    case "broadcast_state":
      return broadcastState();
    case "stats":
      return stats();
    case "settings_get":
      return getSettings(session.role);
    case "settings_update":
      return updateSettings(body);
    case "change_password":
      return changePassword(body, session.tokenHash);
    case "manager_code":
      return managerCode(body);
    case "obs_rotate":
      return rotateObsKey();
    case "attempts":
      return attempts();
    case "export_csv":
      return exportCsv();
    default:
      throw new HttpError(400, "알 수 없는 요청이에요.");
  }
});
