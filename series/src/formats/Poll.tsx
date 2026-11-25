import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Bubble, C, CorkBg, F, Headline, Mascot, Note, Outro, Pop, shake, useFonts } from "../kit";

/**
 * ③ 너라면? 투표: 상황 하나 → A vs B → 댓글로 골라줘
 *  0s 제목·상황·A·B (첫 화면부터 다 보임 = 썸네일) · 0.5s VS · 2.3s 댓글 유도 · 2.9s~ 댓글 말풍선 · 7.7s 마무리 (총 10.2초)
 */
export type PollProps = {
  hook: string;
  situation: string;
  a: { text: string; mascot: string };
  b: { text: string; mascot: string };
  comments: string[]; // 4개 정도
};

export const POLL_FRAMES = 305;
const T = { vs: 14, ask: 70, noteOut: 84, comments: [88, 102, 116, 130], outro: 230 };

const Choice: React.FC<{ label: "A" | "B"; text: string; mascot: string; color: string }> = ({ label, text, mascot, color }) => (
  <div style={{ position: "relative", width: 430, background: C.poster, border: `6px solid ${C.ink}`, boxShadow: `10px 12px 0 ${C.ink}`, padding: "30px 26px 34px", boxSizing: "border-box", textAlign: "center" }}>
    <div style={{ position: "absolute", top: -54, left: "50%", marginLeft: -54, width: 108, height: 108, borderRadius: "50%", background: color, border: `6px solid ${C.ink}`, display: "grid", placeItems: "center", fontFamily: F.title, fontSize: 64, color: "#fff" }}>
      {label}
    </div>
    <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
      <Mascot id={mascot} size={220} />
    </div>
    <div style={{ fontFamily: F.body, fontSize: 50, lineHeight: 1.25, color: C.ink, whiteSpace: "pre-line", wordBreak: "keep-all", marginTop: 14 }}>{text}</div>
  </div>
);

export const Poll: React.FC<PollProps> = ({ hook, situation, a, b, comments }) => {
  useFonts();
  const frame = useCurrentFrame();
  const vsS = interpolate(frame, [T.vs, T.vs + 6, T.vs + 12], [2.4, 0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const choicesUp = 0;
  const noteO = interpolate(frame, [T.noteOut, T.noteOut + 5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ transform: shake(frame, [T.vs], 9) }}>
      <CorkBg />

      <div style={{ position: "absolute", top: 200, left: 0, right: 0 }}>
        <Headline text={hook} size={80} />
      </div>

      <div style={{ position: "absolute", top: 430, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: noteO }}>
        <Note color={C.noteY} width={860} size={70} style={{ textAlign: "center", transform: "rotate(1.5deg)" }}>
          {situation}
        </Note>
      </div>

      <div style={{ position: "absolute", top: 860, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 60, transform: `translateY(${choicesUp}px)` }}>
        <div style={{ transform: "rotate(-3deg)" }}>
          <Choice label="A" text={a.text} mascot={a.mascot} color={C.red} />
        </div>
        <div style={{ transform: "rotate(3deg)" }}>
          <Choice label="B" text={b.text} mascot={b.mascot} color={C.blue} />
        </div>
      </div>

      {frame >= T.vs && (
        <div style={{ position: "absolute", top: 1100, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `translateY(${choicesUp}px)` }}>
          <div style={{ transform: `scale(${vsS}) rotate(-8deg)`, fontFamily: F.title, fontSize: 120, color: C.marker, WebkitTextStroke: `8px ${C.ink}`, paintOrder: "stroke", textShadow: `6px 8px 0 ${C.ink}` }}>VS</div>
        </div>
      )}

      {/* 댓글 유도 + 말풍선 */}
      <div style={{ position: "absolute", top: 1440, left: 0, right: 0, textAlign: "center" }}>
        <Pop at={T.ask} rot={-2}>
          <span style={{ display: "inline-block", background: C.ink, color: "#fff", fontFamily: F.title, fontSize: 60, padding: "16px 40px", borderRadius: 999 }}>
            댓글로 <span style={{ color: "#ff8a78" }}>A</span> / <span style={{ color: "#8cc4ff" }}>B</span> 골라줘!
          </span>
        </Pop>
      </div>
      {comments.slice(0, 4).map((c, i) => (
        <div key={i} style={{ position: "absolute", top: [420, 505, 590, 675][i], left: i % 2 ? undefined : 80, right: i % 2 ? 170 : undefined, zIndex: 10 }}>
          <Pop at={T.comments[i]} from={0.6} y={30} rot={i % 2 ? 3 : -3}>
            <Bubble color={[C.noteP, C.noteB, C.noteG, C.noteV][i]} tail={i % 2 ? "r" : "l"} size={48}>
              {c}
            </Bubble>
          </Pop>
        </div>
      ))}

      <Outro at={T.outro} />
    </AbsoluteFill>
  );
};
