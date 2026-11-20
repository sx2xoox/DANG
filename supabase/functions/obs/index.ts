// =====================================================================
// OBS 방송 카드용 서버 함수 (GET /obs?key=...)
// 본문은 절대 내보내지 않습니다. 이름(공개 방식 반영), 나이·성별, 한 줄 요약, 우표, 목소리,
// 그리고 방장이 "공개"를 누른 뒤에만 고민 동물을 내보냅니다.
// =====================================================================
import { HttpError, json, serve } from "../_shared/http.ts";
import { adminDb } from "../_shared/db.ts";
import { safeEqual } from "../_shared/crypto.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const db = adminDb();
  const { data: st } = await db.from("settings").select("obs_key, preset, site_name").eq("id", 1).single();
  if (!key || !st?.obs_key || !safeEqual(key, st.obs_key)) {
    throw new HttpError(403, "OBS 키가 맞지 않아요. 관리자 페이지에서 주소를 다시 복사해 주세요.");
  }

  const { data: b } = await db.from("broadcast_state").select("*").eq("id", 1).single();
  let card = null;
  if (b?.story_id && !b.hidden) {
    const { data: s } = await db
      .from("stories")
      .select("id, receipt_no, display_name, visibility, age, gender, summary, stamp, voice, category")
      .eq("id", b.story_id)
      .maybeSingle();
    if (s && s.visibility !== "private") {
      let animal = null;
      if (b.revealed) {
        const { data: a } = await db
          .from("worry_animals")
          .select("name, emoji, why, quote, hashtags")
          .eq("story_id", s.id)
          .maybeSingle();
        animal = a;
      }
      card = {
        id: s.id,
        receipt_no: s.receipt_no,
        name: s.visibility === "named" ? s.display_name : "익명의 사연자",
        age: s.age,
        gender: s.gender,
        summary: s.summary,
        stamp: s.stamp,
        voice: s.voice,
        category: s.category,
        animal,
      };
    }
  }

  return json(
    {
      preset: st.preset,
      site_name: st.site_name,
      hidden: !!b?.hidden,
      revealed: !!b?.revealed,
      roulette: b?.roulette ?? null,
      updated_at: b?.updated_at,
      server_time: new Date().toISOString(),
      card,
    },
    200,
    { "Cache-Control": "no-store" },
  );
});
