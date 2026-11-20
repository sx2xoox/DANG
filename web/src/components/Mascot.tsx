import type { CSSProperties } from "react";
import { mascotFor, type Mascot as MascotInfo, type MascotMood } from "@shared/mascots.ts";

export function mascotSrc(m: MascotInfo): string {
  return `/mascots/${m.id}.webp`;
}

type Props = {
  /** 고민 동물 이름 ("곱씹는 라쿤"). 그림을 고를 때 써요 */
  name?: string | null;
  /** 그림 대신 직접 고를 때 (도안 화면) */
  mascot?: MascotInfo | null;
  /** 그림이 없을 때 보여줄 이모지 */
  emoji?: string | null;
  mood?: MascotMood;
  golden?: boolean;
  /** 아직 못 모은 칸: 그림자만 */
  silhouette?: boolean;
  /** 표정 기호와 움직임을 끌 때 (작은 목록 등) */
  still?: boolean;
  size?: number | string;
  className?: string;
};

/**
 * 고민 동물 캐릭터. 그림이 있으면 그림 + 표정 기호, 없으면 이모지.
 * 표정은 그림 위에 얹는 기호(눈물·하트·!? 등)와 움직임으로 만들어요.
 */
export function Mascot({ name, mascot, emoji, mood = "basic", golden = false, silhouette = false, still = false, size, className = "" }: Props) {
  const m = mascot ?? mascotFor(name);
  const style = size !== undefined ? ({ ["--m-size" as string]: typeof size === "number" ? `${size}px` : size } as CSSProperties) : undefined;
  if (!m) {
    return (
      <span className={`mascot mascot-emoji ${silhouette ? "is-silhouette" : ""} ${className}`} style={style} aria-hidden="true">
        <span className="mascot-emoji-char">{emoji}</span>
      </span>
    );
  }
  const moodClass = silhouette || still ? "" : `mood-${mood}`;
  return (
    <span
      className={`mascot ${moodClass} ${golden ? "is-golden" : ""} ${silhouette ? "is-silhouette" : ""} ${className}`}
      style={style}
      aria-hidden="true"
    >
      <span className="mascot-body">
        <img src={mascotSrc(m)} alt="" draggable={false} decoding="async" />
      </span>
      {!silhouette && !still && <MoodMarks mood={mood} />}
      {golden && !silhouette && <Sparkles gold />}
    </span>
  );
}

const INK = "#5a3d28";

function Sparkle({ x, y, s = 1, fill = "#FFD54A", d = 0 }: { x: number; y: number; s?: number; fill?: string; d?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="mk-twinkle"
        style={{ animationDelay: `${d}s` }}
        d="M0 -8 C1 -2 2 -1 8 0 C2 1 1 2 0 8 C-1 2 -2 1 -8 0 C-2 -1 -1 -2 0 -8Z"
        fill={fill}
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </g>
  );
}

function Sparkles({ gold = false }: { gold?: boolean }) {
  const f = gold ? "#FFE27A" : "#FFD54A";
  return (
    <svg className="mascot-marks" viewBox="0 0 100 100">
      <Sparkle x={12} y={26} s={0.9} fill={f} />
      <Sparkle x={88} y={18} s={1.1} fill={f} d={0.5} />
      <Sparkle x={91} y={58} s={0.7} fill={f} d={1} />
    </svg>
  );
}

function Heart({ x, y, s = 1, d = 0 }: { x: number; y: number; s?: number; d?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="mk-float"
        style={{ animationDelay: `${d}s` }}
        d="M0 6 C-9 0 -8 -7 -3.5 -7 C-1.5 -7 -0.3 -5.5 0 -4.5 C0.3 -5.5 1.5 -7 3.5 -7 C8 -7 9 0 0 6Z"
        fill="#FF9EB5"
        stroke={INK}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </g>
  );
}

function Drop({ x, y, s = 1, d = 0, fill = "#A9DBF7" }: { x: number; y: number; s?: number; d?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="mk-drip"
        style={{ animationDelay: `${d}s` }}
        d="M0 -6 C2.5 -2 4.5 0.5 4.5 2.8 C4.5 5.3 2.5 7 0 7 C-2.5 7 -4.5 5.3 -4.5 2.8 C-4.5 0.5 -2.5 -2 0 -6Z"
        fill={fill}
        stroke={INK}
        strokeWidth="1.3"
      />
    </g>
  );
}

function MoodMarks({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case "cheer":
      return (
        <svg className="mascot-marks" viewBox="0 0 100 100">
          {/* 신나는 빗금 */}
          <g stroke="#F6B73C" strokeWidth="2.6" strokeLinecap="round" className="mk-pulse">
            <path d="M10 12 L15 18" />
            <path d="M5 22 L12 24" />
            <path d="M18 6 L20 13" />
          </g>
          <Sparkle x={88} y={16} s={1.1} />
          <Sparkle x={92} y={50} s={0.75} d={0.6} />
          <Sparkle x={8} y={52} s={0.6} d={1.1} />
        </svg>
      );
    case "sad":
      return (
        <svg className="mascot-marks" viewBox="0 0 100 100">
          <Drop x={14} y={38} s={0.9} />
          <Drop x={87} y={34} s={1} d={0.8} />
          <Drop x={10} y={60} s={0.6} d={1.5} />
        </svg>
      );
    case "love":
      return (
        <svg className="mascot-marks" viewBox="0 0 100 100">
          <Heart x={86} y={20} s={1.1} />
          <Heart x={92} y={44} s={0.7} d={0.7} />
          <Heart x={12} y={24} s={0.8} d={1.3} />
        </svg>
      );
    case "worry":
      return (
        <svg className="mascot-marks" viewBox="0 0 100 100">
          {/* 머리 위 엉킨 실타래 */}
          <path
            className="mk-spin"
            d="M86 16 c-6 -1 -9 4 -6 8 c3 4 10 2 10 -3 c0 -6 -9 -9 -14 -4 c-5 5 -2 13 5 14 c6 1 11 -2 12 -6"
            fill="none"
            stroke={INK}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <Drop x={14} y={30} s={0.8} />
        </svg>
      );
    case "surprise":
      return (
        <svg className="mascot-marks" viewBox="0 0 100 100">
          <g className="mk-pop" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" fill="#FFD54A">
            <path d="M80 4 L86 4 L84.5 19 L81.5 19Z" />
            <circle cx="83" cy="24" r="2.6" />
            <path d="M89 8 c0 -5 9 -5 9 0.5 c0 4 -5 4 -5 8.5 l-3 0 c0 -6 5 -6 5 -8.5 c0 -2.5 -3.4 -2.5 -3.4 0Z" />
            <circle cx="91.5" cy="22" r="2.2" />
          </g>
          <g stroke="#F6B73C" strokeWidth="2.4" strokeLinecap="round">
            <path d="M8 14 L14 20" />
            <path d="M4 26 L11 27" />
          </g>
        </svg>
      );
    case "angry":
      return (
        <svg className="mascot-marks" viewBox="0 0 100 100">
          {/* 핏줄 표시 */}
          <g className="mk-pulse" stroke="#E5533D" strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M80 10 q4 4 0 8" />
            <path d="M90 10 q-4 4 0 8" />
            <path d="M81 9 q4 -4 8 0" />
            <path d="M81 19 q4 4 8 0" />
          </g>
          {/* 김 */}
          <g className="mk-float" fill="#fff" stroke={INK} strokeWidth="1.3">
            <path d="M6 30 c-3 0 -3 -5 0 -5 c0 -3 5 -3 5 0 c3 0 3 5 0 5Z" />
            <path d="M14 20 c-2 0 -2 -4 0 -4 c0 -2 4 -2 4 0 c2 0 2 4 0 4Z" />
          </g>
        </svg>
      );
    case "dazed":
      return (
        <svg className="mascot-marks" viewBox="0 0 100 100">
          <g fill={INK} className="mk-dots">
            <circle cx="80" cy="14" r="2" />
            <circle cx="87" cy="14" r="2" />
            <circle cx="94" cy="14" r="2" />
          </g>
          <Drop x={14} y={28} s={0.85} fill="#CFEFF0" />
        </svg>
      );
    case "sleepy":
      return (
        <svg className="mascot-marks" viewBox="0 0 100 100">
          <g fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path className="mk-float" d="M78 20 h7 l-7 8 h7" />
            <path className="mk-float" style={{ animationDelay: "0.6s" }} d="M88 8 h5 l-5 6 h5" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}
