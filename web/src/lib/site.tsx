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
};

const DEFAULT_INFO: HomeInfo = {
  site_name: "다웅 고민 사연함",
  tagline: "다웅이 방송에서 직접 읽어주는 고민 상담 코너",
  week_theme: "",
  preset: "lounge",
  accepting: true,
  week_count: 0,
  queue_count: 0,
  total_aired: 0,
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
  const theme = p === "lounge" ? "#EEF0E6" : p === "classic" ? "#0B1220" : p === "cork" ? "#6B4428" : "#F1EAFF";
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
