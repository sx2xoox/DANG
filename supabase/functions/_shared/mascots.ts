/**
 * 고민 동물 캐릭터 그림 (web/public/mascots/<id>.webp)
 *
 * 마릿수는 정해져 있지 않아요. AI 는 동물을 자유롭게 짓고,
 * 이름 끝의 동물 이름이 아래 names 중 하나와 맞으면 그 그림이 나와요.
 * 맞는 그림이 없으면 예전처럼 이모지가 나와요 (아직 그려지지 않은 친구).
 * 새 그림을 추가할 때는 파일을 올리고 여기에 한 줄 추가하면 돼요.
 */
export type Mascot = {
  id: string;
  /** 도안·관리 화면에 보이는 이름 */
  ko: string;
  /** 고민 동물 이름 끝에 이 말이 오면 이 그림을 써요 (같은 말이 여러 그림에 있으면 이름으로 하나를 골라요) */
  names: string[];
};

export const MASCOTS: Mascot[] = [
  { id: "fox", ko: "여우", names: ["여우", "사막여우"] },
  { id: "raccoon", ko: "너구리", names: ["너구리", "라쿤"] },
  { id: "hamster", ko: "햄스터", names: ["햄스터", "햄찌"] },
  { id: "hedgehog", ko: "고슴도치", names: ["고슴도치"] },
  { id: "chick", ko: "병아리", names: ["병아리", "아기새", "참새", "새"] },
  { id: "rabbit", ko: "토끼", names: ["토끼", "산토끼", "아기토끼"] },
  { id: "penguin", ko: "펭귄", names: ["펭귄", "아기펭귄"] },
  { id: "squirrel", ko: "다람쥐", names: ["다람쥐", "청설모"] },
  { id: "squirrel-2", ko: "다람쥐 (꼬리 큰)", names: ["다람쥐", "청설모"] },
  { id: "sheep", ko: "양", names: ["양", "어린양", "아기양"] },
  { id: "pig", ko: "돼지", names: ["돼지", "아기돼지", "꿀꿀이"] },
  { id: "bear", ko: "곰", names: ["곰", "곰돌이", "아기곰", "반달곰", "불곰", "북극곰"] },
  { id: "koala", ko: "코알라", names: ["코알라"] },
  { id: "panda", ko: "판다", names: ["판다", "아기판다"] },
  { id: "cat", ko: "고양이", names: ["고양이", "냥이", "길냥이", "아기고양이", "치즈냥"] },
  { id: "tiger", ko: "호랑이", names: ["호랑이", "아기호랑이", "범"] },
  { id: "cow", ko: "소", names: ["소", "젖소", "송아지", "황소"] },
  { id: "cheetah", ko: "치타", names: ["치타", "표범"] },
  { id: "skunk", ko: "스컹크", names: ["스컹크"] },
  { id: "beaver", ko: "비버", names: ["비버"] },
  { id: "capybara", ko: "카피바라", names: ["카피바라"] },
  { id: "chinchilla", ko: "친칠라", names: ["친칠라"] },
  { id: "seal", ko: "물범", names: ["물범", "하프물범", "바다표범", "물개"] },
  { id: "whale", ko: "고래", names: ["고래", "아기고래", "혹등고래"] },
  { id: "axolotl", ko: "우파루파", names: ["우파루파", "아홀로틀"] },
];

/** 그림이 있는 동물 이름 (AI 에게 "가능하면 이 중에서"라고 알려줄 때) */
export const MASCOT_ANIMALS: string[] = [...new Set(MASCOTS.map((m) => m.names[0]))];

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h;
}

/** "곱씹는 라쿤" → 너구리 그림. 맞는 그림이 없으면 null */
export function mascotFor(animalName: string | null | undefined): Mascot | null {
  const words = (animalName ?? "").trim().split(/\s+/);
  const last = (words[words.length - 1] ?? "").replace(/[^가-힣a-zA-Z]/g, "");
  if (!last) return null;
  // 긴 이름부터 맞춰 봐요 ("청개구리"가 "개"에 걸리지 않게)
  let best = 0;
  let hits: Mascot[] = [];
  for (const m of MASCOTS) {
    for (const n of m.names) {
      if (!last.endsWith(n) || n.length < best) continue;
      if (n.length > best) {
        best = n.length;
        hits = [];
      }
      if (!hits.includes(m)) hits.push(m);
    }
  }
  // 한 글자 이름(새·곰·양·소·범)은 이름 전체가 그 글자일 때만 (예: "태양"이 양으로 가지 않게)
  if (best === 1 && last.length > 1) return null;
  if (!hits.length) return null;
  return hits[hash(animalName ?? "") % hits.length];
}

/** 감정 우표 → 캐릭터 표정 */
export type MascotMood = "basic" | "cheer" | "sad" | "love" | "worry" | "surprise" | "angry" | "dazed" | "sleepy";

export const MASCOT_MOODS: { id: MascotMood; label: string }[] = [
  { id: "basic", label: "기본" },
  { id: "cheer", label: "응원" },
  { id: "sad", label: "공감 (슬픔)" },
  { id: "love", label: "설렘" },
  { id: "worry", label: "걱정" },
  { id: "surprise", label: "놀람 (멘붕)" },
  { id: "angry", label: "화남 (억울)" },
  { id: "dazed", label: "현타" },
  { id: "sleepy", label: "졸림" },
];

export function moodFromStamp(stamp: string | null | undefined): MascotMood {
  switch (stamp) {
    case "unfair":
    case "angry":
      return "angry";
    case "flutter":
      return "love";
    case "worry":
      return "worry";
    case "panic":
      return "surprise";
    case "hyeonta":
      return "dazed";
    case "sad":
      return "sad";
    default:
      return "basic";
  }
}
