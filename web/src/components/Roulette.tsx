import { useEffect, useRef, useState } from "react";
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
    return (
      <div className={cls} aria-live="polite">
        <div className="rl-board">
          <div className="rl-board-title display" aria-hidden="true">
            오늘의 사연 뽑기
          </div>
          <div className="rl-board-grid">
            {candidates.map((c, i) => (
              <div
                key={c.id + i}
                className={`rl-note ${i === idx ? "is-on" : ""} ${done && i === safeResult ? "is-win" : ""} ${done && i !== safeResult ? "is-dim" : ""}`}
                style={{ ["--r" as string]: `${((i * 37) % 9) - 4}deg` }}
              >
                <span className="rl-pin" aria-hidden="true" />
                <StampSticker stamp={c.stamp} size="sm" />
                <span className="rl-sum">{c.summary}</span>
                <span className="rl-name">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
        {announce}
      </div>
    );
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
