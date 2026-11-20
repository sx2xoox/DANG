export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id, x-admin-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}

export function clientIp(req: Request): string {
  // 프록시가 직접 채우는 헤더를 먼저 믿고, 없으면 x-forwarded-for 를 씁니다.
  const direct = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  if (direct) return direct.trim();
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || "unknown";
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "요청 내용을 읽을 수 없어요.");
  }
}

/** 함수 하나에 여러 동작을 묶어서 처리합니다. */
export function serve(handler: (req: Request) => Promise<Response>) {
  const wrapped = async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
      console.error(e);
      return json({ error: "서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, 500);
    }
  };
  // 로컬 개발용 묶음 서버(scripts/dev-functions.ts)가 있으면 거기에 등록만 합니다.
  const dev = (globalThis as { __devRegister?: (h: (r: Request) => Promise<Response>) => void }).__devRegister;
  if (dev) dev(wrapped);
  else Deno.serve(wrapped);
}

export function str(v: unknown, max = 10000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function int(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.round(n) : null;
}
