import React, { useEffect, useState } from "react";
import { continueRender, delayRender, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import tl from "./timeline.json";

// ------------------------------------------------------------------ 색 (사이트 코르크 보드와 같은 값)
export const C = {
  cork: "#e2c49b",
  corkDark: "#b88a58",
  poster: "#fffdf6",
  ink: "#2b2118",
  dim: "#6a5847",
  red: "#e5533d",
  pinRed: "#d9483b",
  tapeY: "rgba(255, 236, 160, 0.9)",
  tapeB: "rgba(190, 225, 245, 0.9)",
  noteY: "#fff1a8",
  noteP: "#ffd2dc",
  noteB: "#cfe9f7",
  noteG: "#d8f0c8",
  noteV: "#e6d9f7",
  noteO: "#ffe0c2",
  marker: "#ffe066",
};

// 사이트와 같은 글꼴: 제목 Bagel Fat One, 본문 Yeon Sung, 손글씨 Nanum Pen Script, 코드 IBM Plex Mono
export const F = {
  hand: "'Nanum Pen Script'",
  body: "'Yeon Sung'",
  display: "'Bagel Fat One'",
  mono: "'IBM Plex Mono', 'Yeon Sung', monospace",
};

// ------------------------------------------------------------------ 글꼴 (영상에 들어가므로 파일로 직접 불러옴)
const FONT_FILES: [string, string, string][] = [
  ["Nanum Pen Script", "fonts/NanumPenScript-Regular.ttf", "400"],
  ["Yeon Sung", "fonts/YeonSung-Regular.ttf", "400"],
  ["Bagel Fat One", "fonts/BagelFatOne-Regular.ttf", "400"],
  ["IBM Plex Mono", "fonts/IBMPlexMono-SemiBold.ttf", "600"],
];

export function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(
      FONT_FILES.map(([family, file, weight]) => {
        const f = new FontFace(family, `url(${staticFile(file)})`, { weight });
        return f.load().then((loaded) => document.fonts.add(loaded));
      }),
    ).then(() => continueRender(handle));
  }, [handle]);
}

// ------------------------------------------------------------------ 움직임 도우미
export const FPS = tl.fps;

/** "탁" 하고 박히는 등장 (위에서 떨어지며 살짝 튕김) */
export function useSlam(at: number, opts: { from?: number; stiffness?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 11, stiffness: opts.stiffness ?? 260, mass: 0.6 } });
  const visible = frame >= at;
  return {
    visible,
    scale: interpolate(s, [0, 1], [opts.from ?? 1.35, 1]),
    y: interpolate(s, [0, 1], [-90, 0]),
    opacity: interpolate(frame - at, [0, 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    // 박힌 뒤 압정 중심으로 살짝 흔들림
    wobble: frame >= at ? Math.sin((frame - at) * 0.9) * 4 * Math.exp(-(frame - at) / 7) : 0,
  };
}

/** 충격 지점에서 화면이 짧게 흔들림 */
export function shakeAt(frame: number, hits: { f: number; power: number }[]) {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = frame - h.f;
    if (d < 0 || d > 10) continue;
    const k = h.power * Math.exp(-d / 2.6);
    x += Math.sin(d * 2.7 + h.f) * k;
    y += Math.cos(d * 3.1 + h.f) * k;
  }
  return { x, y };
}

/** 고민 동물 그림 (사이트와 같은 파일) */
export const Mascot: React.FC<{ id: string; size: number; style?: React.CSSProperties }> = ({ id, size, style }) => (
  <Img src={staticFile(`mascots/${id}.webp`)} style={{ width: size, height: size, objectFit: "contain", display: "block", ...style }} />
);

// ------------------------------------------------------------------ 배경
export const CorkBg: React.FC<{ dim?: number }> = ({ dim = 0 }) => (
  <div
    style={{
      position: "absolute",
      inset: -40,
      backgroundColor: C.cork,
      backgroundImage:
        "radial-gradient(rgba(140, 96, 52, 0.3) 1.6px, transparent 2.4px), radial-gradient(rgba(255, 248, 230, 0.45) 1.4px, transparent 2.2px), radial-gradient(rgba(120, 80, 40, 0.18) 2.4px, transparent 3.4px)",
      backgroundSize: "19px 19px, 31px 31px, 47px 47px",
      backgroundPosition: "0 0, 9px 13px, 21px 5px",
    }}
  >
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(60, 36, 14, 0.35) 100%)" }} />
    {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(30, 20, 10, ${dim})` }} />}
  </div>
);

// ------------------------------------------------------------------ 압정
export const Pin: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 34, style }) => (
  <div
    style={{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: "50%",
      background: "radial-gradient(circle at 34% 30%, #ff9a8a, #d9483b 48%, #9e2c24)",
      boxShadow: "0 7px 6px rgba(0,0,0,0.32)",
      zIndex: 3,
      ...style,
    }}
  />
);

export const Tape: React.FC<{ color?: string; style?: React.CSSProperties }> = ({ color = C.tapeY, style }) => (
  <div style={{ position: "absolute", width: 190, height: 52, background: color, boxShadow: "0 1px 3px rgba(0,0,0,0.12)", zIndex: 3, ...style }} />
);

// ------------------------------------------------------------------ 포스트잇
export const PostIt: React.FC<{
  at: number;
  x: number;
  y: number;
  rot: number;
  color: string;
  text: string;
  size?: number;
  fontSize?: number;
  z?: number;
}> = ({ at, x, y, rot, color, text, size = 400, fontSize = 64, z = 1 }) => {
  const s = useSlam(at);
  if (!s.visible) return null;
  const pin = Math.max(22, size * 0.085);
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        transformOrigin: "50% 0%",
        transform: `translateY(${s.y}px) scale(${s.scale}) rotate(${rot + s.wobble}deg)`,
        opacity: s.opacity,
        zIndex: z,
      }}
    >
      <Pin size={pin} style={{ left: size / 2 - pin / 2, top: -pin * 0.35 }} />
      <div
        style={{
          width: "100%",
          height: "100%",
          background: color,
          boxShadow: "0 18px 22px -8px rgba(60, 36, 14, 0.45), 0 2px 0 rgba(0,0,0,0.05)",
          padding: `${size * 0.17}px ${size * 0.1}px ${size * 0.07}px`,
          boxSizing: "border-box",
          fontFamily: F.hand,
          fontSize,
          lineHeight: 1.08,
          color: C.ink,
          whiteSpace: "pre-line",
          wordBreak: "keep-all",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ 자막 (종이 띠 + 형광펜)
export type Seg = { t: string; hl?: boolean };

export const Caption: React.FC<{ at: number; segs: Seg[]; y: number; size?: number; rot?: number; out?: number }> = ({
  at,
  segs,
  y,
  size = 84,
  rot = -2,
  out,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const s = spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 320, mass: 0.5 } });
  const hl = interpolate(frame - at, [3, 9], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outP = out !== undefined ? interpolate(frame, [out, out + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        display: "flex",
        justifyContent: "center",
        transform: `scale(${interpolate(s, [0, 1], [0.7, 1]) * (1 - outP * 0.15)}) rotate(${rot}deg)`,
        opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }) * (1 - outP),
        zIndex: 20,
      }}
    >
      <div
        style={{
          background: C.poster,
          padding: "22px 40px 26px",
          boxShadow: "0 16px 26px -10px rgba(60, 36, 14, 0.55)",
          fontFamily: F.display,
          fontWeight: 400,
          fontSize: size,
          letterSpacing: "-0.035em",
          color: C.ink,
          whiteSpace: "nowrap",
        }}
      >
        {segs.map((sg, i) =>
          sg.hl ? (
            <span
              key={i}
              style={{
                backgroundImage: `linear-gradient(${C.marker}, ${C.marker})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: `${hl}% 46%`,
                backgroundPosition: "0 82%",
              }}
            >
              {sg.t}
            </span>
          ) : (
            <span key={i}>{sg.t}</span>
          ),
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ 폴라로이드 (고민 동물 카드)
export type AnimalInfo = { id: string; name: string; quote: string; bg: string };

export const Polaroid: React.FC<{
  animal: AnimalInfo | null;
  width?: number;
  develop?: number; // 0 = 막 찍힘(하얗고 흐림), 1 = 선명
  tape?: boolean;
  tapeAt?: number;
}> = ({ animal, width = 620, develop = 1, tape = false, tapeAt = 0 }) => {
  const frame = useCurrentFrame();
  const photo = width - 64;
  const tapeS = tape ? interpolate(frame - tapeAt, [0, 4], [1.25, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const tapeO = tape ? interpolate(frame - tapeAt, [0, 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return (
    <div
      style={{
        position: "relative",
        width,
        background: "#fffefb",
        padding: "32px 32px 0",
        boxSizing: "border-box",
        boxShadow: "0 30px 40px -14px rgba(50, 30, 10, 0.55), 0 2px 0 rgba(0,0,0,0.06)",
      }}
    >
      {tape && (
        <>
          <Tape color={C.tapeY} style={{ left: -40, top: -18, transform: `rotate(-24deg) scale(${tapeS})`, opacity: tapeO }} />
          <Tape color={C.tapeB} style={{ right: -40, top: -18, transform: `rotate(22deg) scale(${tapeS})`, opacity: tapeO }} />
        </>
      )}
      <div
        style={{
          width: photo,
          height: photo,
          background: animal ? animal.bg : "#cdb38c",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {animal ? (
          <Mascot
            id={animal.id}
            size={photo * 0.8}
            style={{ filter: `blur(${(1 - develop) * 22}px) brightness(${1 + (1 - develop) * 0.9}) saturate(${0.3 + develop * 0.7}) drop-shadow(0 8px 6px rgba(60, 36, 14, 0.22))` }}
          />
        ) : (
          <span style={{ fontFamily: F.display, fontWeight: 400, fontSize: photo * 0.62, color: C.ink, opacity: 0.85, lineHeight: 1 }}>?</span>
        )}
        <div style={{ position: "absolute", inset: 0, background: "#fffefb", opacity: (1 - develop) * 0.85 }} />
      </div>
      <div style={{ padding: "26px 8px 34px", textAlign: "center", minHeight: 170, boxSizing: "border-box" }}>
        {animal ? (
          <>
            <div style={{ fontFamily: F.body, fontSize: width * 0.12, color: C.ink, letterSpacing: "-0.02em", opacity: develop }}>{animal.name}</div>
            <div style={{ fontFamily: F.hand, fontSize: width * 0.078, color: C.red, marginTop: 6, opacity: develop }}>{animal.quote}</div>
          </>
        ) : (
          <div style={{ fontFamily: F.hand, fontSize: width * 0.1, color: C.dim }}>다음은 네 차례</div>
        )}
      </div>
    </div>
  );
};

/** 뒤집힌 폴라로이드 뒷면 */
export const PolaroidBack: React.FC<{ width?: number }> = ({ width = 620 }) => (
  <div
    style={{
      width,
      height: width + 170 - 32,
      background: "#efe4cf",
      backgroundImage: "repeating-linear-gradient(45deg, rgba(120,90,50,0.07) 0 6px, transparent 6px 14px)",
      boxShadow: "0 30px 40px -14px rgba(50, 30, 10, 0.55)",
      display: "grid",
      placeItems: "center",
    }}
  >
    <div style={{ textAlign: "center", color: C.dim }}>
      <div style={{ fontFamily: F.display, fontWeight: 400, fontSize: 230, lineHeight: 1, color: "rgba(43,33,24,0.18)" }}>?</div>
      <div style={{ fontFamily: F.body, fontSize: 54, marginTop: 20 }}>고민 동물 현상 중</div>
    </div>
  </div>
);
