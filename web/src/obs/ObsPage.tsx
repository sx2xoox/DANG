import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GOMIN, optionEmoji, optionLabel } from "@shared/boxes.ts";
import { FUNCTIONS_URL } from "../lib/supabase";
import { applyPreset, type Preset } from "../lib/site";
import { ageGender } from "../lib/format";
import { StampSticker } from "../components/ui";
import { Roulette, type RouletteCandidate } from "../components/Roulette";
import "../styles/obs.css";

// =====================================================================
// OBS 방송 카드 (1920×1080 투명 배경)
// OBS → 소스 추가 → 브라우저 → URL 에 관리자 페이지의 주소를 붙여넣고 너비 1920, 높이 1080.
// 본문은 절대 표시하지 않습니다.
// =====================================================================

type ObsAnimal = { name: string; emoji: string; why?: string; quote?: string; hashtags?: string[] };

type ObsCard = {
  id: string;
  receipt_no: number;
  name: string;
  age: number | null;
  gender: string | null;
  summary: string;
  stamp: string;
  voice: string;
  category: string;
  animal: ObsAnimal | null;
};

type ObsRoulette = {
  id: string;
  started_at: string;
  duration_ms: number;
  result_index: number;
  candidates: RouletteCandidate[];
};

type ObsState = {
  preset: Preset;
  site_name: string;
  hidden: boolean;
  revealed: boolean;
  roulette: ObsRoulette | null;
  updated_at: string;
  server_time: string;
  card: ObsCard | null;
};

const POLL_MS = 2000;
const STAGE_W = 1920;
const STAGE_H = 1080;
/** 룰렛이 끝난 뒤 이 시간 안에 처음 열렸다면 아직 보여줍니다 */
const ROULETTE_GRACE_MS = 8000;
/** 룰렛이 멈춘 뒤 결과를 잠깐 보여주고 카드로 넘어가는 시간 */
const ROULETTE_HOLD_MS = 1600;
const LEAVE_MS = 450;

const PLAYED_KEY = "dg.obs.playedRoulettes";

function loadPlayed(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(PLAYED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function savePlayed(s: Set<string>) {
  try {
    sessionStorage.setItem(PLAYED_KEY, JSON.stringify([...s].slice(-30)));
  } catch {
    /* noop */
  }
}

/** 화면 크기에 맞춰 1920×1080 무대를 축소/확대합니다. */
function useStageScale() {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return scale;
}

/** 방송 화면이므로 배경을 투명하게 만듭니다. */
function useTransparentPage() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlBg: html.style.background,
      bodyBg: body.style.background,
      bodyShadow: body.style.boxShadow,
      bodyOverflow: body.style.overflow,
    };
    html.style.background = "transparent";
    body.style.background = "transparent";
    body.style.boxShadow = "none";
    body.style.overflow = "hidden";
    html.classList.add("obs-mode");
    return () => {
      html.style.background = prev.htmlBg;
      body.style.background = prev.bodyBg;
      body.style.boxShadow = prev.bodyShadow;
      body.style.overflow = prev.bodyOverflow;
      html.classList.remove("obs-mode");
    };
  }, []);
}

export default function ObsPage() {
  const [params] = useSearchParams();
  const key = params.get("key") ?? "";
  const scale = useStageScale();
  useTransparentPage();

  const [state, setState] = useState<ObsState | null>(null);
  const [badKey, setBadKey] = useState(false);
  const offsetRef = useRef(0); // 서버 시계 - 내 시계 (ms)

  // ------------------------------------------------------------ 상태 가져오기
  useEffect(() => {
    if (!key) {
      setBadKey(true);
      return;
    }
    let stop = false;
    let timer = 0;
    const poll = async () => {
      const t0 = Date.now();
      try {
        const res = await fetch(`${FUNCTIONS_URL}/obs?key=${encodeURIComponent(key)}`, { cache: "no-store" });
        const t1 = Date.now();
        if (res.status === 403) {
          setBadKey(true);
        } else if (res.ok) {
          const data = (await res.json()) as ObsState;
          const server = Date.parse(data.server_time);
          if (Number.isFinite(server)) offsetRef.current = server - (t0 + t1) / 2;
          setBadKey(false);
          setState(data);
        }
        // 그 밖의 오류(네트워크 등)는 마지막 화면을 그대로 둡니다.
      } catch {
        /* 마지막 상태 유지 */
      }
      if (!stop) timer = window.setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [key]);

  useEffect(() => {
    if (state?.preset) applyPreset(state.preset);
  }, [state?.preset]);

  // ------------------------------------------------------------ 룰렛
  const playedRef = useRef<Set<string>>(loadPlayed());
  const [activeRoulette, setActiveRoulette] = useState<(ObsRoulette & { localStart: number }) | null>(null);

  useEffect(() => {
    const r = state?.roulette;
    if (!r || playedRef.current.has(r.id) || activeRoulette?.id === r.id) return;
    const serverStart = Date.parse(r.started_at);
    const serverNow = Date.now() + offsetRef.current;
    if (!Number.isFinite(serverStart) || serverNow > serverStart + r.duration_ms + ROULETTE_GRACE_MS) {
      // 너무 오래된 룰렛은 건너뜁니다 (페이지를 새로 열었을 때 다시 돌지 않게)
      playedRef.current.add(r.id);
      savePlayed(playedRef.current);
      return;
    }
    setActiveRoulette({ ...r, localStart: serverStart - offsetRef.current });
  }, [state?.roulette, activeRoulette?.id]);

  const finishRoulette = () => {
    const id = activeRoulette?.id;
    window.setTimeout(() => {
      if (id) {
        playedRef.current.add(id);
        savePlayed(playedRef.current);
      }
      setActiveRoulette((cur) => (cur?.id === id ? null : cur));
    }, ROULETTE_HOLD_MS);
  };

  // 카드를 숨기면 진행 중인 룰렛도 같이 멈춥니다.
  useEffect(() => {
    if (state && (state.hidden || !state.roulette) && activeRoulette) {
      playedRef.current.add(activeRoulette.id);
      savePlayed(playedRef.current);
      setActiveRoulette(null);
    }
  }, [state, activeRoulette]);

  // ------------------------------------------------------------ 카드 등장/퇴장
  const wantCard = state && !state.hidden && !activeRoulette ? state.card : null;
  const [shown, setShown] = useState<{ card: ObsCard; leaving: boolean } | null>(null);
  const lastAnimal = useRef<Record<string, ObsAnimal>>({});
  if (wantCard?.animal) lastAnimal.current[wantCard.id] = wantCard.animal;

  useEffect(() => {
    if (!shown) {
      if (wantCard) setShown({ card: wantCard, leaving: false });
      return;
    }
    if (wantCard && wantCard.id === shown.card.id) {
      if (shown.leaving || wantCard !== shown.card) setShown({ card: wantCard, leaving: false });
      return;
    }
    if (!shown.leaving) setShown({ ...shown, leaving: true });
    const t = window.setTimeout(() => setShown(wantCard ? { card: wantCard, leaving: false } : null), LEAVE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantCard?.id, wantCard, shown?.card.id, shown?.leaving]);

  const preset: Preset = state?.preset ?? "classic";

  return (
    <div className={`obs-root obs-${preset}`}>
      <div
        className="obs-stage"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
          left: (window.innerWidth - STAGE_W * scale) / 2,
          top: (window.innerHeight - STAGE_H * scale) / 2,
        }}
      >
        {badKey && (
          <div className="obs-error" role="alert">
            OBS 키가 맞지 않아요. 관리자 페이지에서 주소를 다시 복사해 주세요.
          </div>
        )}

        {activeRoulette && (
          <div className="obs-roulette" key={activeRoulette.id}>
            <Roulette
              candidates={activeRoulette.candidates}
              resultIndex={activeRoulette.result_index}
              startedAt={activeRoulette.localStart}
              durationMs={activeRoulette.duration_ms}
              preset={preset}
              big
              onDone={finishRoulette}
            />
          </div>
        )}

        {shown && (
          <ObsStoryCard
            key={shown.card.id}
            card={shown.card}
            animal={shown.card.animal ?? lastAnimal.current[shown.card.id] ?? null}
            revealed={!!state?.revealed && !!shown.card.animal}
            leaving={shown.leaving}
            preset={preset}
            siteName={state?.site_name ?? ""}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 사연 카드
// ---------------------------------------------------------------------

function ObsStoryCard({
  card,
  animal,
  revealed,
  leaving,
  preset,
  siteName,
}: {
  card: ObsCard;
  animal: ObsAnimal | null;
  revealed: boolean;
  leaving: boolean;
  preset: Preset;
  siteName: string;
}) {
  const voiceEmoji = optionEmoji(GOMIN.voices, card.voice);
  const voiceLabel = optionLabel(GOMIN.voices, card.voice);
  const catEmoji = optionEmoji(GOMIN.categories, card.category);
  const catLabel = optionLabel(GOMIN.categories, card.category);
  const who = ageGender(card.age, card.gender);

  return (
    <section className={`obs-card ${leaving ? "is-leaving" : "is-entering"}`} aria-label="지금 읽는 사연">
      {preset === "cork" && <span className="obs-tape" aria-hidden="true" />}
      {preset === "gacha" && (
        <span className="obs-capsule" aria-hidden="true">
          <span className="top" />
          <span className="bottom" />
        </span>
      )}
      <div className="obs-tab display">{preset === "classic" ? "오늘의 고민 사연" : siteName || "오늘의 고민 사연"}</div>

      <div className="obs-card-body">
        <div className="obs-info">
          <div className="obs-meta">
            <span className="obs-chip">
              <span aria-hidden="true">{catEmoji}</span> {catLabel}
            </span>
            <span className="obs-no">사연 #{card.receipt_no}</span>
          </div>
          <h1 className="obs-summary display">{card.summary}</h1>
          <div className="obs-who">
            <strong>{card.name}</strong>
            {who && <span>{who}</span>}
          </div>
          <div className="obs-voice">
            <span className="obs-voice-label">읽어줄 목소리</span>
            <span className="obs-voice-value">
              <span aria-hidden="true">{voiceEmoji}</span> {voiceLabel}
            </span>
          </div>
        </div>

        <div className="obs-stamp">
          <StampSticker stamp={card.stamp} size="lg" />
        </div>

        <div className={`obs-animal ${revealed ? "is-revealed" : ""}`}>
          <div className="obs-animal-inner">
            <div className="obs-animal-face obs-animal-back">
              <span className="obs-q display" aria-hidden="true">
                ?
              </span>
              <span className="obs-animal-title display">고민 동물</span>
              <span className="obs-animal-sub">곧 공개됩니다</span>
            </div>
            <div className="obs-animal-face obs-animal-front">
              {animal && (
                <>
                  <span className="obs-animal-emoji" aria-hidden="true">
                    {animal.emoji}
                  </span>
                  <span className="obs-animal-name display">{animal.name}</span>
                  {animal.why && <span className="obs-animal-why">{animal.why}</span>}
                  {animal.quote && <span className="obs-animal-quote">“{animal.quote}”</span>}
                  {animal.hashtags?.length ? (
                    <span className="obs-animal-tags">
                      {animal.hashtags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </div>
          {revealed && <span className="obs-burst" aria-hidden="true" />}
        </div>
      </div>
    </section>
  );
}
