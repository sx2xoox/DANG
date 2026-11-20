import { ageGroupFromAge, ageGroupLabel, GOMIN, optionLabel } from "@shared/boxes.ts";

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

export type PersonInfo = {
  age?: number | null;
  age_group?: string | null;
  age_public?: boolean | null;
  gender?: string | null;
};

/**
 * 사연자 소개 (학년대 · 나이 · 성별)
 *  - broadcast: 방송·OBS·읽기 화면용. 정확한 나이는 사연자가 공개를 고른 경우에만
 *  - admin: 관리자 목록·상세용. 비공개 나이는 "(방송 비공개)" 표시
 */
export function personLabel(p: PersonInfo, mode: "broadcast" | "admin" = "broadcast"): string {
  const group = ageGroupLabel(p.age_group ?? (mode === "admin" ? ageGroupFromAge(p.age) : null));
  let age = "";
  if (p.age) {
    if (p.age_public) age = `${p.age}살`;
    else if (mode === "admin") age = `${p.age}살(방송 비공개)`;
  }
  const g = p.gender && p.gender !== "none" ? optionLabel(GOMIN.genders, p.gender) : "";
  return [group, age, g].filter(Boolean).join(" · ");
}

/** @deprecated 예전 화면 호환용: 나이를 공개한 것으로 보고 표시 */
export function ageGender(age: number | null | undefined, gender: string | null | undefined): string {
  return personLabel({ age, age_public: true, gender }, "broadcast");
}

export const VIEWER_STATUS: Record<string, { label: string; tone: string; desc: string }> = {
  reviewing: { label: "검토 중", tone: "neutral", desc: "다웅이 방송 전에 사연을 확인하고 있어요." },
  approved: { label: "방송 대기", tone: "blue", desc: "방송 대기 중이에요. 도착한 순서대로 방송에서 읽어요." },
  scheduled: { label: "방송 예정", tone: "blue", desc: "다음 방송에서 읽힐 수도 있어요!" },
  read: { label: "방송에서 읽음", tone: "yellow", desc: "방송에서 사연을 읽었어요! 다시보기 링크를 정리해서 곧 방송 결과를 열어드릴게요." },
  aired: { label: "방송에서 읽혔어요", tone: "yellow", desc: "방송 결과가 도착했어요. 다시보기로 다웅의 이야기를 다시 들어보세요." },
  not_selected: { label: "이번엔 소개 안 됨", tone: "neutral", desc: "이번엔 방송에 소개되지 않아요. 고민 동물 결과는 그대로 간직할 수 있어요." },
};

/** 오래 기다린 사연 안내 (자동 공개) */
export const WAITING_NOTICE = "아직 방송에서 못 읽었지만 사연은 잘 받았어요. 다음 방송 후보에 남아 있어요.";

export const ADMIN_STATUS: Record<string, string> = {
  pending: "검토 대기",
  approved: "방송 대기",
  on_air: "방송 중",
  read: "방송에서 읽음",
  rejected: "반려",
};

export const FLAG_LABEL: Record<string, string> = {
  care: "확인 필요",
  profanity: "욕설",
  targeting: "저격 의심",
  pii: "개인정보 의심",
  school: "학교·실명 의심",
};
