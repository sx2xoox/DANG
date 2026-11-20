import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const FUNCTIONS_URL =
  ((import.meta.env.VITE_FUNCTIONS_URL as string) || "").replace(/\/$/, "") || `${url}/functions/v1`;

if (!url || !anonKey) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 설정되지 않았어요. web/.env.example 을 참고하세요.");
}

export const supabase = createClient(url, anonKey, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

/** 서버 함수 호출 (로그인 상태면 토큰을 같이 보냅니다) */
export async function callFn<T = any>(
  name: "public" | "admin",
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: anonKey,
    "x-device-id": deviceId(),
    ...extraHeaders,
  };
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/${name}`, { method: "POST", headers, body: JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "인터넷 연결을 확인해 주세요.");
  }
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    if (!res.ok) throw new ApiError(res.status, "서버에서 문제가 생겼어요.");
    return (await res.text()) as unknown as T;
  }
  const json = await res.json();
  if (!res.ok) throw new ApiError(res.status, json.error ?? "문제가 생겼어요.", json.code);
  return json as T;
}

const DEVICE_KEY = "dg.device";
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

// ---------------------------------------------------------------------
// 작은 저장소 도우미 (실패해도 화면은 동작)
// ---------------------------------------------------------------------
export const store = {
  get<T>(key: string, fallback: T, session = false): T {
    try {
      const raw = (session ? sessionStorage : localStorage).getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown, session = false) {
    try {
      (session ? sessionStorage : localStorage).setItem(key, JSON.stringify(value));
    } catch {
      /* 저장 불가 환경 */
    }
  },
  remove(key: string, session = false) {
    try {
      (session ? sessionStorage : localStorage).removeItem(key);
    } catch {
      /* noop */
    }
  },
};

/** 로그인 전에 낸 사연을 로그인 후 내 사연함으로 옮기기 위한 대기 목록 */
export const PENDING_CLAIMS = "dg.pendingClaims";
export type PendingClaim = { receipt_no: number; code: string };

export function addPendingClaim(c: PendingClaim) {
  const list = store.get<PendingClaim[]>(PENDING_CLAIMS, []);
  if (!list.some((x) => x.receipt_no === c.receipt_no)) list.push(c);
  store.set(PENDING_CLAIMS, list);
}

export async function runPendingClaims(): Promise<number> {
  const list = store.get<PendingClaim[]>(PENDING_CLAIMS, []);
  if (!list.length) return 0;
  const left: PendingClaim[] = [];
  let moved = 0;
  for (const c of list) {
    try {
      await callFn("public", { action: "claim", ...c });
      moved++;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) left.push(c);
    }
  }
  store.set(PENDING_CLAIMS, left);
  return moved;
}
