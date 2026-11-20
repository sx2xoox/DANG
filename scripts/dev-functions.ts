// 로컬 개발/테스트용: 서버 함수 3개(public, admin, obs)를 한 프로세스에서 띄웁니다.
// 실제 배포에서는 쓰지 않습니다. (Supabase 가 함수마다 따로 실행)
//   npx deno run -A --env-file=supabase/functions/.env scripts/dev-functions.ts
type Handler = (r: Request) => Promise<Response>;
const handlers: Record<string, Handler> = {};
let current = "";
(globalThis as { __devRegister?: (h: Handler) => void }).__devRegister = (h) => {
  handlers[current] = h;
};
for (const name of ["public", "admin", "obs"]) {
  current = name;
  await import(`../supabase/functions/${name}/index.ts`);
}
const port = Number(Deno.env.get("DEV_FUNCTIONS_PORT") ?? 54400);
Deno.serve({ port, hostname: "127.0.0.1" }, (req) => {
  const url = new URL(req.url);
  const name = url.pathname.replace(/^\/functions\/v1\//, "/").split("/")[1];
  const h = handlers[name];
  if (!h) return new Response("not found", { status: 404 });
  return h(req);
});
console.log(`dev functions on http://127.0.0.1:${port}/functions/v1/{public,admin,obs}`);
