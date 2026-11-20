// 고민 동물 도감 모으기 (서버 전용)
// 로그인 사용자의 사연이 방송에서 읽히고 결과가 공개되면 그 고민 동물이 도감에 들어가요.
// 사연 하나에 딱 한 번만 뽑고(이미 있으면 그대로), 1% 확률로 황금 동물이 나와요.
import { adminDb } from "./db.ts";
import { randomCode } from "./crypto.ts";
import { GOLDEN_RATE, rollGolden } from "./results.ts";

function goldenRate(): number {
  // 로컬 테스트에서만 확률을 바꿀 수 있어요 (배포 환경에는 넣지 마세요)
  const v = Number(Deno.env.get("GOLDEN_RATE_FOR_TEST"));
  return Number.isFinite(v) && v >= 0 && v <= 1 && Deno.env.get("GOLDEN_RATE_FOR_TEST") ? v : GOLDEN_RATE;
}

export async function collectToDex(storyIds: string[]): Promise<{ collected: number; golden: number }> {
  if (!storyIds.length) return { collected: 0, golden: 0 };
  const db = adminDb();
  const { data: stories } = await db.from("stories").select("id, user_id, viewer_status").in("id", storyIds);
  const eligible = (stories ?? []).filter((s) => s.user_id && s.viewer_status === "aired");
  if (!eligible.length) return { collected: 0, golden: 0 };
  const { data: existing } = await db.from("dex_entries").select("story_id").in("story_id", eligible.map((s) => s.id));
  const have = new Set((existing ?? []).map((e) => e.story_id));
  const rate = goldenRate();
  const rows = eligible
    .filter((s) => !have.has(s.id))
    .map((s) => {
      const golden = rollGolden(rate);
      return { story_id: s.id, user_id: s.user_id, golden, golden_code: golden ? `GOLD-${randomCode()}` : null };
    });
  if (!rows.length) return { collected: 0, golden: 0 };
  const { error } = await db.from("dex_entries").upsert(rows, { onConflict: "story_id", ignoreDuplicates: true });
  if (error) {
    console.error("dex collect failed", error);
    return { collected: 0, golden: 0 };
  }
  return { collected: rows.length, golden: rows.filter((r) => r.golden).length };
}
