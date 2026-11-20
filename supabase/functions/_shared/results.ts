// =====================================================================
// 방송 결과 / 상담 후기 / 고민 동물 도감 (화면과 서버가 같이 씀)
// =====================================================================

export const REACTIONS = [
  { id: "helped", label: "도움 됐어요", emoji: "💡" },
  { id: "comforted", label: "위로 됐어요", emoji: "🫶" },
  { id: "funny", label: "웃겼어요", emoji: "🤣" },
  { id: "still", label: "그래도 고민돼요", emoji: "🤔" },
] as const;

export type ReactionId = (typeof REACTIONS)[number]["id"];

export const REVIEW_MAX = 60;
export const HOST_NOTE_MAX = 120;
export const PRIVATE_MESSAGE_MAX = 300;
export const CLAIM_NAME_MAX = 30;

/** 황금 동물이 나올 확률 (1%) */
export const GOLDEN_RATE = 0.01;

export function reactionLabel(id: string | null | undefined): string {
  return REACTIONS.find((r) => r.id === id)?.label ?? "";
}

export function reactionEmoji(id: string | null | undefined): string {
  return REACTIONS.find((r) => r.id === id)?.emoji ?? "";
}

/** 초 → "1시간 12분 3초" (0초는 생략) */
export function formatOffset(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return "";
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}시간`);
  if (m || (h && r)) parts.push(`${m}분`);
  if (r && !h) parts.push(`${r}초`);
  return parts.length ? parts.join(" ") : "0분";
}

/** 초 → "1:12:03" (입력칸용) */
export function offsetToClock(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return "";
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** "1:12:03", "72:03", "1시간 12분", "4320" → 초. 못 읽으면 null */
export function clockToOffset(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const colon = t.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    const [a, b, c] = [Number(colon[1]), Number(colon[2]), colon[3] !== undefined ? Number(colon[3]) : null];
    return c === null ? a * 60 + b : a * 3600 + b * 60 + c;
  }
  const ko = t.match(/^(?:(\d+)\s*시간)?\s*(?:(\d+)\s*분)?\s*(?:(\d+)\s*초)?$/);
  if (ko && (ko[1] || ko[2] || ko[3])) return Number(ko[1] ?? 0) * 3600 + Number(ko[2] ?? 0) * 60 + Number(ko[3] ?? 0);
  return null;
}

/** 다시보기 주소가 http(s) 주소인지 */
export function validVodUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * 다시보기 주소에 시작 시간을 붙입니다.
 *  - 유튜브: t=초
 *  - 그 밖(치지직 등): 설정한 매개변수 (기본 currentTime=초)
 * 이미 시간 매개변수가 있으면 바꿔 끼웁니다.
 */
export function vodLink(base: string | null | undefined, sec: number | null | undefined, param: string = "currentTime"): string | null {
  if (!base || !validVodUrl(base)) return null;
  const u = new URL(base);
  if (sec === null || sec === undefined) return u.toString();
  const host = u.hostname.replace(/^www\./, "");
  const key = host === "youtu.be" || host.endsWith("youtube.com") ? "t" : param;
  u.searchParams.delete("t");
  u.searchParams.delete("currentTime");
  u.searchParams.set(key, String(Math.max(0, Math.round(sec))));
  return u.toString();
}

/** 황금 동물 뽑기 (서버에서만) */
export function rollGolden(rate = GOLDEN_RATE): boolean {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] / 2 ** 32 < rate;
}
