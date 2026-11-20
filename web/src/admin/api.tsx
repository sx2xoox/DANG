import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, callFn, store } from "../lib/supabase";

export type Role = "owner" | "manager";
export type AdminSession = { token: string; role: Role; expires_at: string };

const KEY = "dg.admin";

function loadSession(): AdminSession | null {
  const s = store.get<AdminSession | null>(KEY, null) ?? store.get<AdminSession | null>(KEY, null, true);
  if (!s || !s.token || new Date(s.expires_at).getTime() < Date.now()) return null;
  return s;
}

function saveSession(s: AdminSession | null, remember: boolean) {
  store.remove(KEY);
  store.remove(KEY, true);
  if (s) store.set(KEY, s, !remember);
}

export type Alerts = {
  pending_count: number;
  care_followups: { id: string; story_id: string; receipt_no: number; body: string; created_at: string }[];
  new_reviews: number;
  golden_waiting: number;
};

const NO_ALERTS: Alerts = { pending_count: 0, care_followups: [], new_reviews: 0, golden_waiting: 0 };

type Ctx = {
  session: AdminSession | null;
  role: Role | null;
  isOwner: boolean;
  /** 검토 대기 사연 수 (메뉴 배지) */
  pendingCount: number;
  setPendingCount: (n: number) => void;
  /** 메뉴 배지와 맨 위 알림 */
  alerts: Alerts;
  refreshAlerts: () => Promise<void>;
  call: <T = any>(action: string, body?: Record<string, unknown>) => Promise<T>;
  login: (password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminCtx = createContext<Ctx>(null as unknown as Ctx);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(loadSession);
  const [alerts, setAlerts] = useState<Alerts>(NO_ALERTS);
  const pendingCount = alerts.pending_count;
  const setPendingCount = useCallback((n: number) => setAlerts((a) => ({ ...a, pending_count: n })), []);

  const call = useCallback(
    async <T,>(action: string, body: Record<string, unknown> = {}): Promise<T> => {
      if (!session) throw new ApiError(401, "관리자 로그인이 필요해요.", "no_session");
      try {
        return await callFn<T>("admin", { action, ...body }, { "x-admin-token": session.token });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401 && e.code === "no_session") {
          saveSession(null, true);
          setSession(null);
        }
        throw e;
      }
    },
    [session],
  );

  const login = useCallback(async (password: string, remember: boolean) => {
    const res = await callFn<AdminSession>("admin", { action: "login", password, remember });
    saveSession(res, remember);
    setSession(res);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (session) await callFn("admin", { action: "logout" }, { "x-admin-token": session.token });
    } catch {
      /* 이미 끝난 세션 */
    }
    saveSession(null, true);
    setSession(null);
  }, [session]);

  const refreshAlerts = useCallback(async () => {
    if (!session) return;
    try {
      setAlerts(await callFn<Alerts>("admin", { action: "alerts" }, { "x-admin-token": session.token }));
    } catch {
      /* 다음 주기에 다시 */
    }
  }, [session]);

  // 저장된 세션이 아직 유효한지 서버에 한 번 확인
  useEffect(() => {
    if (!session) return;
    callFn("admin", { action: "session" }, { "x-admin-token": session.token }).catch((e) => {
      if (e instanceof ApiError && e.status === 401) {
        saveSession(null, true);
        setSession(null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminCtx.Provider
      value={{
        session,
        role: session?.role ?? null,
        isOwner: session?.role === "owner",
        pendingCount,
        setPendingCount,
        alerts,
        refreshAlerts,
        call,
        login,
        logout,
      }}
    >
      {children}
    </AdminCtx.Provider>
  );
}

export const useAdmin = () => useContext(AdminCtx);

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "문제가 생겼어요.";
}

/** 넓은 화면 여부 */
export function useWide(min = 1100) {
  const q = `(min-width: ${min}px)`;
  const [wide, setWide] = useState(() => (typeof window !== "undefined" ? window.matchMedia(q).matches : true));
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return wide;
}

// ---------------------------------------------------------------- 타입
export type Status = "pending" | "approved" | "on_air" | "read" | "rejected";

export type ListItem = {
  id: string;
  receipt_no: number;
  display_name: string;
  broadcast_name: string;
  name_mode: string;
  age: number | null;
  gender: string | null;
  category: string;
  summary: string;
  temperature: number;
  wish: string;
  stamp: string;
  voice: string;
  visibility: string;
  badge: string;
  status: Status;
  starred: boolean;
  scheduled: boolean;
  flags: string[];
  animal_state: string;
  created_at: string;
  created_day: string;
  reviewed_at: string | null;
  aired_at: string | null;
  read_started_at: string | null;
  result_published_at: string | null;
  waiting_notice: boolean;
  waited_days: number;
  logged_in: boolean;
  animal: { name: string; emoji: string; source: string } | null;
  follow_up_count: number;
  review_reaction: string | null;
};

export type FullStory = ListItem & {
  body: string;
  write_mode: string;
  template_id: string | null;
  template_answers: string[] | null;
  viewer_status: string;
  broadcast_id: string | null;
  vod_offset_sec: number | null;
  vod_url: string | null;
  host_note: string | null;
  private_message: string | null;
};

export type AnimalRow = {
  name: string;
  emoji: string;
  why: string;
  description: string;
  quote: string;
  hashtags: string[];
  source: string;
  prev_name: string | null;
  prev_emoji: string | null;
  change_reason: string | null;
};

export type AdminFollowUp = { id: string; body: string; created_at: string; flags?: string[]; care_checked?: boolean };

export type AdminReview = {
  story_id: string;
  reaction: string;
  comment: string;
  share: boolean;
  status: "new" | "approved" | "hidden";
  flags: string[];
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

export type StoryBundle = {
  story: FullStory;
  animal: AnimalRow | null;
  follow_ups: AdminFollowUp[];
  picks: { picked_at: string }[];
  review: AdminReview | null;
  dex: { golden: boolean; golden_code: string | null; claim_name: string | null; claimed_at: string | null; paid_at: string | null; collected_at: string } | null;
  broadcast: Broadcast | null;
};

export type Broadcast = { id: string; started_at: string; vod_url: string | null; published_at: string | null };

export const REVIEW_STATUS_LABEL: Record<string, string> = {
  new: "새 후기",
  approved: "승인됨",
  hidden: "숨김",
};

export type BroadcastState = {
  story_id: string | null;
  hidden: boolean;
  revealed: boolean;
  scroll: number;
  roulette: unknown;
  updated_at: string;
  stories: { receipt_no: number; summary: string; display_name: string; visibility: string; status: Status } | null;
};

export const STATUS_LABEL: Record<Status, string> = {
  pending: "검토 대기",
  approved: "방송 대기",
  on_air: "방송 중",
  read: "방송에서 읽음",
  rejected: "반려",
};

export const VISIBILITY_LABEL: Record<string, string> = {
  named: "이름 공개",
  anonymous: "익명으로 읽기",
};

export const ANIMAL_STATE_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: "만드는 중", tone: "blue" },
  ready: { label: "AI가 지음", tone: "ok" },
  fallback: { label: "기본 동물", tone: "warn" },
  failed: { label: "AI 실패 · 기본 동물", tone: "warn" },
  manual: { label: "직접 수정함", tone: "ok" },
};

/** 한국 날짜 문자열(2026-11-20) → "11월 20일 (금)" */
export function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dow = "일월화수목금토"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${dow})`;
}

/** 입력칸에 글자를 치는 중이면 단축키를 쓰지 않습니다. */
export function typingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}
