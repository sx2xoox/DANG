// =====================================================================
// 시청자용 서버 함수
//   submit         사연 제출 (로그인/비로그인)
//   lookup         접수번호 + 비밀 코드로 내 사연(고민 동물, 방송 결과, 진행 상황) 조회
//   my_story       로그인 사용자의 내 사연 하나 (lookup 과 같은 내용)
//   delete_by_code 접수번호 + 비밀 코드로 사연 삭제
//   claim          비로그인으로 낸 사연을 로그인 계정으로 옮기기
//   follow_up_add / follow_up_delete   후속 보고 (로그인 또는 접수번호+비밀 코드)
//   review_save / review_delete        상담 후기 (방송에서 읽힌 사연만, 사연 하나에 하나)
//   golden_claim   황금 동물 구독권 받을 치지직 닉네임 남기기 (로그인)
//   shorts_consent 릴스·쇼츠 사용 동의 바꾸기 (로그인 또는 접수번호+비밀 코드)
//   delete_account 탈퇴 (원하면 사연도 삭제)
// =====================================================================
import { BOXES, fillTemplate, maybeUnder14, pickBadge } from "../_shared/boxes.ts";
import { clientIp, HttpError, int, json, readJson, serve, str } from "../_shared/http.ts";
import { adminDb, requestUser } from "../_shared/db.ts";
import { hashCode, randomCode, randomToken, sha256 } from "../_shared/crypto.ts";
import { detectFlags, detectReviewFlags } from "../_shared/safety.ts";
import { CLAIM_NAME_MAX, REACTIONS, REVIEW_MAX } from "../_shared/results.ts";
import { collectToDex } from "../_shared/dex.ts";
import { generateAnimalFor, previousAnimals, transformation } from "../_shared/animalJob.ts";
import { fallbackAnimal } from "../_shared/fallbackAnimals.ts";

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

const ANIMAL_FIELDS = "name, emoji, why, description, quote, hashtags, prev_name, prev_emoji, change_reason";

const WAITING = ["pending", "approved", "on_air"];

/**
 * 사연자에게 보여줄 내 사연 묶음: 고민 동물, 후속 보고, 방송 결과(공개된 뒤에만), 후기, 도감(황금 동물)
 */
async function storyBundle(s: any) {
  const db = adminDb();
  const [{ data: animal }, { data: followUps }, { data: review }, { data: dex }] = await Promise.all([
    db.from("worry_animals").select(ANIMAL_FIELDS).eq("story_id", s.id).maybeSingle(),
    db.from("follow_ups").select("id, body, created_at").eq("story_id", s.id).order("created_at"),
    db.from("reviews").select("reaction, comment, share, status, updated_at").eq("story_id", s.id).maybeSingle(),
    s.user_id
      ? db.from("dex_entries").select("golden, golden_code, claim_name, claimed_at, paid_at, collected_at").eq("story_id", s.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const aired = s.viewer_status === "aired";
  return {
    animal,
    follow_ups: followUps ?? [],
    result: aired
      ? {
          aired_at: s.read_started_at ?? s.aired_at ?? s.result_published_at,
          vod_url: s.vod_url ?? null,
          vod_offset_sec: s.vod_offset_sec ?? null,
          host_note: s.host_note ?? null,
        }
      : null,
    private_message: s.private_message ?? null,
    waiting_notice: !!s.waiting_notice_at && WAITING.includes(s.status),
    review: aired ? review ?? null : null,
    dex: dex ?? null,
  };
}

/** 로그인 사용자의 내 사연(story_id) 또는 접수번호+비밀 코드로 사연을 찾습니다. */
async function storyForRequest(req: Request, body: Record<string, unknown>) {
  if (body.story_id && !body.code) {
    const user = await requestUser(req);
    if (!user) throw new HttpError(401, "먼저 로그인해 주세요.", "no_login");
    const { data } = await adminDb().from("stories").select("*").eq("id", str(body.story_id, 60)).eq("user_id", user.id).maybeSingle();
    if (!data) throw new HttpError(404, "이 사연을 찾을 수 없어요.", "not_found");
    return data;
  }
  return verifyByCode(req, body);
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
    consent_shorts: !!s.consent_shorts,
    age_group: s.age_group,
    age_public: !!s.age_public,
    under14: maybeUnder14(s.age_group, s.age),
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
  // 학년대는 꼭, 정확한 나이는 원하는 사람만 (방송에서 말해도 되는지도 따로)
  const ageGroup = str(body.age_group, 20);
  const ageRaw = body.age === null || body.age === undefined || body.age === "" ? null : int(body.age);
  const age = ageRaw;
  const agePublic = age !== null && body.age_public === true;
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

  const bad: (m: string) => never = (m: string) => {
    throw new HttpError(400, m, "invalid");
  };
  if (!["chzzk", "anon"].includes(nameMode)) bad("이름 방식을 골라주세요.");
  if (!displayName) bad("이름을 정해주세요.");
  if (!box.ageGroups.some((g) => g.id === ageGroup)) bad("연령대를 선택해주세요.");
  if (age !== null && (age < 8 || age > 99)) bad("나이는 숫자로 알려주세요. (적지 않아도 돼요)");
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
  const consentShorts = consents?.shorts === true;
  // 어느 릴스·쇼츠를 보고 들어왔는지 (사이트주소/v/12)
  const refRaw = str(body.ref, 40).toLowerCase();
  const ref = /^[a-z0-9_-]{1,30}$/.test(refRaw) ? refRaw : null;

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

  // 만 14세 미만일 수 있는 사연은 로그인 계정과 연결하지 않아요 (보호자 동의 없이 개인정보를 모으지 않도록).
  const under14 = maybeUnder14(ageGroup, age);
  const user = under14 ? null : await requestUser(req);
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
      age_group: ageGroup,
      age_public: agePublic,
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
      // 위험 표시(자해·욕설·저격·연락처·학교/실명)가 없으면 바로 방송 대기로, 있으면 검토 대기로
      status: flags.length ? "pending" : "approved",
      visibility,
      badge,
      flags,
      consent_shorts: consentShorts,
      ref,
      animal_state: "pending",
    })
    .select("*")
    .single();
  if (error || !story) {
    console.error(error);
    throw new HttpError(500, "사연을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  await db.from("submit_log").insert({ device_hash: deviceHash, ip_hash: ipHash });

  if (user) {
    await db.from("profiles").upsert({ user_id: user.id, default_name: displayName, name_mode: nameMode, updated_at: new Date().toISOString() });
  }

  // 사연을 읽고 고민 동물을 바로 지어서 결과 화면에 보여줍니다.
  // AI 가 늦거나 실패해도 기본 동물로 항상 결과가 나와요. (제출은 이미 저장됨)
  const prev = user ? await previousAnimals(user.id, story.id) : [];
  let animal: Record<string, unknown>;
  try {
    animal = (await generateAnimalFor(story, prev, 40_000)).animal;
  } catch (e) {
    console.error("animal generation failed", e);
    const fb = fallbackAnimal({ category, temperature, wish, stamp, care });
    animal = { story_id: story.id, ...fb, source: "fallback", ...transformation(prev[0], fb.name, "") };
    await db.from("worry_animals").upsert(animal, { onConflict: "story_id" });
    await db.from("stories").update({ animal_state: "failed" }).eq("id", story.id);
  }

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
    under14,
    animal: {
      name: animal.name,
      emoji: animal.emoji,
      why: animal.why,
      description: animal.description,
      quote: animal.quote,
      hashtags: animal.hashtags,
      prev_name: animal.prev_name ?? null,
      prev_emoji: animal.prev_emoji ?? null,
      change_reason: animal.change_reason ?? null,
    },
  });
}

async function lookup(req: Request, body: Record<string, unknown>) {
  const story = await verifyByCode(req, body);
  return json({ story: viewerStory(story), ...(await storyBundle(story)) });
}

async function myStory(req: Request, body: Record<string, unknown>) {
  if (!body.story_id) throw new HttpError(400, "사연을 골라주세요.");
  const story = await storyForRequest(req, { story_id: body.story_id });
  return json({ story: viewerStory(story), ...(await storyBundle(story)) });
}

// ---------------------------------------------------------------------
// 후속 보고 (로그인 / 비로그인 모두)
// ---------------------------------------------------------------------
async function followUpAdd(req: Request, body: Record<string, unknown>) {
  const story = await storyForRequest(req, body);
  const text = str(body.body, 3000);
  if (!text) throw new HttpError(400, "그 후 이야기를 써주세요.");
  const db = adminDb();
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db.from("follow_ups").select("id", { count: "exact", head: true }).eq("story_id", story.id).gte("created_at", since);
  if ((count ?? 0) >= 5) throw new HttpError(429, "짧은 시간에 너무 많이 남겼어요. 잠시 뒤에 다시 써주세요.", "rate_limited");
  const flags = detectFlags(text);
  const { data, error } = await db
    .from("follow_ups")
    .insert({ story_id: story.id, body: text, flags })
    .select("id, body, created_at")
    .single();
  if (error || !data) throw new HttpError(500, "그 후 이야기를 저장하지 못했어요.");
  return json({ follow_up: data, care: flags.includes("care") });
}

async function followUpDelete(req: Request, body: Record<string, unknown>) {
  const story = await storyForRequest(req, body);
  await adminDb().from("follow_ups").delete().eq("id", str(body.id, 60)).eq("story_id", story.id);
  return json({ ok: true });
}

// ---------------------------------------------------------------------
// 상담 후기 (방송에서 읽힌 사연만, 사연 하나에 하나, 고치거나 지울 수 있음)
// ---------------------------------------------------------------------
async function reviewSave(req: Request, body: Record<string, unknown>) {
  const story = await storyForRequest(req, body);
  if (story.viewer_status !== "aired") throw new HttpError(400, "후기는 사연이 방송에서 읽힌 뒤에 남길 수 있어요.", "not_aired");
  const reaction = str(body.reaction, 20);
  if (!REACTIONS.some((r) => r.id === reaction)) throw new HttpError(400, "반응을 하나 골라주세요.");
  const comment = str(body.comment, 200).replace(/\s+/g, " ");
  if ([...comment].length > REVIEW_MAX) throw new HttpError(400, `한 줄 후기는 ${REVIEW_MAX}자 이내로 써주세요.`);
  const share = body.share === true;
  const flags = detectReviewFlags(comment);
  const now = new Date().toISOString();
  // 고치면 다시 "새 후기"가 되어 방장이 다시 확인해요 (후기 벽에서도 잠시 내려가요)
  const { data, error } = await adminDb()
    .from("reviews")
    .upsert({ story_id: story.id, reaction, comment, share, flags, status: "new", reviewed_at: null, updated_at: now }, { onConflict: "story_id" })
    .select("reaction, comment, share, status, updated_at")
    .single();
  if (error || !data) throw new HttpError(500, "후기를 저장하지 못했어요.");
  return json({ review: data, flagged: flags.length > 0 });
}

async function reviewDelete(req: Request, body: Record<string, unknown>) {
  const story = await storyForRequest(req, body);
  await adminDb().from("reviews").delete().eq("story_id", story.id);
  return json({ ok: true });
}

// ---------------------------------------------------------------------
// 황금 동물: 구독권 받을 치지직 닉네임 남기기 (로그인 사용자 본인 도감만)
// ---------------------------------------------------------------------
async function goldenClaim(req: Request, body: Record<string, unknown>) {
  const user = await requestUser(req);
  if (!user) throw new HttpError(401, "먼저 로그인해 주세요.", "no_login");
  const storyId = str(body.story_id, 60);
  const name = str(body.claim_name, 60);
  if (!name || [...name].length > CLAIM_NAME_MAX) throw new HttpError(400, `치지직 닉네임을 ${CLAIM_NAME_MAX}자 이내로 넣어주세요.`);
  const db = adminDb();
  const { data: entry } = await db.from("dex_entries").select("golden, paid_at").eq("story_id", storyId).eq("user_id", user.id).maybeSingle();
  if (!entry?.golden) throw new HttpError(404, "황금 동물을 찾을 수 없어요.");
  if (entry.paid_at) throw new HttpError(400, "이미 구독권을 받았어요.");
  const { data } = await db
    .from("dex_entries")
    .update({ claim_name: name, claimed_at: new Date().toISOString() })
    .eq("story_id", storyId)
    .eq("user_id", user.id)
    .select("golden, golden_code, claim_name, claimed_at, paid_at, collected_at")
    .single();
  return json({ dex: data });
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
  if (!story.user_id && maybeUnder14(story.age_group, story.age)) {
    throw new HttpError(403, "만 14세 미만일 수 있는 사연은 로그인 계정에 옮기지 않아요. 접수번호와 비밀 코드로 볼 수 있어요.", "under14");
  }
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
    // 이미 방송 결과가 공개된 사연이면 이 계정의 도감에 바로 모아요
    await collectToDex([story.id]);
  }
  return json({ ok: true, story_id: story.id, receipt_no: story.receipt_no });
}

async function shortsConsent(req: Request, body: Record<string, unknown>) {
  const story = await storyForRequest(req, body);
  const on = body.on === true;
  await adminDb().from("stories").update({ consent_shorts: on }).eq("id", story.id);
  return json({ ok: true, consent_shorts: on });
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
    case "my_story":
      return myStory(req, body);
    case "follow_up_add":
      return followUpAdd(req, body);
    case "follow_up_delete":
      return followUpDelete(req, body);
    case "review_save":
      return reviewSave(req, body);
    case "review_delete":
      return reviewDelete(req, body);
    case "golden_claim":
      return goldenClaim(req, body);
    case "shorts_consent":
      return shortsConsent(req, body);
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

