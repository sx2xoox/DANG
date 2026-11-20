import { useEffect, useState } from "react";
import { reactionEmoji, reactionLabel } from "@shared/results.ts";
import { supabase } from "../lib/supabase";

type WallItem = { emoji: string; name: string; reaction: string; comment: string };

/**
 * 첫 화면 후기 벽: 방장이 승인하고 공개에 동의한 후기만 (고민 동물, 반응, 한 줄 후기)
 * 사연 내용, 닉네임, 나이, 성별은 서버에서부터 내려오지 않아요. 승인된 후기가 없으면 숨겨요.
 */
export function ReviewWall() {
  const [items, setItems] = useState<WallItem[]>([]);

  useEffect(() => {
    let alive = true;
    supabase.rpc("review_wall").then(({ data, error }) => {
      if (alive && !error && Array.isArray(data)) setItems(data as WallItem[]);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!items.length) return null;

  // 카드가 적으면 끊기지 않게 반복해서 흘려보냅니다. (움직임 줄이기 설정이면 한 번씩만, 멈춘 채로)
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const loop = reduce ? items : items.length < 6 ? [...items, ...items, ...items] : items;
  const cards = reduce ? loop : [...loop, ...loop];
  const duration = Math.max(30, loop.length * 6);

  return (
    <section className="review-wall" aria-labelledby="wall-title">
      <h2 id="wall-title" className="review-wall-title">
        후기 벽 <span>방송에서 고민을 들은 사람들의 한마디</span>
      </h2>
      {/* 화면 읽기 프로그램용: 움직이지 않는 목록 */}
      <ul className="sr-only">
        {items.map((it, i) => (
          <li key={i}>
            {it.emoji} {it.name}, {reactionLabel(it.reaction)}
            {it.comment ? `, "${it.comment}"` : ""}
          </li>
        ))}
      </ul>
      <div className="review-wall-track" aria-hidden="true">
        <div className="review-wall-row" style={{ animationDuration: `${duration}s` }}>
          {cards.map((it, i) => (
            <article key={i} className="wall-card">
              <p className="wall-animal">
                <span className="wall-emoji">{it.emoji}</span> {it.name}
              </p>
              <p className="wall-reaction">
                {reactionEmoji(it.reaction)} {reactionLabel(it.reaction)}
              </p>
              {it.comment && <p className="wall-comment">“{it.comment}”</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
