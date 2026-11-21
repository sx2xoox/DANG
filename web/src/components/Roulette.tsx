import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { StampSticker } from "./ui";
import type { Preset } from "../lib/site";

export type RouletteCandidate = { id: string; name: string; summary: string; stamp: string };

type Props = {
  candidates: RouletteCandidate[];
  resultIndex: number;
  /** 시작 시각 (이 브라우저 시계 기준 ms) */
  startedAt: number;
  durationMs: number;
  preset: Preset;
  big?: boolean;
  onDone?: () => void;
};

const CAP_COLORS: Record<string, string> = {
  unfair: "#F59E0B",
  angry: "#E11D2E",
  flutter: "#EC4899",
  worry: "#2563EB",
  panic: "#8B5CF6",
  hyeonta: "#14B8A6",
  sad: "#64748B",
};

function capColor(stamp: string): string {
  return CAP_COLORS[stamp] ?? "#FFD400";
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** 룰렛: 후보 사이를 빠르게 옮겨 다니다가 점점 느려지며 결과에서 멈춥니다. */
export function Roulette({ candidates, resultIndex, startedAt, durationMs, preset, big = false, onDone }: Props) {
  const n = candidates.length;
  const safeResult = n ? Math.min(Math.max(0, resultIndex), n - 1) : 0;
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!n) return;
    const reduced = prefersReducedMotion();
    // 움직임 줄이기 설정이면 한 바퀴만 천천히 돕니다.
    const totalSteps = (reduced ? n : n * 4) + safeResult;
    doneRef.current = false;
    setDone(false);
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, Math.max(0, (Date.now() - startedAt) / durationMs));
      const eased = 1 - Math.pow(1 - p, 3);
      setStep(Math.min(totalSteps, Math.floor(eased * totalSteps)));
      if (p >= 1) {
        setStep(totalSteps);
        if (!doneRef.current) {
          doneRef.current = true;
          setDone(true);
          onDoneRef.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAt, durationMs, n, safeResult]);

  if (!n) return null;
  const idx = done ? safeResult : step % n;
  const winner = candidates[safeResult];
  const cls = `rl rl-${preset} ${big ? "rl-big" : ""} ${done ? "is-done" : "is-spinning"}`;
  const announce = done ? <p className="sr-only">뽑힌 사연: {winner.summary}</p> : null;

  if (preset === "cork") {
    return <CorkDraw candidates={candidates} idx={idx} done={done} result={safeResult} cls={cls} announce={announce} />;
  }

  if (preset === "gacha") {
    const cur = candidates[idx];
    return (
      <div className={cls} aria-live="polite">
        <div className="rl-machine">
          <div className="rl-dome">
            {candidates.map((c, i) => (
              <span
                key={c.id + i}
                className={`rl-cap ${i === idx && !done ? "is-on" : ""} ${done && i === safeResult ? "is-gone" : ""}`}
                style={{
                  ["--x" as string]: `${12 + ((i * 53) % 68)}%`,
                  ["--y" as string]: `${30 + ((i * 29) % 48)}%`,
                  ["--c" as string]: capColor(c.stamp),
                  ["--d" as string]: `${(i % 5) * 0.07}s`,
                }}
              />
            ))}
            <span className="rl-shine" aria-hidden="true" />
          </div>
          <div className="rl-neck" aria-hidden="true" />
          <div className="rl-base">
            <span className="rl-label display" aria-hidden="true">
              사연 캡슐
            </span>
            <span className={`rl-knob ${done ? "" : "is-turning"}`} aria-hidden="true" />
            <span className="rl-outlet" aria-hidden="true">
              {done && <span className="rl-drop" style={{ ["--c" as string]: capColor(winner.stamp) }} />}
            </span>
          </div>
        </div>
        <div className={`rl-result ${done ? "is-open" : ""}`}>
          {done ? (
            <>
              <span className="rl-cap-split" style={{ ["--c" as string]: capColor(winner.stamp) }} aria-hidden="true">
                <span className="top" />
                <span className="bottom" />
              </span>
              <div className="rl-result-text">
                <StampSticker stamp={winner.stamp} size={big ? "md" : "sm"} />
                <strong>{winner.summary}</strong>
                <span>{winner.name}</span>
              </div>
            </>
          ) : (
            <div className="rl-result-text rl-waiting">
              <strong>두근두근…</strong>
              <span>{cur.summary}</span>
            </div>
          )}
        </div>
        {announce}
      </div>
    );
  }

  // classic: 슬롯 머신
  const windowIdx = [-2, -1, 0, 1, 2].map((d) => (idx + d + n * 10) % n);
  const bulbs = Array.from({ length: big ? 22 : 12 });
  return (
    <div className={cls} aria-live="polite">
      <div className="rl-cabinet">
        <div className="rl-marquee">
          <div className="rl-bulbs" aria-hidden="true">
            {bulbs.map((_, i) => (
              <span key={i} style={{ ["--i" as string]: i }} />
            ))}
          </div>
          <div className="rl-title display">사연 룰렛</div>
        </div>
        <div className="rl-slot">
          {windowIdx.map((ci, k) => {
            const c = candidates[ci];
            return (
              <div key={k === 2 ? `c-${step}` : k} className={`rl-row ${k === 2 ? "is-center" : ""} ${Math.abs(k - 2) === 2 ? "is-edge" : ""}`}>
                <StampSticker stamp={c.stamp} size="sm" />
                <span className="rl-sum">{c.summary}</span>
                <span className="rl-name">{c.name}</span>
              </div>
            );
          })}
          <div className="rl-frame" aria-hidden="true">
            <span className="rl-arrow left" />
            <span className="rl-arrow right" />
          </div>
        </div>
        <div className="rl-bulbs bottom" aria-hidden="true">
          {bulbs.map((_, i) => (
            <span key={i} style={{ ["--i" as string]: i }} />
          ))}
        </div>
      </div>
      {announce}
    </div>
  );
}

/**
 * 코르크 보드 뽑기: 내용을 가린 "?" 쪽지가 붙어 있고, 불빛이 쪽지 사이를 옮겨 다니다 멈추면
 * 그 쪽지가 압정에서 떨어져 가운데로 나와 뒤집히며 사연이 보여요.
 */
function CorkDraw({
  candidates,
  idx,
  done,
  result,
  cls,
  announce,
}: {
  candidates: RouletteCandidate[];
  idx: number;
  done: boolean;
  result: number;
  cls: string;
  announce: ReactNode;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const winRef = useRef<HTMLDivElement>(null);
  const [move, setMove] = useState<{ dx: number; dy: number } | null>(null);

  // 뽑힌 쪽지가 보드 가운데로 오도록 거리를 재요 (화면 배율과 상관없는 레이아웃 값으로)
  useLayoutEffect(() => {
    if (!done) {
      setMove(null);
      return;
    }
    const grid = gridRef.current;
    const el = winRef.current;
    if (!grid || !el) return;
    setMove({
      dx: grid.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2),
      dy: grid.clientHeight / 2 - (el.offsetTop + el.offsetHeight / 2),
    });
  }, [done]);

  const winner = candidates[result];
  return (
    <div className={`${cls} rl-draw`} aria-live="polite">
      <div className="rl-board">
        <div className="rl-board-title display" aria-hidden="true">
          오늘의 고민 쪽지 뽑기
        </div>
        <div className="rl-board-grid" ref={gridRef}>
          {candidates.map((c, i) => {
            const isWin = done && i === result;
            return (
              <div
                key={c.id + i}
                ref={i === result ? winRef : undefined}
                className={`rl-note ${!done && i === idx ? "is-on" : ""} ${isWin && move ? "is-pulled" : ""} ${done && !isWin ? "is-dim" : ""}`}
                style={{
                  ["--r" as string]: `${((i * 37) % 9) - 4}deg`,
                  ["--dx" as string]: `${move?.dx ?? 0}px`,
                  ["--dy" as string]: `${move?.dy ?? 0}px`,
                }}
                aria-hidden={!isWin}
              >
                <span className="rl-pin" aria-hidden="true" />
                <div className="rl-note-inner">
                  <div className="rl-face rl-front" aria-hidden="true">
                    ?
                  </div>
                  <div className="rl-face rl-back">
                    {isWin && (
                      <>
                        <StampSticker stamp={winner.stamp} size="sm" />
                        <span className="rl-sum">{winner.summary}</span>
                        <span className="rl-name">{winner.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {announce}
    </div>
  );
}
