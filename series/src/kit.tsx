import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// =====================================================================
// 시리즈 쇼츠 공통 재료 (사이트 코르크 보드와 같은 색·글꼴·고민 동물 그림)
//  * 화면 1080 × 1920, 30fps
//  * 인스타·유튜브 버튼에 가리지 않게 중요한 글씨는 위 200px ~ 아래 1560px, 오른쪽 140px 안쪽에 둬요.
// =====================================================================

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const SITE = "dawoong-gomin.pages.dev";

export const C = {
  cork: "#e2c49b",
  poster: "#fffdf6",
  ink: "#2b2118",
  dim: "#6a5847",
  red: "#e5533d",
  blue: "#2f7fd1",
  tapeY: "rgba(255, 236, 160, 0.92)",
  tapeB: "rgba(190, 225, 245, 0.92)",
  noteY: "#fff1a8",
  noteP: "#ffd2dc",
  noteB: "#cfe9f7",
  noteG: "#d8f0c8",
  noteV: "#e6d9f7",
  noteO: "#ffe0c2",
  marker: "#ffe066",
};

export const F = {
  title: "'Bagel Fat One'",
  body: "'Yeon Sung'",
  hand: "'Nanum Pen Script'",
  mono: "'IBM Plex Mono', monospace",
};

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
      FONT_FILES.map(([family, file, weight]) =>
        new FontFace(family, `url(${staticFile(file)})`, { weight }).load().then(
          (f) => void document.fonts.add(f),
          () => undefined,
        ),
      ),
    ).then(() => continueRender(handle));
  }, [handle]);
}

// ------------------------------------------------------------------ 움직임
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** at 프레임에 "톡" 하고 나타나는 정도 (0 → 1). at 이 0 이하면 첫 화면부터 다 나와 있어요. */
export function useIn(at: number, stiffness = 240) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (at <= 0) return { p: 1, o: 1, shown: true, t: frame - at };
  const p = spring({ frame: frame - at, fps, config: { damping: 12, stiffness, mass: 0.6 } });
  return { p, o: interpolate(frame - at, [0, 3], [0, 1], clamp), shown: frame >= at, t: frame - at };
}

/** from~to 구간에서 사라지는 정도 (1 → 0) */
export function useOut(from: number, len = 8) {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, from + len], [1, 0], clamp);
}

/** 화면 흔들림 (강조 순간) */
export function shake(frame: number, hits: number[], power = 10) {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const d = frame - h;
    if (d < 0 || d > 10) continue;
    const k = power * Math.exp(-d / 2.6);
    x += Math.sin(d * 2.7 + h) * k;
    y += Math.cos(d * 3.1 + h) * k;
  }
  return `translate(${x}px, ${y}px)`;
}

export const Pop: React.FC<{ at: number; from?: number; rot?: number; y?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  from = 1.3,
  rot = 0,
  y = -60,
  style,
  children,
}) => {
  const a = useIn(at);
  if (!a.shown) return null;
  const s = interpolate(a.p, [0, 1], [from, 1]);
  const ty = interpolate(a.p, [0, 1], [y, 0]);
  const wob = at > 0 && a.t >= 0 ? Math.sin(a.t * 0.9) * 3 * Math.exp(-a.t / 7) : 0;
  return <div style={{ transform: `translateY(${ty}px) scale(${s}) rotate(${rot + wob}deg)`, opacity: a.o, ...style }}>{children}</div>;
};

// ------------------------------------------------------------------ 재료
export const CorkBg: React.FC<{ dim?: number }> = ({ dim = 0 }) => (
  <AbsoluteFill
    style={{
      backgroundColor: C.cork,
      backgroundImage:
        "radial-gradient(rgba(140, 96, 52, 0.3) 1.6px, transparent 2.4px), radial-gradient(rgba(255, 248, 230, 0.45) 1.4px, transparent 2.2px), radial-gradient(rgba(120, 80, 40, 0.18) 2.4px, transparent 3.4px)",
      backgroundSize: "19px 19px, 31px 31px, 47px 47px",
      backgroundPosition: "0 0, 9px 13px, 21px 5px",
    }}
  >
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(60, 36, 14, 0.35) 100%)" }} />
    {dim > 0 && <AbsoluteFill style={{ background: `rgba(30, 20, 10, ${dim})` }} />}
  </AbsoluteFill>
);

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

export const Mascot: React.FC<{ id: string; size: number; style?: React.CSSProperties }> = ({ id, size, style }) => (
  <Img
    src={staticFile(`mascots/${id}.webp`)}
    style={{
      width: size,
      height: size,
      objectFit: "contain",
      display: "block",
      filter: "drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(0 14px 10px rgba(40,22,8,.3))",
      ...style,
    }}
  />
);

/** 종이 띠 제목 (형광펜 강조 가능: [[강조]] 로 감싸기) */
export const Headline: React.FC<{ text: string; size?: number; rot?: number; width?: number; style?: React.CSSProperties }> = ({
  text,
  size = 84,
  rot = -1.5,
  width = 900,
  style,
}) => {
  const parts = text.split(/(\[\[.*?\]\])/g).filter(Boolean);
  return (
    <div
      style={{
        maxWidth: width,
        margin: "0 auto",
        background: C.poster,
        padding: "26px 40px 30px",
        boxShadow: "0 18px 28px -12px rgba(60, 36, 14, 0.55)",
        transform: `rotate(${rot}deg)`,
        fontFamily: F.title,
        fontSize: size,
        lineHeight: 1.18,
        color: C.ink,
        textAlign: "center",
        wordBreak: "keep-all",
        whiteSpace: "pre-line",
        position: "relative",
        ...style,
      }}
    >
      <Tape style={{ left: 30, top: -24, transform: "rotate(-5deg)", width: 160 }} />
      <Tape color={C.tapeB} style={{ right: 30, top: -22, transform: "rotate(4deg)", width: 160 }} />
      {parts.map((p, i) =>
        p.startsWith("[[") ? (
          <span key={i} style={{ background: `linear-gradient(transparent 58%, ${C.marker} 58%, ${C.marker} 92%, transparent 92%)`, padding: "0 6px" }}>
            {p.slice(2, -2)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
};

/** 압정 꽂힌 포스트잇 */
export const Note: React.FC<{ color: string; width: number; height?: number; size?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  color,
  width,
  height,
  size = 62,
  children,
  style,
}) => (
  <div
    style={{
      position: "relative",
      width,
      minHeight: height,
      background: color,
      boxShadow: "0 18px 22px -8px rgba(60, 36, 14, 0.45)",
      padding: "56px 40px 36px",
      boxSizing: "border-box",
      fontFamily: F.hand,
      fontSize: size,
      lineHeight: 1.1,
      color: C.ink,
      whiteSpace: "pre-line",
      wordBreak: "keep-all",
      ...style,
    }}
  >
    <Pin size={36} style={{ left: width / 2 - 18, top: 10 }} />
    {children}
  </div>
);

/** 채팅 말풍선 */
export const Bubble: React.FC<{ color?: string; size?: number; children: React.ReactNode; tail?: "l" | "r" }> = ({ color = C.poster, size = 52, children, tail = "l" }) => (
  <div
    style={{
      position: "relative",
      display: "inline-block",
      padding: "18px 34px 22px",
      borderRadius: 40,
      background: color,
      border: `5px solid ${C.ink}`,
      boxShadow: `7px 8px 0 rgba(43, 33, 24, 0.85)`,
      fontFamily: F.body,
      fontSize: size,
      lineHeight: 1,
      color: C.ink,
      whiteSpace: "nowrap",
    }}
  >
    {children}
    <div
      style={{
        position: "absolute",
        bottom: -22,
        [tail === "l" ? "left" : "right"]: 44,
        width: 30,
        height: 30,
        background: color,
        borderRight: `5px solid ${C.ink}`,
        borderBottom: `5px solid ${C.ink}`,
        transform: `rotate(45deg) skew(${tail === "l" ? 12 : -12}deg)`,
      }}
    />
  </div>
);

/** 폴라로이드 고민 동물 카드. develop: 0 = 흐림, 1 = 선명 */
export const Polaroid: React.FC<{ id: string | null; name?: string; quote?: string; width?: number; develop?: number; bg?: string }> = ({
  id,
  name,
  quote,
  width = 640,
  develop = 1,
  bg = "#d6e9f5",
}) => {
  const photo = width - 64;
  return (
    <div style={{ width, background: "#fffefb", padding: "32px 32px 0", boxSizing: "border-box", boxShadow: "0 30px 40px -14px rgba(50, 30, 10, 0.55)", position: "relative" }}>
      <Tape style={{ left: -36, top: -16, transform: "rotate(-22deg)" }} />
      <Tape color={C.tapeB} style={{ right: -36, top: -16, transform: "rotate(20deg)" }} />
      <div style={{ width: photo, height: photo, background: id ? bg : "#cdb38c", display: "grid", placeItems: "center", overflow: "hidden", position: "relative" }}>
        {id ? (
          <Img
            src={staticFile(`mascots/${id}.webp`)}
            style={{
              width: photo * 0.82,
              height: photo * 0.82,
              objectFit: "contain",
              filter: `blur(${(1 - develop) * 22}px) brightness(${1 + (1 - develop) * 0.9}) saturate(${0.3 + develop * 0.7})`,
            }}
          />
        ) : (
          <span style={{ fontFamily: F.title, fontSize: photo * 0.6, color: C.ink, opacity: 0.8, lineHeight: 1 }}>?</span>
        )}
        <div style={{ position: "absolute", inset: 0, background: "#fffefb", opacity: (1 - develop) * 0.85 }} />
      </div>
      <div style={{ padding: "24px 8px 32px", textAlign: "center", minHeight: 150, boxSizing: "border-box" }}>
        {id && name ? (
          <>
            <div style={{ fontFamily: F.title, fontSize: width * 0.1, color: C.ink, opacity: develop, lineHeight: 1.1 }}>{name}</div>
            {quote && <div style={{ fontFamily: F.hand, fontSize: width * 0.075, color: C.red, marginTop: 10, opacity: develop }}>{quote}</div>}
          </>
        ) : (
          <div style={{ fontFamily: F.hand, fontSize: width * 0.1, color: C.dim }}>두구두구…</div>
        )}
      </div>
    </div>
  );
};

/** 모든 편의 마지막 장면 (5초): 사이트로 오게 하는 안내 */
export const Outro: React.FC<{ at: number; line?: string; pals?: string[] }> = ({ at, line = "말 못 한 고민,\n[[익명]]으로 보내 봐", pals = ["rabbit", "hedgehog", "bear", "raccoon"] }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const o = interpolate(frame - at, [0, 6], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <CorkBg />
      <div style={{ position: "absolute", top: 300, left: 0, right: 0 }}>
        <Pop at={at + 2}>
          <Headline text={line} size={96} />
        </Pop>
      </div>
      <div style={{ position: "absolute", top: 720, left: 0, right: 0, textAlign: "center" }}>
        <Pop at={at + 12} y={30} from={0.9}>
          <div style={{ fontFamily: F.body, fontSize: 56, color: C.ink, lineHeight: 1.35 }}>
            보내면 바로 <b style={{ color: C.red, fontWeight: 400 }}>나만의 고민 동물</b>이 나오고
            <br />
            유튜브 생방송에서 같이 읽어요
          </div>
        </Pop>
      </div>
      <div style={{ position: "absolute", top: 940, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Pop at={at + 22} from={1.15} y={0}>
          <div style={{ background: C.ink, color: "#fff", padding: "22px 44px", borderRadius: 999, fontFamily: F.mono, fontSize: 50, letterSpacing: "-0.01em" }}>{SITE}</div>
          <div style={{ textAlign: "center", fontFamily: F.hand, fontSize: 64, color: C.ink, marginTop: 18 }}>프로필 링크에서 바로 가기 ↗</div>
        </Pop>
      </div>
      <div style={{ position: "absolute", top: 1230, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8 }}>
        {pals.map((p, i) => (
          <Pop key={p} at={at + 26 + i * 4} y={60} from={0.6} rot={(i % 2 ? 4 : -4)}>
            <Mascot id={p} size={230} />
          </Pop>
        ))}
      </div>
    </AbsoluteFill>
  );
};
