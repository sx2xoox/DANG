// =====================================================================
// 관리자(다웅) / 매니저용 서버 함수
// 모든 요청은 x-admin-token 헤더의 관리자 세션을 서버에서 확인한 뒤 처리합니다.
// 흐름: 검토 대기 → 승인(방송 대기열) / 반려 → 방송 시작 → OBS 로 열어서 "읽기 시작"
//       → 오늘 방송 정리(다시보기 주소, 한마디) → 결과 공개 → 상담 후기 → 후기 벽
// 매니저는 사연 보기, 별표, 뽑기(+OBS 카드 조작), 방송 시작/읽기 시작만 할 수 있습니다.
// (후기 승인, 방송 결과 공개, 다시보기 링크 입력, 황금 동물 지급은 방장만)
// =====================================================================
import { ageGroupFromAge, ageGroupLabel, GOMIN } from "../_shared/boxes.ts";
import { clientIp, corsHeaders, HttpError, int, json, readJson, serve, str } from "../_shared/http.ts";
import { adminDb } from "../_shared/db.ts";
import { hashPassword, randomCode, randomToken, safeEqual, sha256, verifyPassword } from "../_shared/crypto.ts";
import { aiEnabled } from "../_shared/ai.ts";
import { generateAnimalFor, previousAnimals } from "../_shared/animalJob.ts";
import { HOST_NOTE_MAX, PRIVATE_MESSAGE_MAX, REACTIONS, reactionLabel, validVodUrl, vodLink } from "../_shared/results.ts";
import { collectToDex } from "../_shared/dex.ts";
import { MASCOT_ANIMALS, mascotFor } from "../_shared/mascots.ts";

type Role = "owner" | "manager";

const SESSION_HOURS = 12;
const MAX_FAILS = 5;
const LOCK_MINUTES = 10;
const GLOBAL_MAX_FAILS = 30;

const MANAGER_ACTIONS = new Set([
  "session", "logout", "list", "get", "queue", "toggle_star", "pick_next", "today_picks", "broadcast", "broadcast_state",
  "alerts", "broadcast_current", "broadcast_start", "broadcast_update", "broadcast_end", "read_start", "reviews_list", "after_list",
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

const KST = 9 * 3600_000;

function kstStart(unit: "day" | "week" | "month"): string {
  const now = new Date(Date.now() + KST);
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
  return new Date(start - KST).toISOString();
}

/** 한국 날짜 (2026-11-20) */
function kstDay(iso: string): string {
  return new Date(new Date(iso).getTime() + KST).toISOString().slice(0, 10);
}

/** 방송/관리 화면에서 보여줄 이름 (공개 방식 반영) */
function broadcastName(s: { display_name: string; visibility: string }): string {
  return s.visibility === "named" ? s.display_name : "익명의 사연자";
}

const LIST_FIELDS =
  "id, receipt_no, display_name, name_mode, age, age_group, age_public, gender, category, summary, temperature, wish, stamp, voice, visibility, badge, status, starred, scheduled, consent_shorts, ref, flags, animal_state, viewer_status, created_at, reviewed_at, aired_at, read_started_at, result_published_at, waiting_notice_at, user_id, worry_animals(name, emoji, source), follow_ups(count), reviews(reaction)";

function listRow(s: any) {
  const animal = Array.isArray(s.worry_animals) ? s.worry_animals[0] : s.worry_animals;
  return {
    id: s.id,
    receipt_no: s.receipt_no,
    display_name: s.display_name,
    broadcast_name: broadcastName(s),
    name_mode: s.name_mode,
    age: s.age,
    age_group: s.age_group,
    age_public: s.age_public,
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
    starred: s.starred,
    scheduled: s.scheduled,
    consent_shorts: s.consent_shorts,
    ref: s.ref,
    flags: s.flags,
    animal_state: s.animal_state,
    created_at: s.created_at,
    created_day: kstDay(s.created_at),
    reviewed_at: s.reviewed_at,
    aired_at: s.aired_at,
    read_started_at: s.read_started_at,
    result_published_at: s.result_published_at,
    waiting_notice: !!s.waiting_notice_at,
    waited_days: Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86_400_000),
    logged_in: !!s.user_id,
    animal: animal ? { name: animal.name, emoji: animal.emoji, source: animal.source } : null,
    follow_up_count: s.follow_ups?.[0]?.count ?? 0,
    review_reaction: (Array.isArray(s.reviews) ? s.reviews[0] : s.reviews)?.reaction ?? null,
  };
}

function cleanSearch(q: string): string {
  return q.replace(/[,()%*\\]/g, " ").trim();
}

const STATUSES = ["pending", "approved", "on_air", "read", "rejected"];

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
  if (f.starred === true || f.starred === "yes") q = q.eq("starred", true);
  if (f.shorts === true || f.shorts === "yes") q = q.eq("consent_shorts", true);
  if (typeof f.ref === "string" && f.ref) q = q.eq("ref", f.ref.toLowerCase());
  if (typeof f.flag === "string" && f.flag) q = q.contains("flags", [f.flag]);
  const search = cleanSearch(str(f.q, 50));
  if (search) q = q.or(`summary.ilike.%${search}%,body.ilike.%${search}%,display_name.ilike.%${search}%`);

  if (body.sort === "temperature") q = q.order("temperature", { ascending: false }).order("created_at", { ascending: false });
  else if (body.sort === "oldest") q = q.order("created_at", { ascending: true });
  else q = q.order("created_at", { ascending: false });

  const { data, count, error } = await q.range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw new HttpError(500, error.message);

  // 검토 대기 수 (메뉴 배지용)
  const { count: pending } = await adminDb().from("stories").select("id", { count: "exact", head: true }).eq("status", "pending");
  return json({ items: (data ?? []).map(listRow), total: count ?? 0, page, page_size: pageSize, pending_count: pending ?? 0 });
}

async function getStory(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const db = adminDb();
  const { data: s } = await db.from("stories").select("*").eq("id", id).maybeSingle();
  if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
  const [{ data: animal }, { data: followUps }, { data: picks }, { data: review }, { data: dex }, { data: bc }] = await Promise.all([
    db.from("worry_animals").select("*").eq("story_id", id).maybeSingle(),
    db.from("follow_ups").select("id, body, flags, care_checked, created_at").eq("story_id", id).order("created_at"),
    db.from("picks").select("picked_at").eq("story_id", id).order("picked_at", { ascending: false }).limit(5),
    db.from("reviews").select("*").eq("story_id", id).maybeSingle(),
    db.from("dex_entries").select("golden, golden_code, claim_name, claimed_at, paid_at, collected_at").eq("story_id", id).maybeSingle(),
    s.broadcast_id ? db.from("broadcasts").select("id, started_at, vod_url, published_at").eq("id", s.broadcast_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { code_hash: _h, code_salt: _s, ...safe } = s;
  return json({
    story: { ...safe, broadcast_name: broadcastName(s), logged_in: !!s.user_id, created_day: kstDay(s.created_at), waiting_notice: !!s.waiting_notice_at },
    animal,
    follow_ups: followUps ?? [],
    picks: picks ?? [],
    review: review ?? null,
    dex: dex ?? null,
    broadcast: bc ?? null,
  });
}

/** 상태 바꾸기: 승인 / 반려 / 검토 대기로 되돌리기 / 방송 중 / 읽음 (방장만) */
async function setStatus(body: Record<string, unknown>) {
  const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).map((x) => str(x, 60)).filter(Boolean) : [str(body.id, 60)];
  const status = str(body.status, 20);
  if (!STATUSES.includes(status)) throw new HttpError(400, "알 수 없는 상태예요.");
  if (!ids.length || ids.length > 200) throw new HttpError(400, "사연을 골라주세요.");
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status };
  if (status === "approved" || status === "rejected") patch.reviewed_at = now;
  if (status === "pending") patch.reviewed_at = null;
  if (status === "read") Object.assign(patch, { aired_at: now, scheduled: false });
  const db = adminDb();
  if (status === "read") {
    // "읽기 시작" 없이 읽음 처리한 사연은 지금 방송 회차에 붙여두고(시간은 비워둠) 오늘 방송 정리에서 채웁니다.
    const bc = await currentBroadcastRow();
    const { data: rows } = await db.from("stories").select("id, status, broadcast_id").in("id", ids);
    for (const r of rows ?? []) {
      if (r.status === "read") continue;
      await db.from("stories").update({ ...patch, broadcast_id: r.broadcast_id ?? bc?.id ?? null }).eq("id", r.id);
    }
  } else {
    // 읽음에서 되돌리면 방송 결과도 함께 지워요 (사연자 화면에서도 "방송 대기"로 돌아감)
    Object.assign(patch, { result_published_at: null, read_started_at: null, vod_offset_sec: null, vod_url: null, broadcast_id: null, aired_at: null });
    await db.from("stories").update(patch).in("id", ids);
  }
  // 읽음 처리하면 방송 카드도 내립니다.
  if (status === "read") {
    const { data: b } = await db.from("broadcast_state").select("story_id").eq("id", 1).single();
    if (b?.story_id && ids.includes(b.story_id)) {
      await db.from("broadcast_state").update({ hidden: true, roulette: null, updated_at: now }).eq("id", 1);
    }
  }
  return json({ ok: true });
}

async function toggleStar(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const db = adminDb();
  const { data: s } = await db.from("stories").select("starred").eq("id", id).maybeSingle();
  if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
  await db.from("stories").update({ starred: !s.starred }).eq("id", id);
  return json({ ok: true, starred: !s.starred });
}

async function toggleFlag(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const flag = str(body.flag, 20);
  if (!["care", "profanity", "targeting", "pii", "school"].includes(flag)) throw new HttpError(400, "알 수 없는 표시예요.");
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
  const { animal, animalState } = await generateAnimalFor(s, prev);
  return json({ animal, animal_state: animalState, ai_enabled: aiEnabled() });
}

async function updateAnimal(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const a = (body.animal ?? {}) as Record<string, unknown>;
  const name = str(a.name, 12);
  const emoji = str(a.emoji, 16);
  const tags = Array.isArray(a.hashtags) ? (a.hashtags as unknown[]).map((t) => str(t, 20)).filter(Boolean).slice(0, 3) : [];
  if (!name || !emoji) throw new HttpError(400, "동물 이름(12자 이내)과 이모지를 넣어주세요.");
  const mascot = mascotFor(name);
  if (!mascot) throw new HttpError(400, `이름 끝을 캐릭터가 있는 동물로 해주세요: ${MASCOT_ANIMALS.join(", ")}`);
  const patch = {
    name,
    emoji: mascot.emoji,
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
// 방송 대기열 / 뽑기 / OBS
// ---------------------------------------------------------------------

/** 방송 대기열: 승인된 사연을 오래된 순서로. 날짜별로 묶어서 돌려줍니다. */
async function queue() {
  const { data } = await adminDb()
    .from("stories")
    .select(LIST_FIELDS)
    .in("status", ["approved", "on_air"])
    .order("created_at", { ascending: true })
    .limit(500);
  const items = (data ?? []).map(listRow);
  const { count: pending } = await adminDb().from("stories").select("id", { count: "exact", head: true }).eq("status", "pending");
  return json({ items, pending_count: pending ?? 0 });
}

/**
 * 다음 사연 뽑기
 *  - 방송 대기열(승인됨)에서 가장 오래된 날짜의 사연이 우선
 *  - 그 날짜에 사연이 하나면 바로 그 사연, 여러 개면 그날 사연들끼리 룰렛
 */
async function pickNext(body: Record<string, unknown>) {
  const { data } = await adminDb()
    .from("stories")
    .select("id, receipt_no, display_name, visibility, summary, stamp, category, created_at, scheduled")
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(500);
  const all = data ?? [];
  // "방송 예정"으로 표시해 둔 사연이 있으면 그 사연들 중에서 먼저 뽑아요.
  const scheduled = all.filter((s) => s.scheduled);
  const pool = scheduled.length ? scheduled : all;
  if (!pool.length) throw new HttpError(404, "방송 대기열에 사연이 없어요. 검토 대기에서 사연을 승인해 주세요.");

  const day = kstDay(pool[0].created_at);
  const sameDay = pool.filter((s) => kstDay(s.created_at) === day);
  const result = sameDay[Math.floor(Math.random() * sameDay.length)];

  let roulette = null;
  if (sameDay.length > 1) {
    const others = sameDay.filter((s) => s.id !== result.id).sort(() => Math.random() - 0.5).slice(0, 11);
    const candidates = [...others, result].sort(() => Math.random() - 0.5);
    roulette = {
      id: randomToken(8),
      started_at: new Date().toISOString(),
      duration_ms: 5200,
      day,
      result_index: candidates.findIndex((c) => c.id === result.id),
      candidates: candidates.map((c) => ({ id: c.id, name: broadcastName(c), summary: c.summary, stamp: c.stamp })),
    };
  }

  const db = adminDb();
  const now = new Date().toISOString();
  await db.from("picks").insert({ story_id: result.id });
  // 방송 중 표시 (이전에 방송 중이던 사연은 대기열로 되돌림, 한 번에 처리)
  await db.rpc("set_on_air", { p_story: result.id });
  if (body.show_on_obs !== false) {
    await db
      .from("broadcast_state")
      .update({ story_id: result.id, hidden: false, revealed: false, scroll: 0, roulette, updated_at: now })
      .eq("id", 1);
  }
  return json({ result: { ...result, broadcast_name: broadcastName(result) }, roulette, day, same_day_count: sameDay.length, queue_count: all.length, from_scheduled: scheduled.length > 0 });
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
    const { data: s } = await db.from("stories").select("status").eq("id", id).maybeSingle();
    if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
    if (s.status === "pending" || s.status === "rejected") throw new HttpError(400, "승인된 사연만 방송에 띄울 수 있어요.");
    await db.from("broadcast_state").update({ story_id: id, hidden: false, revealed: false, scroll: 0, roulette: null, updated_at: now }).eq("id", 1);
    if (s.status === "approved" || s.status === "on_air") {
      await db.rpc("set_on_air", { p_story: id });
    }
  } else if (op === "hide") {
    await db.from("broadcast_state").update({ hidden: true, roulette: null, updated_at: now }).eq("id", 1);
  } else if (op === "reveal" || op === "unreveal") {
    await db.from("broadcast_state").update({ revealed: op === "reveal", updated_at: now }).eq("id", 1);
  } else if (op === "scroll") {
    const delta = int(body.delta) ?? 0;
    const { data: b } = await db.from("broadcast_state").select("scroll").eq("id", 1).single();
    const next = body.reset === true ? 0 : Math.max(0, Math.min(50, (b?.scroll ?? 0) + delta));
    await db.from("broadcast_state").update({ scroll: next, updated_at: now }).eq("id", 1);
  } else {
    throw new HttpError(400, "알 수 없는 방송 동작이에요.");
  }
  return broadcastState();
}

async function broadcastState() {
  const { data } = await adminDb()
    .from("broadcast_state")
    .select("story_id, hidden, revealed, scroll, roulette, updated_at, stories(receipt_no, summary, display_name, visibility, status)")
    .eq("id", 1)
    .single();
  return json(data);
}

// ---------------------------------------------------------------------
// 방송 회차: 방송 시작 → 읽기 시작 → 오늘 방송 정리 → 결과 공개
// ---------------------------------------------------------------------

/**
 * 지금 방송 회차 (방송이 아직 이어지는 중인 회차)
 *  - 가장 최근에 시작한 방송이
 *  - 시작한 지 LIVE_START_HOURS 안이거나, 마지막 "읽기 시작"이 LIVE_IDLE_HOURS 안이면 "지금 방송"
 * 다시보기는 방송이 끝나고 올라오므로 결과 공개(published_at)는 한참 뒤일 수 있어요.
 * 그래서 공개 여부가 아니라 "최근에 움직임이 있었는지"로 판단해, 다음 방송이 지난 방송에 섞이지 않게 합니다.
 */
const LIVE_START_HOURS = 8;
const LIVE_IDLE_HOURS = 3;

type BroadcastRow = { id: string; started_at: string; vod_url: string | null; published_at: string | null };

async function currentBroadcastRow(): Promise<BroadcastRow | null> {
  const db = adminDb();
  const { data: latest } = await db
    .from("broadcasts")
    .select("id, started_at, vod_url, published_at, ended_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest || latest.published_at || latest.ended_at) return null;
  const now = Date.now();
  if (now - new Date(latest.started_at).getTime() < LIVE_START_HOURS * 3600_000) return latest;
  const { data: lastRead } = await db
    .from("stories")
    .select("read_started_at")
    .eq("broadcast_id", latest.id)
    .not("read_started_at", "is", null)
    .order("read_started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastRead && now - new Date(lastRead.read_started_at).getTime() < LIVE_IDLE_HOURS * 3600_000) return latest;
  return null;
}

/** 오늘 방송 정리에서 처음 보여줄 회차: 아직 공개 안 한 사연이 남은 가장 최근 방송 → 없으면 가장 최근 방송 */
async function wrapupDefault(recent: BroadcastRow[]): Promise<BroadcastRow | null> {
  if (!recent.length) return null;
  const { data } = await adminDb()
    .from("stories")
    .select("broadcast_id")
    .in("broadcast_id", recent.map((b) => b.id))
    .eq("status", "read")
    .is("result_published_at", null);
  const pending = new Set((data ?? []).map((r) => r.broadcast_id));
  return recent.find((b) => pending.has(b.id)) ?? recent[0];
}

async function vodParam(): Promise<string> {
  const { data } = await adminDb().from("settings").select("vod_time_param").eq("id", 1).single();
  return data?.vod_time_param ?? "currentTime";
}

function offsetSec(readAt: string, startedAt: string): number {
  return Math.max(0, Math.round((new Date(readAt).getTime() - new Date(startedAt).getTime()) / 1000));
}

async function broadcastCurrent() {
  const current = await currentBroadcastRow();
  let readCount = 0;
  if (current) {
    const { count } = await adminDb().from("stories").select("id", { count: "exact", head: true }).eq("broadcast_id", current.id);
    readCount = count ?? 0;
  }
  return json({ current, read_count: readCount, server_time: new Date().toISOString() });
}

function parseTime(v: unknown): string | null {
  const t = str(v, 40);
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "시각을 읽을 수 없어요.");
  if (d.getTime() > Date.now() + 5 * 60_000) throw new HttpError(400, "방송 시작 시각은 지금보다 늦을 수 없어요.");
  return d.toISOString();
}

/** 방송 시작: 지금 회차가 이미 있으면 그대로 쓰고, new_session 이면 새 회차를 만들어요. */
async function broadcastStart(body: Record<string, unknown>) {
  const db = adminDb();
  const current = await currentBroadcastRow();
  if (current && body.new_session !== true) return json({ broadcast: current, created: false });
  const startedAt = parseTime(body.started_at) ?? new Date().toISOString();
  const { data, error } = await db.from("broadcasts").insert({ started_at: startedAt }).select("id, started_at, vod_url, published_at").single();
  if (error || !data) throw new HttpError(500, "방송 시작을 기록하지 못했어요.");
  return json({ broadcast: data, created: true });
}

/** 방송 끝: 사이트의 "지금 방송 중" 표시를 내려요. (다시보기 정리·결과 공개는 그대로 나중에) */
async function broadcastEnd() {
  const current = await currentBroadcastRow();
  if (!current) return json({ ok: true, ended: false });
  await adminDb().from("broadcasts").update({ ended_at: new Date().toISOString() }).eq("id", current.id);
  return json({ ok: true, ended: true });
}

/** 방송 시작 시각 고치기 → 그 회차 사연들의 다시보기 시간도 다시 계산 */
async function broadcastUpdate(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const startedAt = parseTime(body.started_at);
  if (!startedAt) throw new HttpError(400, "방송 시작 시각을 넣어주세요.");
  const db = adminDb();
  const { data: bc } = await db.from("broadcasts").update({ started_at: startedAt }).eq("id", id).select("id, started_at, vod_url, published_at").maybeSingle();
  if (!bc) throw new HttpError(404, "방송 회차를 찾을 수 없어요.");
  const param = await vodParam();
  const { data: rows } = await db.from("stories").select("id, read_started_at").eq("broadcast_id", id).not("read_started_at", "is", null);
  for (const r of rows ?? []) {
    const off = offsetSec(r.read_started_at, startedAt);
    await db.from("stories").update({ vod_offset_sec: off, vod_url: vodLink(bc.vod_url, off, param) }).eq("id", r.id);
  }
  return json({ broadcast: bc, recalculated: rows?.length ?? 0 });
}

/** 읽기 시작: 시각을 기록하고 "읽음"으로. 방송 시작 시각과의 차이가 다시보기 시간이 돼요. */
async function readStart(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const db = adminDb();
  const { data: s } = await db.from("stories").select("id, receipt_no, status").eq("id", id).maybeSingle();
  if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
  if (s.status === "pending" || s.status === "rejected") throw new HttpError(400, "승인된 사연만 읽기 시작할 수 있어요.");
  let bc = await currentBroadcastRow();
  let autoStarted = false;
  const now = new Date().toISOString();
  if (!bc) {
    // 방송 시작을 깜빡했으면 지금을 방송 시작으로 기록해요. (오늘 방송 정리에서 고칠 수 있어요)
    const { data } = await db.from("broadcasts").insert({ started_at: now }).select("id, started_at, vod_url, published_at").single();
    bc = data;
    autoStarted = true;
  }
  const off = offsetSec(now, bc!.started_at);
  await db
    .from("stories")
    .update({
      status: "read",
      scheduled: false,
      aired_at: now,
      read_started_at: now,
      broadcast_id: bc!.id,
      vod_offset_sec: off,
      vod_url: vodLink(bc!.vod_url, off, await vodParam()),
    })
    .eq("id", id);
  return json({ ok: true, receipt_no: s.receipt_no, offset_sec: off, broadcast: bc, auto_started: autoStarted });
}

/** 오늘 방송 정리: 회차 하나와 그 회차에 읽은 사연들 (읽은 순서대로) */
async function wrapupGet(body: Record<string, unknown>) {
  const db = adminDb();
  const { data: recent } = await db.from("broadcasts").select("id, started_at, vod_url, published_at").order("started_at", { ascending: false }).limit(15);
  const wanted = str(body.broadcast_id, 60);
  const bc = (recent ?? []).find((b) => b.id === wanted) ?? (await wrapupDefault(recent ?? []));
  let items: unknown[] = [];
  if (bc) {
    const { data } = await db
      .from("stories")
      .select("id, receipt_no, display_name, visibility, summary, stamp, flags, status, user_id, aired_at, read_started_at, vod_offset_sec, vod_url, host_note, result_published_at, worry_animals(name, emoji)")
      .eq("broadcast_id", bc.id)
      .eq("status", "read")
      .order("read_started_at", { ascending: true, nullsFirst: false })
      .order("aired_at", { ascending: true });
    items = (data ?? []).map((s: any) => {
      const a = Array.isArray(s.worry_animals) ? s.worry_animals[0] : s.worry_animals;
      return {
        id: s.id,
        receipt_no: s.receipt_no,
        summary: s.summary,
        broadcast_name: broadcastName(s),
        stamp: s.stamp,
        flags: s.flags,
        logged_in: !!s.user_id,
        read_started_at: s.read_started_at,
        vod_offset_sec: s.vod_offset_sec,
        vod_url: s.vod_url,
        host_note: s.host_note,
        result_published_at: s.result_published_at,
        animal: a ? { name: a.name, emoji: a.emoji } : null,
      };
    });
  }
  return json({ broadcast: bc, recent: recent ?? [], items, vod_time_param: await vodParam() });
}

/** 다시보기 주소 한 번 붙여넣기 → 모든 사연에 시간이 붙은 링크. 사연별 시간·한마디도 저장 */
async function wrapupSave(body: Record<string, unknown>) {
  const id = str(body.broadcast_id, 60);
  const base = str(body.vod_url, 500);
  if (base && !validVodUrl(base)) throw new HttpError(400, "다시보기 주소는 https:// 로 시작하는 주소로 넣어주세요.");
  const db = adminDb();
  const { data: bc } = await db.from("broadcasts").update({ vod_url: base || null }).eq("id", id).select("id").maybeSingle();
  if (!bc) throw new HttpError(404, "방송 회차를 찾을 수 없어요.");
  const param = await vodParam();
  const items = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  for (const it of items.slice(0, 200)) {
    const off = it.offset_sec === null || it.offset_sec === undefined || it.offset_sec === "" ? null : int(it.offset_sec);
    if (off !== null && (off < 0 || off > 172800)) throw new HttpError(400, "다시보기 시간이 이상해요. (48시간 이내)");
    const note = str(it.host_note, 400);
    if ([...note].length > HOST_NOTE_MAX) throw new HttpError(400, `다웅의 한마디는 ${HOST_NOTE_MAX}자 이내로 써주세요.`);
    await db
      .from("stories")
      .update({ vod_offset_sec: off, vod_url: base ? vodLink(base, off, param) : null, host_note: note || null })
      .eq("id", str(it.id, 60))
      .eq("broadcast_id", id);
  }
  return wrapupGet({ broadcast_id: id });
}

/** 결과 공개: 회차의 읽은 사연(또는 고른 사연)을 한꺼번에 공개하고, 로그인 사용자 도감에 모아요. */
async function resultsPublish(body: Record<string, unknown>) {
  const db = adminDb();
  const bcId = str(body.broadcast_id, 60);
  const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).map((x) => str(x, 60)).filter(Boolean) : [];
  let q = db.from("stories").select("id").eq("status", "read").is("result_published_at", null);
  if (bcId) q = q.eq("broadcast_id", bcId);
  else if (ids.length) q = q.in("id", ids);
  else throw new HttpError(400, "공개할 방송 회차나 사연을 골라주세요.");
  const { data: rows } = await q;
  const targets = (rows ?? []).map((r) => r.id);
  const now = new Date().toISOString();
  if (targets.length) await db.from("stories").update({ result_published_at: now }).in("id", targets);
  if (bcId) await db.from("broadcasts").update({ published_at: now }).eq("id", bcId);
  const dex = await collectToDex(targets);
  return json({ published: targets.length, collected: dex.collected, golden: dex.golden });
}

async function setScheduled(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const on = body.scheduled === true;
  const db = adminDb();
  const { data: s } = await db.from("stories").select("status").eq("id", id).maybeSingle();
  if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
  if (on && s.status !== "approved" && s.status !== "on_air") throw new HttpError(400, "방송 대기 중인 사연만 방송 예정으로 표시할 수 있어요.");
  await db.from("stories").update({ scheduled: on }).eq("id", id);
  return json({ ok: true, scheduled: on });
}

/** "확인 필요" 사연에 한해 방장이 결과 카드로 짧은 개인 메시지를 보낼 수 있어요. */
async function privateMessage(body: Record<string, unknown>) {
  const id = str(body.id, 60);
  const text = str(body.text, 600);
  if ([...text].length > PRIVATE_MESSAGE_MAX) throw new HttpError(400, `개인 메시지는 ${PRIVATE_MESSAGE_MAX}자 이내로 써주세요.`);
  const db = adminDb();
  const { data: s } = await db.from("stories").select("flags").eq("id", id).maybeSingle();
  if (!s) throw new HttpError(404, "사연을 찾을 수 없어요.");
  if (!(s.flags ?? []).includes("care")) throw new HttpError(400, "개인 메시지는 '확인 필요' 사연에만 보낼 수 있어요.");
  await db.from("stories").update({ private_message: text || null }).eq("id", id);
  return json({ ok: true });
}

// ---------------------------------------------------------------------
// 상담 후기 / 그 후 이야기 / 황금 동물 / 알림
// ---------------------------------------------------------------------

async function reviewsList(body: Record<string, unknown>) {
  const status = str(body.status, 20) || "new";
  if (!["new", "approved", "hidden"].includes(status)) throw new HttpError(400, "알 수 없는 상태예요.");
  const db = adminDb();
  const { data } = await db
    .from("reviews")
    .select("story_id, reaction, comment, share, status, flags, created_at, updated_at, reviewed_at, stories(receipt_no, summary, display_name, visibility, worry_animals(name, emoji))")
    .eq("status", status)
    .order("updated_at", { ascending: false })
    .limit(200);
  const counts: Record<string, number> = {};
  for (const st of ["new", "approved", "hidden"]) {
    const { count } = await db.from("reviews").select("story_id", { count: "exact", head: true }).eq("status", st);
    counts[st] = count ?? 0;
  }
  const items = (data ?? []).map((r: any) => {
    const s = r.stories;
    const a = s ? (Array.isArray(s.worry_animals) ? s.worry_animals[0] : s.worry_animals) : null;
    return {
      story_id: r.story_id,
      reaction: r.reaction,
      comment: r.comment,
      share: r.share,
      status: r.status,
      flags: r.flags,
      created_at: r.created_at,
      updated_at: r.updated_at,
      reviewed_at: r.reviewed_at,
      receipt_no: s?.receipt_no,
      summary: s?.summary,
      broadcast_name: s ? broadcastName(s) : "",
      animal: a ? { name: a.name, emoji: a.emoji } : null,
    };
  });
  return json({ items, counts });
}

async function reviewSetStatus(body: Record<string, unknown>) {
  const id = str(body.story_id, 60);
  const status = str(body.status, 20);
  if (!["new", "approved", "hidden"].includes(status)) throw new HttpError(400, "알 수 없는 상태예요.");
  const { data } = await adminDb()
    .from("reviews")
    .update({ status, reviewed_at: status === "new" ? null : new Date().toISOString() })
    .eq("story_id", id)
    .select("story_id")
    .maybeSingle();
  if (!data) throw new HttpError(404, "후기를 찾을 수 없어요.");
  return json({ ok: true });
}

async function reviewAdminDelete(body: Record<string, unknown>) {
  await adminDb().from("reviews").delete().eq("story_id", str(body.story_id, 60));
  return json({ ok: true });
}

/** 그 후 이야기: 후속 보고나 후기가 들어온 사연만 모아서 (최근 소식 순) */
async function afterList() {
  const db = adminDb();
  const [{ data: fus }, { data: rvs }] = await Promise.all([
    db.from("follow_ups").select("id, story_id, body, flags, care_checked, created_at").order("created_at", { ascending: false }).limit(500),
    db.from("reviews").select("story_id, reaction, comment, share, status, flags, updated_at").order("updated_at", { ascending: false }).limit(500),
  ]);
  const last = new Map<string, string>();
  for (const f of fus ?? []) if (!last.has(f.story_id) || last.get(f.story_id)! < f.created_at) last.set(f.story_id, f.created_at);
  for (const r of rvs ?? []) if (!last.has(r.story_id) || last.get(r.story_id)! < r.updated_at) last.set(r.story_id, r.updated_at);
  const ids = [...last.keys()];
  if (!ids.length) return json({ items: [] });
  const { data: stories } = await db
    .from("stories")
    .select("id, receipt_no, display_name, visibility, summary, body, stamp, category, status, created_at, aired_at, flags, worry_animals(name, emoji)")
    .in("id", ids.slice(0, 200));
  const items = (stories ?? [])
    .map((s: any) => {
      const a = Array.isArray(s.worry_animals) ? s.worry_animals[0] : s.worry_animals;
      return {
        id: s.id,
        receipt_no: s.receipt_no,
        broadcast_name: broadcastName(s),
        summary: s.summary,
        body: s.body,
        stamp: s.stamp,
        category: s.category,
        status: s.status,
        flags: s.flags,
        created_at: s.created_at,
        aired_at: s.aired_at,
        animal: a ? { name: a.name, emoji: a.emoji } : null,
        follow_ups: (fus ?? []).filter((f) => f.story_id === s.id).reverse(),
        review: (rvs ?? []).find((r) => r.story_id === s.id) ?? null,
        last_at: last.get(s.id),
      };
    })
    .sort((a, b) => (a.last_at! < b.last_at! ? 1 : -1));
  return json({ items });
}

async function followupCheck(body: Record<string, unknown>) {
  await adminDb().from("follow_ups").update({ care_checked: true }).eq("id", str(body.id, 60));
  return json({ ok: true });
}

async function goldenList() {
  const { data } = await adminDb()
    .from("dex_entries")
    .select("story_id, golden_code, claim_name, claimed_at, paid_at, collected_at, stories(receipt_no, summary, display_name, worry_animals(name, emoji))")
    .eq("golden", true)
    .order("collected_at", { ascending: false })
    .limit(300);
  const items = (data ?? []).map((d: any) => {
    const s = d.stories;
    const a = s ? (Array.isArray(s.worry_animals) ? s.worry_animals[0] : s.worry_animals) : null;
    return {
      story_id: d.story_id,
      golden_code: d.golden_code,
      claim_name: d.claim_name,
      claimed_at: d.claimed_at,
      paid_at: d.paid_at,
      collected_at: d.collected_at,
      receipt_no: s?.receipt_no,
      summary: s?.summary,
      display_name: s?.display_name,
      animal: a ? { name: a.name, emoji: a.emoji } : null,
    };
  });
  return json({ items });
}

async function goldenMarkPaid(body: Record<string, unknown>) {
  const paid = body.paid !== false;
  const { data } = await adminDb()
    .from("dex_entries")
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq("story_id", str(body.story_id, 60))
    .eq("golden", true)
    .select("story_id")
    .maybeSingle();
  if (!data) throw new HttpError(404, "황금 동물을 찾을 수 없어요.");
  return json({ ok: true });
}

/** 메뉴 배지와 맨 위 알림: 검토 대기, 확인 필요 후속 보고, 새 후기, 받을 사람이 기다리는 황금 동물 */
async function alerts(role: Role) {
  const db = adminDb();
  const [{ count: pending }, { data: care }, { count: newReviews }, { count: golden }] = await Promise.all([
    db.from("stories").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db
      .from("follow_ups")
      .select("id, story_id, body, created_at, stories(receipt_no)")
      .contains("flags", ["care"])
      .eq("care_checked", false)
      .order("created_at", { ascending: false })
      .limit(20),
    db.from("reviews").select("story_id", { count: "exact", head: true }).eq("status", "new"),
    db.from("dex_entries").select("story_id", { count: "exact", head: true }).eq("golden", true).not("claimed_at", "is", null).is("paid_at", null),
  ]);
  return json({
    pending_count: pending ?? 0,
    care_followups: (care ?? []).map((f: any) => ({
      id: f.id,
      story_id: f.story_id,
      receipt_no: f.stories?.receipt_no,
      body: String(f.body).slice(0, 140),
      created_at: f.created_at,
    })),
    new_reviews: newReviews ?? 0,
    golden_waiting: role === "owner" ? golden ?? 0 : 0,
  });
}

// ---------------------------------------------------------------------
// 통계 / 설정
// ---------------------------------------------------------------------

async function stats() {
  const db = adminDb();
  const week = kstStart("week");
  const countStatus = (st: string) => db.from("stories").select("id", { count: "exact", head: true }).eq("status", st);
  const [{ data: weekRows }, { count: total }, pending, approved, onAir, read, rejected, { data: animals }, aiToday, aiMonth, aiFailToday, { data: reviews }, { count: published }] =
    await Promise.all([
      db.from("stories").select("category, age, age_group, stamp").gte("created_at", week),
      db.from("stories").select("id", { count: "exact", head: true }),
      countStatus("pending"),
      countStatus("approved"),
      countStatus("on_air"),
      countStatus("read"),
      countStatus("rejected"),
      db.from("worry_animals").select("name, emoji").order("created_at", { ascending: false }).limit(500),
      db.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", kstStart("day")),
      db.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", kstStart("month")),
      db.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", kstStart("day")).eq("ok", false),
      db.from("reviews").select("reaction").limit(5000),
      db.from("stories").select("id", { count: "exact", head: true }).eq("status", "read").not("result_published_at", "is", null),
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
  // 학년대별 (예전 사연은 나이로 짐작)
  const ageBand = (r: { age: number | null; age_group: string | null }) => ageGroupLabel(r.age_group ?? ageGroupFromAge(r.age)) || "모름";
  const animalCounts = count(animals ?? [], (a: any) => `${a.emoji} ${a.name}`);
  const topAnimals = Object.entries(animalCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const reviewed = (approved.count ?? 0) + (onAir.count ?? 0) + (read.count ?? 0) + (rejected.count ?? 0);
  const reviewRows = reviews ?? [];
  const reactionCounts = count(reviewRows, (r: any) => r.reaction);
  const reactions = REACTIONS.map((r) => ({
    id: r.id,
    label: r.label,
    count: reactionCounts[r.id] ?? 0,
    percent: reviewRows.length ? Math.round(((reactionCounts[r.id] ?? 0) / reviewRows.length) * 100) : 0,
  }));

  return json({
    week_count: rows.length,
    week_by_category: count(rows, (r: any) => r.category),
    week_by_age: count(rows, (r: any) => ageBand(r)),
    week_by_stamp: count(rows, (r: any) => r.stamp),
    total: total ?? 0,
    by_status: {
      pending: pending.count ?? 0,
      approved: (approved.count ?? 0) + (onAir.count ?? 0),
      read: read.count ?? 0,
      rejected: rejected.count ?? 0,
    },
    approval_rate: reviewed ? Math.round((((approved.count ?? 0) + (onAir.count ?? 0) + (read.count ?? 0)) / reviewed) * 100) : 0,
    // 방송 채택률: 들어온 사연 중 방송에서 읽은 비율
    adoption_rate: total ? Math.round(((read.count ?? 0) / total) * 100) : 0,
    review_count: reviewRows.length,
    // 후기 작성률: 결과가 공개된 사연 중 후기가 들어온 비율
    review_rate: published ? Math.round((reviewRows.length / published) * 100) : 0,
    published_count: published ?? 0,
    reactions,
    top_animals: topAnimals,
    ai: { today: aiToday.count ?? 0, month: aiMonth.count ?? 0, failed_today: aiFailToday.count ?? 0, enabled: aiEnabled(), model: Deno.env.get("AI_MODEL") || "claude-opus-5-5" },
  });
}

/**
 * 영상별 유입: 사이트주소/v/12 로 들어온 방문(기기·하루 기준)과 그 영상을 보고 낸 사연 수
 * days 안의 기록만 (기본 30일)
 */
async function refStats(body: Record<string, unknown>) {
  const days = Math.min(180, Math.max(1, int(body.days) ?? 30));
  const since = new Date(Date.now() - days * 86_400_000);
  const sinceDay = new Date(since.getTime() + KST).toISOString().slice(0, 10);
  const db = adminDb();
  const [{ data: visits }, { data: stories }] = await Promise.all([
    db.from("visits").select("ref, device_hash").gte("day", sinceDay).limit(100000),
    db.from("stories").select("ref, status").not("ref", "is", null).gte("created_at", since.toISOString()).limit(100000),
  ]);
  const m = new Map<string, { ref: string; visits: number; devices: Set<string>; stories: number; aired: number }>();
  const row = (ref: string) => {
    if (!m.has(ref)) m.set(ref, { ref, visits: 0, devices: new Set(), stories: 0, aired: 0 });
    return m.get(ref)!;
  };
  for (const v of visits ?? []) {
    const r = row(v.ref);
    r.visits++;
    r.devices.add(v.device_hash);
  }
  for (const s of stories ?? []) {
    const r = row(s.ref);
    r.stories++;
    if (s.status === "read") r.aired++;
  }
  const items = [...m.values()]
    .map((r) => ({
      ref: r.ref,
      visits: r.visits,
      people: r.devices.size,
      stories: r.stories,
      aired: r.aired,
      rate: r.devices.size ? Math.round((r.stories / r.devices.size) * 100) : 0,
    }))
    .sort((a, b) => b.people - a.people || b.stories - a.stories);
  return json({ days, items });
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
    auto_notice_enabled: data.auto_notice_enabled,
    auto_notice_days: data.auto_notice_days,
    vod_time_param: data.vod_time_param,
    chzzk_url: data.chzzk_url ?? "",
    youtube_url: data.youtube_url ?? "",
    schedule_text: data.schedule_text ?? "",
  };
  if (role !== "owner") return json(base);
  return json({
    ...base,
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
    if (!["lounge", "classic", "cork", "gacha"].includes(s.preset)) throw new HttpError(400, "알 수 없는 디자인이에요.");
    patch.preset = s.preset;
  }
  if (typeof s.accepting === "boolean") patch.accepting = s.accepting;
  let noticeChanged = false;
  if (typeof s.auto_notice_enabled === "boolean") {
    patch.auto_notice_enabled = s.auto_notice_enabled;
    noticeChanged = true;
  }
  if (s.auto_notice_days !== undefined) {
    const d = int(s.auto_notice_days);
    if (d === null || d < 1 || d > 90) throw new HttpError(400, "자동 공개 기간은 1~90일 사이로 정해주세요.");
    patch.auto_notice_days = d;
    noticeChanged = true;
  }
  const channel = (v: unknown, hosts: string[], label: string) => {
    const t = str(v, 300);
    if (!t) return null;
    let u: URL;
    try {
      u = new URL(t);
    } catch {
      throw new HttpError(400, `${label} 주소를 https:// 로 시작하는 전체 주소로 넣어주세요.`);
    }
    const host = u.hostname.replace(/^(www|m)\./, "");
    if (u.protocol !== "https:" || !hosts.includes(host)) throw new HttpError(400, `${label} 주소가 맞는지 확인해 주세요. (${hosts.join(", ")})`);
    return u.toString();
  };
  if (s.chzzk_url !== undefined) patch.chzzk_url = channel(s.chzzk_url, ["chzzk.naver.com"], "치지직");
  if (s.youtube_url !== undefined) patch.youtube_url = channel(s.youtube_url, ["youtube.com", "youtu.be"], "유튜브");
  if (typeof s.schedule_text === "string") patch.schedule_text = str(s.schedule_text, 40);
  if (typeof s.vod_time_param === "string") {
    if (!["currentTime", "t"].includes(s.vod_time_param)) throw new HttpError(400, "알 수 없는 다시보기 시간 형식이에요.");
    patch.vod_time_param = s.vod_time_param;
  }
  const db = adminDb();
  await db.from("settings").update(patch).eq("id", 1);
  if (noticeChanged) {
    // 기간을 바꾸거나 끄면 아직 방송 전인 사연의 안내를 새 기준으로 다시 정해요.
    await db.from("stories").update({ waiting_notice_at: null }).in("status", ["pending", "approved", "on_air"]).not("waiting_notice_at", "is", null);
    await db.rpc("run_waiting_notices");
  }
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

const STATUS_LABEL: Record<string, string> = {
  pending: "검토 대기",
  approved: "방송 대기",
  on_air: "방송 중",
  read: "방송에서 읽음",
  rejected: "반려",
};

async function exportCsv() {
  const { data } = await adminDb()
    .from("stories")
    .select("receipt_no, created_at, display_name, name_mode, visibility, age, gender, category, summary, body, temperature, wish, stamp, voice, status, starred, flags, aired_at, vod_url, host_note, consent_shorts, ref, age_group, age_public, worry_animals(name, emoji), reviews(reaction, comment)")
    .order("created_at", { ascending: true });
  const label = (list: { id: string; label: string }[], id: string) => list.find((o) => o.id === id)?.label ?? id;
  const head = ["접수번호", "날짜", "이름", "이름방식", "공개방식", "학년대", "나이", "나이 방송공개", "성별", "종류", "한줄요약", "본문", "온도", "듣고싶은말", "우표", "목소리", "상태", "별표", "표시", "고민동물", "방송일", "다시보기", "다웅의 한마디", "후기 반응", "한 줄 후기", "쇼츠 사용 동의", "유입 영상"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [head.map(esc).join(",")];
  for (const s of (data ?? []) as any[]) {
    const a = Array.isArray(s.worry_animals) ? s.worry_animals[0] : s.worry_animals;
    const rv = Array.isArray(s.reviews) ? s.reviews[0] : s.reviews;
    lines.push(
      [
        s.receipt_no,
        s.created_at,
        s.display_name,
        s.name_mode === "chzzk" ? "치지직 닉네임" : "익명",
        label(GOMIN.visibilities, s.visibility),
        ageGroupLabel(s.age_group ?? ageGroupFromAge(s.age)),
        s.age ?? "",
        s.age_public ? "공개" : "",
        label(GOMIN.genders, s.gender),
        label(GOMIN.categories, s.category),
        s.summary,
        s.body,
        s.temperature,
        label(GOMIN.wishes, s.wish),
        label(GOMIN.stamps, s.stamp),
        label(GOMIN.voices, s.voice),
        STATUS_LABEL[s.status] ?? s.status,
        s.starred ? "★" : "",
        (s.flags ?? []).join(" "),
        a ? `${a.emoji} ${a.name}` : "",
        s.aired_at ?? "",
        s.vod_url ?? "",
        s.host_note ?? "",
        rv ? reactionLabel(rv.reaction) : "",
        rv?.comment ?? "",
        s.consent_shorts ? "동의" : "",
        s.ref ?? "",
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
      return getStory(body);
    case "set_status":
      return setStatus(body);
    case "toggle_star":
      return toggleStar(body);
    case "toggle_flag":
      return toggleFlag(body);
    case "delete":
      return deleteStory(body);
    case "animal_regenerate":
      return regenerateAnimal(body);
    case "animal_update":
      return updateAnimal(body);
    case "queue":
      return queue();
    case "pick_next":
      return pickNext(body);
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
    case "alerts":
      return alerts(session.role);
    case "ref_stats":
      return refStats(body);
    case "broadcast_current":
      return broadcastCurrent();
    case "broadcast_start":
      return broadcastStart(body);
    case "broadcast_update":
      return broadcastUpdate(body);
    case "broadcast_end":
      return broadcastEnd();
    case "read_start":
      return readStart(body);
    case "wrapup_get":
      return wrapupGet(body);
    case "wrapup_save":
      return wrapupSave(body);
    case "results_publish":
      return resultsPublish(body);
    case "set_scheduled":
      return setScheduled(body);
    case "private_message":
      return privateMessage(body);
    case "reviews_list":
      return reviewsList(body);
    case "review_set_status":
      return reviewSetStatus(body);
    case "review_delete":
      return reviewAdminDelete(body);
    case "after_list":
      return afterList();
    case "followup_check":
      return followupCheck(body);
    case "golden_list":
      return goldenList();
    case "golden_mark_paid":
      return goldenMarkPaid(body);
    default:
      throw new HttpError(400, "알 수 없는 요청이에요.");
  }
});
