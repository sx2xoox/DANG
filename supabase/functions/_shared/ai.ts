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

function client(timeoutMs = 90_000): Anthropic {
  return new Anthropic({ baseURL: Deno.env.get("ANTHROPIC_BASE_URL") || undefined, timeout: timeoutMs, maxRetries: 0 });
}

type CreateParams = Record<string, unknown>;

/**
 * 거절(refusal) 시 서버 쪽 대체 모델로 이어서 처리하도록 fallbacks 를 켜고 호출합니다.
 * 혹시 이 옵션 조합을 API 가 받지 않으면(400) 옵션 없이 한 번 더 시도합니다.
 */
async function callClaude(kind: string, params: CreateParams, timeoutMs?: number): Promise<{ text: string; stop: string | null }> {
  const c = client(timeoutMs);
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
- 자해, 자살, 학대, 폭력, 큰 상실처럼 무거운 사연은 웃기게 짓지 않기. 이럴 때는 다정하고 따뜻한 동물과 문장만 쓰고, 코멘트 끝에 도움받을 곳을 안내하기: "${HELP_SENTENCE}"
- 의학, 법률, 돈 문제에서 단정적인 판단이나 처방을 하지 않기. "전문가와 상담해보는 것도 좋아요" 정도로만.
- 특정인을 나쁜 사람이라고 판정하거나 복수, 공격을 부추기지 않기.
- 욕설, 성적인 표현, 혐오 표현 쓰지 않기.
- 실존하는 유명 캐릭터나 연예인 이름 쓰지 않기. 동물은 실제 동물로만.
- 같은 동물만 반복되지 않게 다양하게. 최근 결과에 많이 나온 동물은 피하기.
- 형식을 지키기.`;

const ANIMAL_SYSTEM = `당신은 치지직 스트리머 "다웅"의 고민 상담 코너에서, 시청자가 보낸 사연을 읽고 그 사람만의 "고민 동물"을 지어주는 작가예요.
결과는 사연을 보낸 직후 MBTI 검사 결과처럼 바로 보여져요. 읽는 순간 "어 이거 완전 나잖아" 싶게, 짧고 재치 있게 써주세요.
정해진 유형표는 없어요. 사연 내용과 고민 종류, 고민 온도, 듣고 싶은 말, 감정 우표를 읽고 지금 이 사람의 마음에 꼭 맞는 동물을 자유롭게 지어주세요.
다정하고 재치 있게, 하지만 가볍게 넘기지 않게 써주세요. 한국어 존댓말(~요체)로 씁니다.
결과 글에는 스트리머 이름("다웅")을 넣지 마세요. 사연자에게 직접 말하듯 써요.

결과 형식
- name: "[수식어] [동물]" 형태. 띄어쓰기 포함 12자 이내. 예) 답장 기다리는 미어캣, 새벽 3시 부엉이, 갈팡질팡 문어
- emoji: 그 동물 이모지 딱 하나 (그 동물 이모지가 없으면 가장 가까운 동물 이모지 하나)
- why: 왜 이 동물인지 한 줄. 예) "읽씹 화면만 고개 빼고 지켜보는 중이라서"
- description: 코멘트 2~3문장. 지금 이 사람의 마음 상태를 콕 짚고, 이 유형의 장점과 지금 힘이 될 한마디를 담아요. 설교하지 말고 다정하게.
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
  if (desc.length < 30 || desc.length > 450) p.push("코멘트 길이가 맞지 않음");
  if (sentences.length < 2 || sentences.length > 5) p.push("코멘트가 2~3문장이 아님");
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
    `- 무거운 사연 여부(자해·자살·학대·폭력 등 표현 감지): ${req.care ? "예 - 반드시 다정하고 따뜻하게, 코멘트 끝에 도움받을 곳 안내" : "아니오"}`,
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

/**
 * AI 로 고민 동물을 짓고, 형식/규칙 검사에 두 번 실패하거나 제한 시간을 넘기면 기본 동물을 돌려줍니다.
 * 사연 제출 화면에서 바로 결과를 보여주므로 전체 제한 시간(deadlineMs)을 둡니다.
 */
export async function createAnimal(req: AnimalRequest, deadlineMs = 40_000): Promise<{ result: AnimalResult; error?: string }> {
  const started = Date.now();
  const fb = (): AnimalResult => ({
    ...fallbackAnimal({ ...req, care: req.care }),
    change_reason: "",
    source: "fallback",
  });
  if (!aiEnabled()) return { result: fb(), error: "AI 키가 설정되지 않음" };

  let problems: string[] = [];
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = deadlineMs - (Date.now() - started);
    if (left < 5_000) {
      lastError = lastError || "시간 초과";
      break;
    }
    try {
      const { text, stop } = await callClaude("animal", {
        max_tokens: 8000,
        system: ANIMAL_SYSTEM,
        output_config: { effort: "low", format: { type: "json_schema", schema: ANIMAL_SCHEMA } },
        messages: [{ role: "user", content: animalPrompt(req, problems) }],
      }, left);
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
