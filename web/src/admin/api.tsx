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

type Ctx = {
  session: AdminSession | null;
  role: Role | null;
  isOwner: boolean;
  call: <T = any>(action: string, body?: Record<string, unknown>) => Promise<T>;
  login: (password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminCtx = createContext<Ctx>(null as unknown as Ctx);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(loadSession);

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
    <AdminCtx.Provider value={{ session, role: session?.role ?? null, isOwner: session?.role === "owner", call, login, logout }}>
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
  status: string;
  flags: string[];
  animal_state: string;
  created_at: string;
  logged_in: boolean;
  animal: { name: string; emoji: string; source: string } | null;
  reply_sent_at: string | null;
  reply_kind: string | null;
  has_draft: boolean;
  follow_up_count: number;
};

export type FullStory = ListItem & {
  body: string;
  write_mode: string;
  template_id: string | null;
  template_answers: string[] | null;
  aired_at: string | null;
  viewer_status: string;
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

export type ReplyRow = {
  body: string;
  draft: string | null;
  kind: string;
  aired_on: string | null;
  vod_url: string | null;
  verdict_yes: number | null;
  verdict_no: number | null;
  sent_at: string | null;
  opened_at: string | null;
};

export type StoryBundle = {
  story: FullStory;
  animal: AnimalRow | null;
  reply: ReplyRow | null;
  follow_ups: { id: string; body: string; created_at: string }[];
  picks: { picked_at: string }[];
};

export const VISIBILITY_LABEL: Record<string, string> = {
  named: "방송에서 이름 공개",
  anonymous: "방송에서 익명",
  private: "방장만 보기",
};

export const ANIMAL_STATE_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: "AI가 만드는 중", tone: "blue" },
  ready: { label: "AI가 지음", tone: "ok" },
  fallback: { label: "기본 동물 사용 중", tone: "warn" },
  failed: { label: "AI 실패, 기본 동물 사용 중", tone: "warn" },
  manual: { label: "직접 수정함", tone: "ok" },
};
