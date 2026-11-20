import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { GOMIN, optionEmoji } from "@shared/boxes.ts";
import { supabase } from "../lib/supabase";
import { useSite } from "../lib/site";
import { formatDate, shortDate, VIEWER_STATUS } from "../lib/format";
import { AnimalCard, type Animal } from "../components/AnimalCard";
import { Spinner, StampSticker } from "../components/ui";

export type MyStoryRow = {
  id: string;
  receipt_no: number;
  summary: string;
  stamp: string;
  category: string;
  created_at: string;
  viewer_status: string;
  visibility: string;
  waiting_notice_at: string | null;
};

type AnimalRow = Animal & { story_id: string; created_at: string };
type DexRow = { story_id: string; golden: boolean; claimed_at: string | null; paid_at: string | null; collected_at: string };

type Tab = "list" | "dex" | "history";

export default function Me() {
  const { session, authReady, info } = useSite();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "list";
  const [stories, setStories] = useState<MyStoryRow[] | null>(null);
  const [animals, setAnimals] = useState<Record<string, AnimalRow>>({});
  const [dex, setDex] = useState<Record<string, DexRow>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [s, a, d] = await Promise.all([
        supabase
          .from("stories")
          .select("id, receipt_no, summary, stamp, category, created_at, viewer_status, visibility, waiting_notice_at")
          .order("created_at", { ascending: false }),
        supabase.from("worry_animals").select("story_id, name, emoji, why, description, quote, hashtags, prev_name, prev_emoji, change_reason, created_at"),
        supabase.from("dex_entries").select("story_id, golden, claimed_at, paid_at, collected_at"),
      ]);
      if (s.error) {
        setError("사연을 불러오지 못했어요.");
        return;
      }
      setStories(s.data as MyStoryRow[]);
      setAnimals(Object.fromEntries(((a.data ?? []) as AnimalRow[]).map((x) => [x.story_id, x])));
      setDex(Object.fromEntries(((d.data ?? []) as DexRow[]).map((x) => [x.story_id, x])));
    })();
  }, [session]);

  if (authReady && !session) return <Navigate to="/login?next=/me" replace />;
  if (!stories) return error ? <p className="page-narrow notice notice-danger">{error}</p> : <Spinner />;

  const queued = stories.filter((s) => s.viewer_status === "approved" || s.viewer_status === "scheduled").length;
  // 도감: 방송에서 읽히고 결과가 공개된 사연의 고민 동물만 모여요
  const collected = stories
    .filter((s) => animals[s.id] && dex[s.id])
    .sort((a, b) => (dex[a.id].collected_at < dex[b.id].collected_at ? -1 : 1));
  const goldenCount = collected.filter((s) => dex[s.id].golden).length;
  // 변신 기록: 보낸 사연 전체
  const history = stories.filter((s) => animals[s.id]).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

  const setTab = (t: Tab) => setParams(t === "list" ? {} : { tab: t }, { replace: true });

  return (
    <div className="page me">
      <div className="me-head">
        <div>
          <h1 className="display" style={{ fontSize: 30 }}>
            내 사연함
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            보낸 사연 {stories.length}개 · 도감에 모은 고민 동물 {collected.length}마리
            {goldenCount > 0 && <> · 황금 {goldenCount}마리</>}
            {queued > 0 && <> · 방송 대기 {queued}개</>}
          </p>
        </div>
        <div className="row">
          <Link to="/write" className="btn btn-primary">
            새 사연 쓰기
          </Link>
          <Link to="/me/account" className="btn btn-ghost">
            계정
          </Link>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="내 사연함 보기">
        <button role="tab" aria-selected={tab === "list"} onClick={() => setTab("list")}>
          내 사연
        </button>
        <button role="tab" aria-selected={tab === "dex"} onClick={() => setTab("dex")}>
          고민 동물 도감
        </button>
        <button role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")}>
          변신 기록
        </button>
      </div>

      {tab === "list" && (
        <section role="tabpanel" aria-label="내 사연" className="my-list">
          {stories.length === 0 && (
            <div className="card center stack">
              <p className="display" style={{ fontSize: 22 }}>
                아직 보낸 사연이 없어요
              </p>
              <Link to="/write" className="btn btn-primary">
                첫 사연 보내기
              </Link>
            </div>
          )}
          {stories.map((s) => {
            const st = VIEWER_STATUS[s.viewer_status] ?? VIEWER_STATUS.reviewing;
            return (
              <Link key={s.id} to={`/me/story/${s.id}`} className="my-row card">
                <StampSticker stamp={s.stamp} size="sm" />
                <div className="my-row-main">
                  <div className="my-row-top">
                    <span className="faint">
                      #{s.receipt_no} · {shortDate(s.created_at)} · {optionEmoji(GOMIN.categories, s.category)}
                    </span>
                  </div>
                  <strong className="my-row-sum">{s.summary}</strong>
                </div>
                <div className="my-row-status">
                  <span className={`chip status-${st.tone}`}>{st.label}</span>
                  {dex[s.id]?.golden && <span className="chip chip-gold">황금</span>}
                  {animals[s.id] && (
                    <span className="my-row-animal" title={animals[s.id].name} aria-label={`고민 동물 ${animals[s.id].name}`}>
                      {animals[s.id].emoji}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {tab === "dex" && (
        <section role="tabpanel" aria-label="고민 동물 도감">
          <p className="dex-rule">
            사연이 <b>방송에서 읽히면</b> 그 고민 동물이 도감에 모여요.
          </p>
          {collected.length === 0 ? (
            <div className="card center stack">
              <p className="display" style={{ fontSize: 22 }}>
                아직 모은 고민 동물이 없어요
              </p>
              <p className="muted" style={{ margin: 0 }}>
                사연이 방송에서 읽히면 고민 동물 카드가 여기에 모여요.
              </p>
            </div>
          ) : (
            <div className="dex-grid">
              {collected.map((s) => {
                const d = dex[s.id];
                return (
                  <Link key={s.id} to={`/me/story/${s.id}`} className="dex-item" aria-label={`${animals[s.id].name}${d.golden ? " (황금)" : ""} 카드 보기`}>
                    <AnimalCard animal={animals[s.id]} revealed compact serial={s.receipt_no} stamp={s.stamp} siteName={info.site_name} date={shortDate(s.created_at)} aired golden={d.golden} />
                    {d.golden && !d.paid_at && <span className="dex-gold-note">{d.claimed_at ? "구독권 확인 중" : "구독권 신청하기 →"}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "history" && (
        <section role="tabpanel" aria-label="변신 기록" className="card">
          {history.length === 0 ? (
            <p className="muted">사연을 보낼 때마다 고민 동물이 어떻게 바뀌어 가는지 여기서 볼 수 있어요.</p>
          ) : (
            <ol className="timeline">
              {history.map((s, i) => {
                const a = animals[s.id];
                const prev = i > 0 ? animals[history[i - 1].id] : null;
                const changed = prev && prev.name !== a.name;
                return (
                  <li key={s.id}>
                    <span className="tl-emoji" aria-hidden="true">
                      {a.emoji}
                    </span>
                    <div>
                      <div className="tl-name display">{a.name}</div>
                      <div className="faint">
                        {formatDate(s.created_at)} · “{s.summary}”
                      </div>
                      {changed && (
                        <p className="tl-change">
                          {prev.emoji} {prev.name} → {a.emoji} {a.name}(으)로 변신!
                          {a.change_reason && <span className="muted"> {a.change_reason}</span>}
                        </p>
                      )}
                      {!changed && i > 0 && <p className="faint" style={{ margin: "4px 0 0" }}>같은 동물로 한 번 더!</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
