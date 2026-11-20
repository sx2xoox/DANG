import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.118.0";

let cached: SupabaseClient | null = null;

/** 서버 전용 클라이언트 (모든 접근 규칙을 통과). 절대 브라우저로 내보내지 않음. */
export function adminDb(): SupabaseClient {
  if (!cached) {
    cached = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/** 요청에 로그인 토큰이 있으면 그 사용자를 돌려줍니다. 없거나 잘못되면 null. */
export async function requestUser(req: Request): Promise<User | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token.split(".").length !== 3) return null;
  const { data, error } = await adminDb().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function logAi(row: {
  kind: string;
  ok: boolean;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  error?: string;
}) {
  await adminDb().from("ai_usage").insert(row);
}
