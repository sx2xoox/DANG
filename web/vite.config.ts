import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const shared = fileURLToPath(new URL("../supabase/functions/_shared", import.meta.url));

/**
 * 링크 미리보기(og:image 등)는 전체 주소가 필요해요.
 *  1) VITE_SITE_URL (예: https://dawoong.kr) 을 넣으면 그 주소
 *  2) 없으면 Cloudflare Pages 가 빌드할 때 주는 CF_PAGES_URL
 *  3) 둘 다 없으면 상대 주소 (/og.png)
 */
function siteUrlPlugin(siteUrl: string): Plugin {
  return {
    name: "site-url",
    transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", siteUrl),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = (env.VITE_SITE_URL || process.env.CF_PAGES_URL || "").replace(/\/$/, "");
  return {
    plugins: [react(), siteUrlPlugin(siteUrl)],
    resolve: { alias: { "@shared": shared } },
    server: { port: 5173, fs: { allow: [".."] } },
    build: { outDir: "dist", sourcemap: false },
  };
});
