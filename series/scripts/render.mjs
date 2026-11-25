// 시리즈 쇼츠 뽑기
//   npm run render            → 전부
//   npm run render -- s03 s04 → 고른 편만
// 결과: out/<편>/video.mp4 (영상), cover.jpg (첫 화면 = 썸네일), post.txt (제목·설명·해시태그·추적 주소)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(root, "node_modules/.bin/remotion");
const SITE = "dawoong-gomin.pages.dev";

// 편 목록은 TypeScript 파일이라, Remotion 에게 목록을 물어봐요.
const list = execFileSync(bin, ["compositions", "src/index.ts", "--quiet"], { cwd: root, encoding: "utf8" })
  .split(/\s+/)
  .filter((id) => /^s\d+$/.test(id));
const want = process.argv.slice(2);
const ids = want.length ? list.filter((id) => want.includes(id)) : list;
if (!ids.length) {
  console.error("뽑을 편이 없어요. 있는 편:", list.join(", "));
  process.exit(1);
}

const src = fs.readFileSync(path.join(root, "src/episodes.ts"), "utf8");
for (const id of ids) {
  const dir = path.join(root, "out", id);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`\n▶ ${id} 영상 뽑는 중…`);
  execFileSync(bin, ["render", "src/index.ts", id, path.join(dir, "video.mp4")], { cwd: root, stdio: "inherit" });
  execFileSync(bin, ["still", "src/index.ts", id, path.join(dir, "cover.jpg"), "--frame=20"], { cwd: root, stdio: "inherit" });
  // 올릴 글 (episodes.ts 의 post 부분)
  const block = src.slice(src.indexOf(`id: "${id}"`));
  const pick = (k) => (block.match(new RegExp(`${k}: "((?:[^"\\\\]|\\\\.)*)"`)) || [])[1]?.replace(/\\n/g, "\n").replace(/\\"/g, '"') ?? "";
  const tagsLine = (block.match(/tags: \[([^\]]*)\]/) || [])[1] ?? "";
  const tags = [...tagsLine.matchAll(/"(#[^"]+)"/g)].map((m) => m[1]);
  if (tagsLine.includes("COMMON_TAGS")) tags.push(...[...src.match(/COMMON_TAGS = \[([^\]]*)\]/)[1].matchAll(/"(#[^"]+)"/g)].map((m) => m[1]));
  const link = `https://${SITE}/v/${id}`;
  const post = [
    `[제목] ${pick("title")}`,
    "",
    "[설명]",
    pick("caption"),
    "",
    tags.join(" "),
    "",
    `[추적 주소] ${link}`,
    "  - 유튜브: 설명란에 이 주소를 넣으세요.",
    "  - 인스타: 이 편을 올린 날 프로필 링크를 이 주소로 바꿔 두면, 이 영상으로 온 사람이 따로 세어져요.",
  ].join("\n");
  fs.writeFileSync(path.join(dir, "post.txt"), post + "\n");
  console.log(`✓ ${id}: out/${id}/video.mp4, cover.jpg, post.txt`);
}
