// =====================================================================
// Claude API 호출 (서버 전용)
//  * API 키는 환경 변수 ANTHROPIC_API_KEY 에만 둡니다.
//  * 모델은 환경 변수 AI_MODEL 로 바꿀 수 있습니다. (기본 claude-opus-5-5)
// =====================================================================
import Anthropic from "npm:@anthropic-ai/sdk@1.5.0";
import { GOMIN, HELP_SENTENCE, optionLabel, temperatureLabel } from "./boxes.ts";
import { type AnimalCard, fallbackAnimal } from "./fallbackAnimals.ts";
import { outputProblems, redact } from "./safety.ts";
import { logAi } from "./db.ts";

const MODEL = () => Deno.env.get("AI_MODEL") || "claude-opus-5-5";

export function aiEnabled(): boolean {
  return !!Deno.env.get("ANTHROPIC_API_KEY");
}

function client(): Anthropic {
  return new Anthropic({ baseURL: Deno.env.get("ANTHROPIC_BASE_URL") || undefined, timeout: 90_000, maxRetries: 1 });
}

type CreateParams = Record<string, unknown>;

/**
 * 거절(refusal) 시 서버 쪽 대체 모델로 이어서 처리하도록 fallbacks 를 켜고 호출합니다.
 * 혹시 이 옵션 조합을 API 가 받지 않으면(400) 옵션 없이 한 번 더 시도합니다.
 */
async function callClaude(kind: string, params: CreateParams): Promise<{ text: string; stop: string | null }> {
  const c = client();
  const model = MODEL();
  const base = { model, ...params };
  let res: any;
  try {
    try {
      res = await (c.beta.messages.create as any)({
        ...base,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
    } catch (e) {
      if (e instanceof Anthropic.BadRequestError) {
        res = await (c.messages.create as any)(base);
      } else {
        throw e;
      }
    }
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : String(e);
    await logAi({ kind, ok: false, model, error: msg.slice(0, 500) });
    throw e;
  }
  const text = (res.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");
  await logAi({
    kind,
    ok: res.stop_reason !== "refusal",
    model: res.model ?? model,
    input_tokens: res.usage?.input_tokens,
    output_tokens: res.usage?.output_tokens,
    error: res.stop_reason === "refusal" ? "refusal" : undefined,
  });
  return { text, stop: res.stop_reason ?? null };
}

// ---------------------------------------------------------------------
// 고민 동물
// ---------------------------------------------------------------------

export const ANIMAL_RULES = `반드시 지켜야 할 규칙
- 사람을 놀리거나 깎아내리지 않기. 외모, 성별, 나이, 지역, 장애, 성적 지향, 가족 형편을 비하하거나 웃음거리로 삼지 않기.
- 사연에 나온 실명, 닉네임, 학교·회사 이름, 지역, 연락처를 결과에 절대 넣지 않기. ([이름], [학교] 처럼 가려진 표시도 결과에 쓰지 않기.)
- 자해, 자살, 학대, 폭력, 큰 상실처럼 무거운 사연은 웃기게 짓지 않기. 이럴 때는 다정하고 따뜻한 동물과 문장만 쓰고, 유형 설명 끝에 도움받을 곳을 안내하기: "${HELP_SENTENCE}"
- 의학, 법률, 돈 문제에서 단정적인 판단이나 처방을 하지 않기. "전문가와 상담해보는 것도 좋아요" 정도로만.
- 특정인을 나쁜 사람이라고 판정하거나 복수, 공격을 부추기지 않기.
- 욕설, 성적인 표현, 혐오 표현 쓰지 않기.
- 실존하는 유명 캐릭터나 연예인 이름 쓰지 않기. 동물은 실제 동물로만.
- 같은 동물만 반복되지 않게 다양하게. 최근 결과에 많이 나온 동물은 피하기.
- 형식을 지키기.`;

const ANIMAL_SYSTEM = `당신은 치지직 스트리머 "다웅"의 고민 상담 코너에서, 시청자가 보낸 사연을 읽고 그 사람만의 "고민 동물"을 지어주는 작가예요.
정해진 유형표는 없어요. 사연 내용과 고민 종류, 고민 온도, 듣고 싶은 말, 감정 우표를 읽고 지금 이 사람의 마음에 꼭 맞는 동물을 자유롭게 지어주세요.
다정하고 재치 있게, 하지만 가볍게 넘기지 않게 써주세요. 한국어 존댓말(~요체)로 씁니다.

결과 형식
- name: "[수식어] [동물]" 형태. 띄어쓰기 포함 12자 이내. 예) 답장 기다리는 미어캣, 새벽 3시 부엉이, 갈팡질팡 문어
- emoji: 그 동물 이모지 딱 하나 (그 동물 이모지가 없으면 가장 가까운 동물 이모지 하나)
- why: 왜 이 동물인지 한 줄. 예) "읽씹 화면만 고개 빼고 지켜보는 중이라서"
- description: 유형 설명 3~4문장. 지금 이 사람이 어떤 마음 상태인지, 이 유형의 장점, 이런 말이 힘이 된다는 내용.
- quote: 그 동물이 할 법한 짧은 한마디. 예) "1 사라졌는데요…?"
- hashtags: 해시태그 정확히 3개. 각각 #으로 시작하고 띄어쓰기 없이. 예) #관계고민 #활활 #판결파
- change_reason: 이전 고민 동물이 주어졌고 이번 동물이 달라졌다면, 왜 바뀌었는지 한 줄. 이전 동물이 없거나 같다면 빈 문자열.

${ANIMAL_RULES}`;

const ANIMAL_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    emoji: { type: "string" },
    why: { type: "string" },
    description: { type: "string" },
    quote: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    change_reason: { type: "string" },
  },
  required: ["name", "emoji", "why", "description", "quote", "hashtags", "change_reason"],
  additionalProperties: false,
};

export type AnimalRequest = {
  category: string;
  temperature: number;
  wish: string;
  stamp: string;
  summary: string;
  body: string;
  care: boolean;
  /** 결과에 들어가면 안 되는 문자열 (작성자 이름 등) */
  forbidden: string[];
  /** 로그인 사용자의 이전 고민 동물 (최근 순) */
  previous: { name: string; emoji: string; summary: string }[];
  /** 최근 다른 사연들에 나온 동물 이름 */
  recentNames: string[];
};

export type AnimalResult = AnimalCard & { change_reason: string; source: "ai" | "fallback" };

const EMOJI_RE = /^\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*$/u;

function speciesOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

export function validateAnimal(a: any, req: AnimalRequest): string[] {
  const p: string[] = [];
  if (!a || typeof a !== "object") return ["JSON 형식이 아님"];
  const name = String(a.name ?? "").trim();
  if (!name || name.length > 12) p.push("이름이 12자를 넘거나 비어 있음");
  if (!/\s/.test(name)) p.push("이름이 \"[수식어] [동물]\" 형태가 아님");
  if (!/^[가-힣0-9\s]+$/.test(name)) p.push("이름에 한글/숫자 외 문자가 있음");
  if (!EMOJI_RE.test(String(a.emoji ?? "").trim())) p.push("이모지가 하나가 아님");
  if (!String(a.why ?? "").trim() || String(a.why).length > 80) p.push("why 가 비었거나 너무 김");
  const desc = String(a.description ?? "").trim();
  const sentences = desc.split(/(?<=[.!?…~])\s+/).filter((s) => s.trim().length > 1);
  if (desc.length < 40 || desc.length > 600) p.push("유형 설명 길이가 맞지 않음");
  if (sentences.length < 3 || sentences.length > 6) p.push("유형 설명이 3~4문장이 아님");
  if (!String(a.quote ?? "").trim() || String(a.quote).length > 60) p.push("한마디가 비었거나 너무 김");
  const tags = Array.isArray(a.hashtags) ? a.hashtags.map((t: unknown) => String(t).trim()) : [];
  if (tags.length !== 3 || tags.some((t: string) => !/^#[^\s#]{1,15}$/.test(t))) p.push("해시태그가 3개 형식이 아님");
  const all = [name, a.why, desc, a.quote, tags.join(" "), a.change_reason ?? ""].join("\n");
  p.push(...outputProblems(all, req.forbidden));
  // 최근에 너무 많이 나온 동물은 피하기
  const sp = speciesOf(name);
  const recentSame = req.recentNames.filter((n) => speciesOf(n) === sp).length;
  if (sp && recentSame >= 3) p.push(`최근에 "${sp}"가 너무 많이 나옴`);
  return p;
}

function normalizeAnimal(a: any, req: AnimalRequest): AnimalResult {
  let description = String(a.description).trim();
  if (req.care && !description.includes("1388")) description = `${description} ${HELP_SENTENCE}`;
  return {
    name: String(a.name).trim(),
    emoji: String(a.emoji).trim(),
    why: String(a.why).trim(),
    description,
    quote: String(a.quote).trim(),
    hashtags: a.hashtags.map((t: string) => t.trim()),
    change_reason: String(a.change_reason ?? "").trim(),
    source: "ai",
  };
}

function animalPrompt(req: AnimalRequest, problems: string[]): string {
  const cat = GOMIN.categories.find((c) => c.id === req.category);
  const lines = [
    "## 사연 정보",
    `- 고민 종류: ${cat?.label ?? req.category}${cat?.desc ? ` (${cat.desc})` : ""}`,
    `- 고민 온도: ${req.temperature}/100 (${temperatureLabel(req.temperature)})`,
    `- 듣고 싶은 말: ${optionLabel(GOMIN.wishes, req.wish)}`,
    `- 감정 우표: ${optionLabel(GOMIN.stamps, req.stamp)}`,
    `- 무거운 사연 여부(자해·자살·학대·폭력 등 표현 감지): ${req.care ? "예 - 반드시 다정하고 따뜻하게, 설명 끝에 도움받을 곳 안내" : "아니오"}`,
    "",
    "## 한 줄 요약",
    redact(req.summary, req.forbidden),
    "",
    "## 사연 본문 (이름·연락처처럼 보이는 부분은 가려져 있어요)",
    redact(req.body, req.forbidden).slice(0, 4000),
  ];
  if (req.previous.length) {
    lines.push("", "## 이 사람이 예전에 받은 고민 동물 (최근 순)");
    for (const p of req.previous) lines.push(`- ${p.emoji} ${p.name} (그때 고민: ${redact(p.summary, req.forbidden)})`);
    lines.push("이전 동물을 참고해서 이번 사연에 맞는 새 동물을 지어주세요. 동물이 바뀌면 change_reason 에 이유를 한 줄로 써주세요.");
  }
  if (req.recentNames.length) {
    lines.push("", "## 최근 다른 사연들에 나온 동물 (가능하면 피하기)", req.recentNames.slice(0, 30).join(", "));
  }
  if (problems.length) {
    lines.push("", "## 지난번 결과의 문제점 (이번엔 꼭 고쳐주세요)", ...problems.map((x) => `- ${x}`));
  }
  return lines.join("\n");
}

/** AI 로 고민 동물을 짓고, 형식/규칙 검사에 두 번 실패하면 기본 동물을 돌려줍니다. */
export async function createAnimal(req: AnimalRequest): Promise<{ result: AnimalResult; error?: string }> {
  const fb = (): AnimalResult => ({
    ...fallbackAnimal({ ...req, care: req.care }),
    change_reason: "",
    source: "fallback",
  });
  if (!aiEnabled()) return { result: fb(), error: "AI 키가 설정되지 않음" };

  let problems: string[] = [];
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { text, stop } = await callClaude("animal", {
        max_tokens: 8000,
        system: ANIMAL_SYSTEM,
        output_config: { effort: "medium", format: { type: "json_schema", schema: ANIMAL_SCHEMA } },
        messages: [{ role: "user", content: animalPrompt(req, problems) }],
      });
      if (stop === "refusal") {
        lastError = "AI 가 응답을 거절함";
        problems = ["응답이 거절됨 - 규칙 안에서 다정하게 다시 지어주세요"];
        continue;
      }
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        problems = ["JSON 형식이 아님"];
        lastError = "JSON 형식 오류";
        continue;
      }
      problems = validateAnimal(parsed, req);
      if (problems.length === 0) return { result: normalizeAnimal(parsed, req) };
      lastError = problems.join(", ");
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      break; // 네트워크/서버 오류는 바로 기본 동물로
    }
  }
  return { result: fb(), error: lastError || "형식 검사 실패" };
}

// ---------------------------------------------------------------------
// 답장 초안
// ---------------------------------------------------------------------

export type DraftRequest = {
  category: string;
  temperature: number;
  wish: string;
  stamp: string;
  voice: string;
  summary: string;
  body: string;
  care: boolean;
  forbidden: string[];
  followUps: string[];
  animal?: { name: string; emoji: string } | null;
};

const DRAFT_SYSTEM = `당신은 치지직 스트리머 "다웅"이 시청자 고민 사연에 보낼 답장의 "초안"을 쓰는 작가예요.
다웅이 직접 읽고 고친 뒤 보내므로, 다웅의 목소리로 1인칭으로 씁니다. 한국어로 씁니다.

쓰는 법
- 사연자가 고른 "듣고 싶은 말"과 "읽어줄 목소리" 말투를 따라주세요.
  · 따뜻하게 위로해줘: 공감과 위로가 먼저, 조언은 부드럽게.
  · 팩트로 말해줘: 돌려 말하지 않되 상처 주지 않게, 구체적인 행동 제안 위주.
  · 웃기게 풀어줘: 가볍게 웃음을 주되 고민 자체는 존중하기.
  · 채팅 여론으로 판결해줘: 방송에서 채팅 판결을 받았다고 가정하지 말고, 다웅의 생각을 정리하고 "채팅 판결 결과는 답장 카드에 같이 적어둘게요" 정도로 마무리.
- 길이는 5~9문장. 인사로 시작하고 응원으로 끝내기.
- 사연 속 이름이나 개인정보는 쓰지 않기.
- 후속 보고가 있으면 그 내용도 반영하기.

${ANIMAL_RULES}`;

export async function createReplyDraft(req: DraftRequest): Promise<string> {
  if (!aiEnabled()) throw new Error("AI 키가 설정되지 않았어요. 설정 안내를 확인해 주세요.");
  const voice = GOMIN.voices.find((v) => v.id === req.voice);
  const prompt = [
    `- 고민 종류: ${optionLabel(GOMIN.categories, req.category)}`,
    `- 고민 온도: ${req.temperature}/100 (${temperatureLabel(req.temperature)})`,
    `- 듣고 싶은 말: ${optionLabel(GOMIN.wishes, req.wish)}`,
    `- 감정 우표: ${optionLabel(GOMIN.stamps, req.stamp)}`,
    `- 읽어줄 목소리(말투): ${voice?.label ?? ""} - ${voice?.desc ?? ""}`,
    req.animal ? `- 이 사연자의 고민 동물: ${req.animal.emoji} ${req.animal.name}` : "",
    req.care ? "- 주의: 무거운 사연(자해·자살·학대·폭력 등)입니다. 농담 없이 다정하게, 끝에 도움받을 곳을 꼭 안내하세요." : "",
    "",
    "## 한 줄 요약",
    redact(req.summary, req.forbidden),
    "",
    "## 사연 본문",
    redact(req.body, req.forbidden).slice(0, 5000),
    ...(req.followUps.length ? ["", "## 후속 보고", ...req.followUps.map((f) => `- ${redact(f, req.forbidden)}`)] : []),
    "",
    "답장 초안 본문만 써주세요. 제목이나 설명은 붙이지 마세요.",
  ]
    .filter((l) => l !== "")
    .join("\n");

  const { text, stop } = await callClaude("reply_draft", {
    max_tokens: 8000,
    system: DRAFT_SYSTEM,
    output_config: { effort: "medium" },
    messages: [{ role: "user", content: prompt }],
  });
  if (stop === "refusal" || !text.trim()) throw new Error("AI 가 초안을 만들지 못했어요. 직접 써주세요.");
  let draft = text.trim();
  if (req.care && !draft.includes("1388")) draft = `${draft}\n\n${HELP_SENTENCE}`;
  return draft;
}
