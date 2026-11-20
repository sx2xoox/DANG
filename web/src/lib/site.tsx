import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Preset = "lounge" | "classic" | "cork" | "gacha";

export type HomeInfo = {
  site_name: string;
  tagline: string;
  week_theme: string;
  preset: Preset;
  accepting: boolean;
  week_count: number;
  queue_count: number;
  total_aired: number;
  /** 내 채널 (관리자 설정) */
  chzzk_url: string | null;
  youtube_url: string | null;
  /** 방송 시간 안내 (예: 매주 토요일 밤 9시) */
  schedule_text: string;
  /** 관리자가 "방송 시작"을 누르고 아직 끝나지 않았으면 true */
  on_air: boolean;
};

const DEFAULT_INFO: HomeInfo = {
  site_name: "다웅 고민 사연함",
  tagline: "방송에서 같이 읽고 이야기하는 고민 상담 코너",
  week_theme: "",
  preset: "cork",
  accepting: true,
  week_count: 0,
  queue_count: 0,
  total_aired: 0,
  chzzk_url: null,
  youtube_url: null,
  schedule_text: "매주 토요일 밤 9시",
  on_air: false,
};

type SiteCtx = {
  info: HomeInfo;
  loaded: boolean;
  refresh: () => Promise<void>;
  session: Session | null;
  authReady: boolean;
  setPresetPreview: (p: Preset | null) => void;
};

const Ctx = createContext<SiteCtx>({
  info: DEFAULT_INFO,
  loaded: false,
  refresh: async () => {},
  session: null,
  authReady: false,
  setPresetPreview: () => {},
});

export function applyPreset(p: Preset) {
  document.documentElement.dataset.preset = p;
  const theme = p === "lounge" ? "#EEF0E6" : p === "classic" ? "#0B1220" : p === "cork" ? "#FFFAF0" : "#F1EAFF";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme);
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<HomeInfo>(() => {
    try {
      const cached = localStorage.getItem("dg.home");
      return cached ? { ...DEFAULT_INFO, ...JSON.parse(cached) } : DEFAULT_INFO;
    } catch {
      return DEFAULT_INFO;
    }
  });
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [preview, setPreview] = useState<Preset | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("home_info");
    if (!error && data) {
      const next = { ...DEFAULT_INFO, ...(data as HomeInfo) };
      setInfo(next);
      try {
        localStorage.setItem("dg.home", JSON.stringify(next));
      } catch {
        /* noop */
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    // "지금 방송 중" 표시가 늦지 않게 1분마다 (화면을 보고 있을 때만)
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60_000);
    return () => window.clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    applyPreset(preview ?? info.preset);
    document.title = info.site_name;
  }, [info.preset, info.site_name, preview]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{ info, loaded, refresh, session, authReady, setPresetPreview: setPreview }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSite = () => useContext(Ctx);
