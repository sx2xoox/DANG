import { deviceId, store, supabase } from "./supabase";

// =====================================================================
// 홍보(릴스·쇼츠) 도우미
//  * 사이트 주소: VITE_SITE_URL (짧은 도메인) → 없으면 지금 접속한 주소
//  * 영상별 유입: 사이트주소/v/12 또는 ?v=12 로 들어오면 그 영상 이름을 7일 동안 기억하고,
//    방문 1번(기기·하루 기준)을 기록해요. 그 사이 사연을 보내면 사연에도 영상 이름이 남아요.
// =====================================================================

const CONFIGURED = ((import.meta.env.VITE_SITE_URL as string) || "").replace(/\/$/, "");

export function siteUrl(): string {
  return CONFIGURED || (typeof location !== "undefined" ? location.origin : "");
}

/** 카드에 찍을 짧은 주소 (https://, www. 없이). 로컬 개발 주소면 빈 값 */
export function siteHost(): string {
  try {
    const host = new URL(siteUrl()).host.replace(/^www\./, "");
    return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "" : host;
  } catch {
    return "";
  }
}

const REF_KEY = "dg.ref";
const REF_DAYS = 7;
const REF_RE = /^[a-z0-9_-]{1,30}$/;

export function normalizeRef(v: string | null | undefined): string | null {
  const r = (v ?? "").trim().toLowerCase();
  return REF_RE.test(r) ? r : null;
}

/** 영상 주소로 들어왔을 때: 기억하고 방문 기록 */
export function captureRef(raw: string | null | undefined) {
  const ref = normalizeRef(raw);
  if (!ref) return;
  store.set(REF_KEY, { ref, at: Date.now() });
  supabase.rpc("log_visit", { p_ref: ref, p_device: deviceId() }).then(
    () => {},
    () => {},
  );
}

/** 지금 주소의 ?v= (또는 ?ref=) 를 읽어서 기록합니다. */
export function captureRefFromLocation() {
  if (typeof location === "undefined") return;
  const p = new URLSearchParams(location.search);
  const raw = p.get("v") ?? p.get("ref");
  if (raw) captureRef(raw);
}

/** 사연에 붙일 영상 이름 (7일 안에 영상 주소로 들어왔을 때만) */
export function currentRef(): string | null {
  const v = store.get<{ ref: string; at: number } | null>(REF_KEY, null);
  if (!v || Date.now() - v.at > REF_DAYS * 86_400_000) return null;
  return normalizeRef(v.ref);
}

/** 릴스·쇼츠에 넣을 영상별 주소 */
export function videoLink(ref: string): string {
  return `${siteUrl()}/v/${ref}`;
}

/** 사이트 → 내 채널 이동 기록 (go-chzzk, go-youtube). 같은 기기는 하루 한 번만 세요. */
export function trackOut(target: "chzzk" | "youtube") {
  supabase.rpc("log_visit", { p_ref: `go-${target}`, p_device: deviceId() }).then(
    () => {},
    () => {},
  );
}
