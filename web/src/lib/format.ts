import { GOMIN, optionLabel } from "@shared/boxes.ts";

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" };
  if (withTime) Object.assign(opts, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleString("ko-KR", opts);
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function ageGender(age: number | null | undefined, gender: string | null | undefined): string {
  const g = gender && gender !== "none" ? optionLabel(GOMIN.genders, gender) : "";
  const a = age ? `${age}살` : "";
  return [a, g].filter(Boolean).join(" · ");
}

export const VIEWER_STATUS: Record<string, { label: string; tone: string }> = {
  received: { label: "접수됨", tone: "neutral" },
  scheduled: { label: "방송 예정", tone: "blue" },
  aired: { label: "방송에서 읽음", tone: "yellow" },
  private: { label: "방장만 봄", tone: "neutral" },
  replied: { label: "답장 도착", tone: "red" },
};

export const ADMIN_STATUS: Record<string, string> = {
  new: "새 사연",
  starred: "별표",
  scheduled: "방송 예정",
  on_air: "방송 중",
  read: "읽음",
  hold: "보류",
};

export const FLAG_LABEL: Record<string, string> = {
  care: "확인 필요",
  profanity: "욕설",
  targeting: "저격 의심",
  pii: "개인정보 의심",
};
