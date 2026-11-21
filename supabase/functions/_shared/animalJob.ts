// 고민 동물 만들기 작업 (제출 직후 / 관리자 "다시 만들기")
import { adminDb } from "./db.ts";
import { createAnimal } from "./ai.ts";

export type Prev = { name: string; emoji: string; summary: string };

export async function previousAnimals(userId: string, excludeId?: string): Promise<Prev[]> {
  const { data } = await adminDb()
    .from("stories")
    .select("id, summary, created_at, worry_animals(name, emoji)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(6);
  return (data ?? [])
    .filter((s: any) => s.id !== excludeId && s.worry_animals)
    .slice(0, 5)
    .map((s: any) => ({ name: s.worry_animals.name, emoji: s.worry_animals.emoji, summary: s.summary }));
}

export function transformation(prev: Prev | undefined, newName: string, reason: string) {
  if (!prev || prev.name === newName) return { prev_name: null, prev_emoji: null, change_reason: null };
  return {
    prev_name: prev.name,
    prev_emoji: prev.emoji,
    change_reason: reason || "이번 사연의 고민 온도와 감정이 지난번과 달라졌어요.",
  };
}

async function recentAnimalNames(): Promise<string[]> {
  const { data } = await adminDb()
    .from("worry_animals")
    .select("name")
    .eq("source", "ai")
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []).map((r) => r.name);
}

/** 고민 동물을 만들어 저장하고, 저장된 결과를 돌려줍니다. (AI 가 실패해도 기본 동물로 항상 성공) */
export async function generateAnimalFor(story: any, prev: Prev[], deadlineMs?: number) {
  const db = adminDb();
  const { result, error } = await createAnimal(
    {
      category: story.category,
      temperature: story.temperature,
      wish: story.wish,
      stamp: story.stamp,
      summary: story.summary,
      body: story.body,
      care: (story.flags ?? []).includes("care"),
      forbidden: [story.display_name],
      previous: prev,
      recentNames: await recentAnimalNames(),
    },
    deadlineMs,
  );
  const row: Record<string, unknown> = {
    story_id: story.id,
    name: result.name,
    emoji: result.emoji,
    why: result.why,
    description: result.description,
    quote: result.quote,
    hashtags: result.hashtags,
    source: result.source,
    ...transformation(prev[0], result.name, result.change_reason),
    updated_at: new Date().toISOString(),
  };
  await db.from("worry_animals").upsert(row, { onConflict: "story_id" });
  const animalState = result.source === "ai" ? "ready" : error ? "failed" : "fallback";
  await db.from("stories").update({ animal_state: animalState }).eq("id", story.id);
  return { animal: row, animalState, review: { needed: result.review_needed, reason: result.review_reason } };
}
