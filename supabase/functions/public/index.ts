// =====================================================================
// 시청자용 서버 함수
//   submit         사연 제출 (로그인/비로그인)
//   lookup         접수번호 + 비밀 코드로 답장 확인
//   delete_by_code 접수번호 + 비밀 코드로 사연 삭제
//   claim          비로그인으로 낸 사연을 로그인 계정으로 옮기기
//   delete_account 탈퇴 (원하면 사연도 삭제)
// =====================================================================
import { BOXES, fillTemplate, pickBadge } from "../_shared/boxes.ts";
import { clientIp, HttpError, int, json, readJson, serve, str } from "../_shared/http.ts";
import { adminDb, requestUser } from "../_shared/db.ts";
import { hashCode, randomCode, randomToken, sha256 } from "../_shared/crypto.ts";
import { detectFlags } from "../_shared/safety.ts";
import { generateAnimalFor, previousAnimals, transformation } from "../_shared/animalJob.ts";
import { fallbackAnimal } from "../_shared/fallbackAnimals.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

function background(p: Promise<unknown>) {
  const guarded = p.catch((e) => console.error("background task failed", e));
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(guarded);
}

const SUBMIT_LIMITS = [
  { minutes: 10, device: 3, ip: 6 },
  { minutes: 60 * 24, device: 10, ip: 30 },
];

const LOOKUP_MAX_FAILS = 5;
const LOOKUP_LOCK_MINUTES = 10;

async function checkSubmitRate(deviceHash: string, ipHash: string) {
  const db = adminDb();
  for (const lim of SUBMIT_LIMITS) {
    const since = new Date(Date.now() - lim.minutes * 60_000).toISOString();
    const [{ count: d }, { count: i }] = await Promise.all([
      db.from("submit_log").select("id", { count: "exact", head: true }).eq("device_hash", deviceHash).gte("created_at", since),
      db.from("submit_log").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since),
    ]);
    if ((d ?? 0) >= lim.device || (i ?? 0) >= lim.ip) {
      throw new HttpError(
        429,
        lim.minutes <= 10
          ? "짧은 시간에 사연을 너무 많이 보냈어요. 10분 뒤에 다시 보내주세요."
          : "오늘은 사연을 충분히 보냈어요. 내일 또 들려주세요!",
        "rate_limited",
      );
    }
  }
}

async function lookupLocked(keyHash: string): Promise<boolean> {
  const since = new Date(Date.now() - LOOKUP_LOCK_MINUTES * 60_000).toISOString();
  const { data } = await adminDb()
    .from("auth_attempts")
    .select("success")
    .eq("kind", "lookup")
    .eq("key_hash", keyHash)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(LOOKUP_MAX_FAILS);
  return (data ?? []).length >= LOOKUP_MAX_FAILS && data!.every((r) => !r.success);
}

/** 접수번호 + 비밀 코드 확인. 여러 번 틀리면 잠시 막습니다. */
async function verifyByCode(req: Request, body: Record<string, unknown>) {
  const receipt = int(body.receipt_no);
  const code = str(body.code, 40);
  const boxId = str(body.box_id, 20) || "gomin";
  if (!receipt || !code) throw new HttpError(400, "접수번호와 비밀 코드를 모두 넣어주세요.");
  const keyHash = await sha256(`lookup:${clientIp(req)}`);
  if (await lookupLocked(keyHash)) {
    throw new HttpError(429, `여러 번 틀려서 잠시 막혔어요. ${LOOKUP_LOCK_MINUTES}분 뒤에 다시 시도해 주세요.`, "locked");
  }
  const db = adminDb();
  const { data: story } = await db
    .from("stories")
    .select("*")
    .eq("box_id", boxId)
    .eq("receipt_no", receipt)
    .maybeSingle();
  const ok = !!story && (await hashCode(code, story.code_salt)) === story.code_hash;
  await db.from("auth_attempts").insert({ kind: "lookup", key_hash: keyHash, success: ok });
  if (!ok) throw new HttpError(404, "접수번호나 비밀 코드가 맞지 않아요. 다시 확인해 주세요.", "not_found");
  return story;
}

function nameForViewer(s: any): string {
  return s.display_name;
}

async function replyBundle(storyId: string) {
  const db = adminDb();
  const [{ data: reply }, { data: animal }, { data: followUps }] = await Promise.all([
    db.from("replies").select("body, kind, aired_on, vod_url, verdict_yes, verdict_no, sent_at, opened_at").eq("story_id", storyId).maybeSingle(),
    db.from("worry_animals").select("name, emoji, why, description, quote, hashtags, prev_name, prev_emoji, change_reason").eq("story_id", storyId).maybeSingle(),
    db.from("follow_ups").select("id, body, created_at").eq("story_id", storyId).order("created_at"),
  ]);
  const sent = !!reply?.sent_at;
  return { reply: sent ? reply : null, animal: sent ? animal : null, follow_ups: followUps ?? [] };
}

function viewerStory(s: any) {
  return {
    id: s.id,
    receipt_no: s.receipt_no,
    display_name: nameForViewer(s),
    name_mode: s.name_mode,
    age: s.age,
    gender: s.gender,
    category: s.category,
    summary: s.summary,
    body: s.body,
    temperature: s.temperature,
    wish: s.wish,
    stamp: s.stamp,
    voice: s.voice,
    visibility: s.visibility,
    badge: s.badge,
    viewer_status: s.viewer_status,
    aired_at: s.aired_at,
    created_at: s.created_at,
    claimed: !!s.user_id,
  };
}

// ---------------------------------------------------------------------

async function submit(req: Request, body: Record<string, unknown>) {
  const db = adminDb();
  const { data: settings } = await db.from("settings").select("accepting").eq("id", 1).single();
  if (!settings?.accepting) throw new HttpError(403, "지금은 사연을 받지 않아요. 다음에 또 와주세요!", "closed");

  const boxId = str(body.box_id, 20) || "gomin";
  const box = BOXES[boxId];
  if (!box) throw new HttpError(400, "없는 사연함이에요.");

  const deviceId = str(req.headers.get("x-device-id") ?? body.device_id, 100) || "none";
  const deviceHash = await sha256(`device:${deviceId}`);
  const ipHash = await sha256(`ip:${clientIp(req)}`);
  await checkSubmitRate(deviceHash, ipHash);

  // ---- 입력값 검사 ----
  const nameMode = str(body.name_mode, 10);
  const displayName = str(body.display_name, 30);
  const age = int(body.age);
  const gender = str(body.gender, 10);
  const category = str(body.category, 30);
  const writeMode = str(body.write_mode, 10);
  const summary = str(body.summary, 60);
  const temperature = int(body.temperature);
  const wish = str(body.wish, 20);
  const stamp = str(body.stamp, 20);
  const voice = str(body.voice, 20);
  const visibility = str(body.visibility, 20);
  const consents = body.consents as Record<string, unknown> | undefined;

  const bad = (m: string) => {
    throw new HttpError(400, m, "invalid");
  };
  if (!["chzzk", "anon"].includes(nameMode)) bad("이름 방식을 골라주세요.");
  if (!displayName) bad("이름을 정해주세요.");
  if (age === null || age < 5 || age > 99) bad("나이를 숫자로 알려주세요.");
  if (!box.genders.some((g) => g.id === gender)) bad("성별을 골라주세요.");
  if (!box.categories.some((c) => c.id === category)) bad("고민 종류를 골라주세요.");
  if (!["template", "free"].includes(writeMode)) bad("쓰는 방식을 골라주세요.");
  if (!summary || [...summary].length > 30) bad("한 줄 요약은 30자 이내로 써주세요.");
  if (temperature === null || temperature < 0 || temperature > 100) bad("고민 온도를 정해주세요.");
  if (!box.wishes.some((w) => w.id === wish)) bad("듣고 싶은 말을 골라주세요.");
  if (!box.stamps.some((s) => s.id === stamp)) bad("감정 우표를 골라주세요.");
  if (!box.voices.some((v) => v.id === voice)) bad("읽어줄 목소리를 골라주세요.");
  if (!box.visibilities.some((v) => v.id === visibility)) bad("공개 방식을 골라주세요.");
  if (!consents?.broadcast || !consents?.privacy) bad("필수 동의에 체크해 주세요.");

  let storyBody = "";
  let templateId: string | null = null;
  let templateAnswers: string[] | null = null;
  const extra = str(body.body, 5000);
  if (writeMode === "template") {
    templateId = str(body.template_id, 40);
    const t = (box.templates[category] ?? []).find((x) => x.id === templateId);
    if (!t) bad("고민 틀을 골라주세요.");
    templateAnswers = Array.isArray(body.template_answers)
      ? (body.template_answers as unknown[]).map((v) => str(v, 200))
      : [];
    if (templateAnswers.every((a) => !a)) bad("빈칸을 하나 이상 채워주세요.");
    storyBody = fillTemplate(t!, templateAnswers) + (extra ? `\n\n${extra}` : "");
  } else {
    storyBody = extra;
  }
  if (storyBody.length < 10) bad("고민을 조금만 더 자세히 써주세요. (10자 이상)");

  const user = await requestUser(req);
  const flags = detectFlags(`${summary}\n${storyBody}`);
  const care = flags.includes("care");

  const code = randomCode();
  const salt = randomToken(12);
  const badge = pickBadge(stamp, wish);

  const { data: story, error } = await db
    .from("stories")
    .insert({
      box_id: boxId,
      user_id: user?.id ?? null,
      code_salt: salt,
      code_hash: await hashCode(code, salt),
      name_mode: nameMode,
      display_name: displayName,
      age,
      gender,
      category,
      write_mode: writeMode,
      template_id: templateId,
      template_answers: templateAnswers,
      body: storyBody,
      summary,
      temperature,
      wish,
      stamp,
      voice,
      visibility,
      badge,
      flags,
      animal_state: "pending",
    })
    .select("*")
    .single();
  if (error || !story) {
    console.error(error);
    throw new HttpError(500, "사연을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  await db.from("submit_log").insert({ device_hash: deviceHash, ip_hash: ipHash });

  // 기본 동물을 먼저 저장해 두고 (AI 가 실패해도 사연은 안전), AI 결과로 바꿔치기합니다.
  const prev = user ? await previousAnimals(user.id, story.id) : [];
  const fb = fallbackAnimal({ category, temperature, wish, stamp, care });
  await db.from("worry_animals").insert({
    story_id: story.id,
    ...fb,
    source: "fallback",
    ...transformation(prev[0], fb.name, ""),
  });

  if (user) {
    await db.from("profiles").upsert({ user_id: user.id, default_name: displayName, name_mode: nameMode, updated_at: new Date().toISOString() });
  }

  background(generateAnimalFor(story, prev));

  return json({
    story_id: story.id,
    receipt_no: story.receipt_no,
    code,
    display_name: story.display_name,
    stamp: story.stamp,
    summary: story.summary,
    badge: story.badge,
    visibility: story.visibility,
    created_at: story.created_at,
    care,
    logged_in: !!user,
  });
}

async function lookup(req: Request, body: Record<string, unknown>) {
  const story = await verifyByCode(req, body);
  const bundle = await replyBundle(story.id);
  if (bundle.reply && !bundle.reply.opened_at) {
    await adminDb().from("replies").update({ opened_at: new Date().toISOString() }).eq("story_id", story.id);
  }
  return json({ story: viewerStory(story), ...bundle });
}

async function deleteByCode(req: Request, body: Record<string, unknown>) {
  const story = await verifyByCode(req, body);
  await adminDb().from("stories").delete().eq("id", story.id);
  return json({ ok: true });
}

async function claim(req: Request, body: Record<string, unknown>) {
  const user = await requestUser(req);
  if (!user) throw new HttpError(401, "먼저 로그인해 주세요.");
  const story = await verifyByCode(req, body);
  if (story.user_id && story.user_id !== user.id) {
    throw new HttpError(409, "이 사연은 이미 다른 계정의 사연함에 들어 있어요.");
  }
  const db = adminDb();
  if (!story.user_id) {
    await db.from("stories").update({ user_id: user.id }).eq("id", story.id);
    // 이전 동물과 비교해서 변신 기록 채우기
    const prev = await previousAnimals(user.id, story.id);
    const older = prev.length ? prev : [];
    const { data: animal } = await db.from("worry_animals").select("name, prev_name").eq("story_id", story.id).maybeSingle();
    if (animal && !animal.prev_name && older[0]) {
      await db.from("worry_animals").update(transformation(older[0], animal.name, "")).eq("story_id", story.id);
    }
  }
  return json({ ok: true, story_id: story.id, receipt_no: story.receipt_no });
}

async function deleteAccount(req: Request, body: Record<string, unknown>) {
  const user = await requestUser(req);
  if (!user) throw new HttpError(401, "먼저 로그인해 주세요.");
  const db = adminDb();
  if (body.delete_stories === true) {
    await db.from("stories").delete().eq("user_id", user.id);
  }
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw new HttpError(500, "탈퇴 처리 중 문제가 생겼어요.");
  return json({ ok: true });
}

serve(async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "POST 로만 호출할 수 있어요.");
  const body = await readJson<Record<string, unknown>>(req);
  switch (body.action) {
    case "submit":
      return submit(req, body);
    case "lookup":
      return lookup(req, body);
    case "delete_by_code":
      return deleteByCode(req, body);
    case "claim":
      return claim(req, body);
    case "delete_account":
      return deleteAccount(req, body);
    default:
      throw new HttpError(400, "알 수 없는 요청이에요.");
  }
});

