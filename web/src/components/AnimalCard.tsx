import { forwardRef, useState } from "react";
import { GOMIN } from "@shared/boxes.ts";
import { siteHost } from "../lib/growth";
import { moodFromStamp } from "@shared/mascots.ts";
import { Mascot } from "./Mascot";

export type Animal = {
  name: string;
  emoji: string;
  why?: string | null;
  description?: string | null;
  quote?: string | null;
  hashtags?: string[] | null;
  prev_name?: string | null;
  prev_emoji?: string | null;
  change_reason?: string | null;
};

type Props = {
  animal: Animal | null;
  /** 앞면(동물)이 보이는지. false 면 물음표 실루엣 */
  revealed: boolean;
  /** 뒷면을 눌렀을 때 */
  onReveal?: () => void;
  serial?: number | string;
  stamp?: string;
  date?: string;
  siteName?: string;
  compact?: boolean;
  /** 뒷면에 보여줄 안내 문구 */
  mysteryText?: string;
  /** 방송에서 읽힌 사연이면 "방송에서 읽혔어요" 도장 */
  aired?: boolean;
  /** 상담 후기를 남겼으면 "후기 남김" 도장 */
  reviewed?: boolean;
  /** 황금 동물 */
  golden?: boolean;
};

/** 트레이딩 카드처럼 생긴 고민 동물 카드. 뒤집히며 공개됩니다. */
export const AnimalCard = forwardRef<HTMLDivElement, Props>(function AnimalCard(
  { animal, revealed, onReveal, serial, stamp, date, siteName, compact = false, mysteryText, aired = false, reviewed = false, golden = false },
  ref,
) {
  const color = GOMIN.stamps.find((s) => s.id === stamp)?.color ?? "#FFD400";
  const canFlip = !!onReveal && !revealed;
  const back = (
    <div className="tc-face tc-back">
      <div className="tc-back-pattern" aria-hidden="true" />
      <div className="tc-mystery" aria-hidden="true">
        <svg viewBox="0 0 120 120" width={compact ? 70 : 120} height={compact ? 70 : 120}>
          <circle cx="60" cy="60" r="56" fill="rgba(255,255,255,0.06)" stroke="rgba(255,212,0,0.6)" strokeWidth="3" strokeDasharray="6 8" />
          <text x="60" y="80" textAnchor="middle" fontSize="64" fontFamily="Jua, sans-serif" fill="#FFD400">
            ?
          </text>
        </svg>
      </div>
      <div className="tc-back-title display">고민 동물</div>
      <div className="tc-back-sub">{mysteryText ?? (canFlip ? "눌러서 공개하기" : "두근두근…")}</div>
    </div>
  );

  return (
    <div
      ref={ref}
      className={`tc ${compact ? "tc-compact" : ""} ${revealed ? "is-revealed" : ""} ${golden ? "tc-golden" : ""}`}
      style={{ ["--tc-accent" as string]: color }}
    >
      {canFlip ? (
        <button type="button" className="tc-inner tc-button" onClick={onReveal} aria-label="고민 동물 카드 뒤집어서 공개하기">
          {back}
          <div className="tc-face tc-front" aria-hidden="true" />
        </button>
      ) : (
        <div className="tc-inner">
          {back}
          <div className="tc-face tc-front">
            {animal && (
              <>
                <div className="tc-top">
                  <span>{golden ? (compact ? "★ 황금" : "★ 황금 고민 동물 ★") : compact ? "고민 동물" : "고민 동물 도감"}</span>
                  {serial !== undefined && <span>No.{String(serial).padStart(3, "0")}</span>}
                </div>
                <div className="tc-window">
                  <Mascot name={animal.name} emoji={animal.emoji} mood={moodFromStamp(stamp)} golden={golden} className="tc-mascot" />
                  {(aired || reviewed) && (
                    <span className="tc-marks">
                      {aired && <span className="tc-mark tc-mark-aired">방송에서 읽혔어요</span>}
                      {reviewed && <span className="tc-mark tc-mark-review">후기 남김</span>}
                    </span>
                  )}
                </div>
                <h3 className="tc-name display">{animal.name}</h3>
                {animal.why && <p className="tc-why">{animal.why}</p>}
                {!compact && animal.description && <p className="tc-desc">{animal.description}</p>}
                {animal.quote && (
                  <p className="tc-quote">
                    <span aria-hidden="true">“</span>
                    {animal.quote}
                    <span aria-hidden="true">”</span>
                  </p>
                )}
                {animal.hashtags?.length ? (
                  <div className="tc-tags">
                    {animal.hashtags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                ) : null}
                <div className="tc-foot">
                  {/* 공유 이미지에 사이트 주소가 찍혀요 (주소가 없으면 사이트 이름) */}
                  <span className={siteHost() ? "tc-addr" : undefined}>{siteHost() || siteName || "다웅 고민 사연함"}</span>
                  {date && <span>{date}</span>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

/** 카드를 처음 열 때 뒤집히는 연출을 관리합니다 (한 번 본 카드는 바로 보임) */
export function useRevealOnce(key: string | null) {
  const storageKey = key ? `dg.seen.${key}` : null;
  const [revealed, setRevealed] = useState(() => {
    if (!storageKey) return false;
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const reveal = () => {
    setRevealed(true);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "1");
      } catch {
        /* noop */
      }
    }
  };
  return { revealed, reveal };
}
