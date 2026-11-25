import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, CorkBg, F, Headline, Outro, Polaroid, Pop, Tape, shake, useFonts } from "../kit";

/**
 * ④ 이런 적 있으면 너도: 체크리스트 5줄 → 3개 이상이면 너는 이 동물
 *  0s 제목·체크리스트(첫 화면부터 보임 = 썸네일) · 0.7s~ 한 줄씩 체크 (0.8초 간격) · 5s 결과 공개 · 6.5s 댓글 유도 · 8.8s 마무리 (총 11.3초)
 */
export type CheckProps = {
  hook: string;
  items: string[]; // 5줄
  animal: { id: string; name: string; quote: string; bg?: string };
  ask: string;
};

export const CHECK_FRAMES = 340;
const STEP = 24;
const T = { first: 20, reveal: 150, ask: 196, outro: 265 };

const Row: React.FC<{ at: number; text: string }> = ({ at, text }) => {
  const frame = useCurrentFrame();
  const tick = interpolate(frame, [at, at + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lit = interpolate(frame, [at, at + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ background: `rgba(255, 224, 102, ${lit * 0.45})`, margin: "0 -20px", padding: "0 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "18px 0", borderBottom: "3px dashed rgba(43,33,24,0.18)" }}>
        <div style={{ flex: "none", width: 70, height: 70, border: `6px solid ${C.ink}`, borderRadius: 10, background: "#fff", position: "relative" }}>
          <svg width="100" height="90" viewBox="0 0 100 90" style={{ position: "absolute", left: -6, top: -26 }}>
            <path d="M14 48 L40 74 L92 8" fill="none" stroke={C.red} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="140" strokeDashoffset={140 * (1 - tick)} />
          </svg>
        </div>
        <div style={{ fontFamily: F.hand, fontSize: 66, lineHeight: 1.05, color: C.ink, wordBreak: "keep-all" }}>{text}</div>
      </div>
    </div>
  );
};

export const Check: React.FC<CheckProps> = ({ hook, items, animal, ask }) => {
  useFonts();
  const frame = useCurrentFrame();
  const padOut = interpolate(frame, [T.reveal - 8, T.reveal], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dev = interpolate(frame, [T.reveal + 4, T.reveal + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ transform: shake(frame, [T.reveal + 24], 9) }}>
      <CorkBg />
      <div style={{ position: "absolute", top: 200, left: 0, right: 0 }}>
        <Headline text={hook} size={76} />
      </div>

      {/* 메모지 */}
      {padOut > 0 && (
        <div style={{ position: "absolute", top: 520, left: 70, right: 130, opacity: padOut, transform: `rotate(-1deg) scale(${0.96 + padOut * 0.04})` }}>
          <div style={{ position: "relative", background: "#fffdf3", backgroundImage: "repeating-linear-gradient(transparent 0 106px, rgba(47,127,209,0.12) 106px 109px)", padding: "50px 46px 40px", boxShadow: "0 24px 34px -14px rgba(50,30,10,0.5)" }}>
            <Tape style={{ left: "50%", marginLeft: -95, top: -26 }} />
            {items.slice(0, 5).map((t, i) => (
              <Row key={i} at={T.first + i * STEP} text={t} />
            ))}
          </div>
        </div>
      )}

      {/* 결과 */}
      {frame >= T.reveal - 6 && (
        <>
          <div style={{ position: "absolute", top: 520, left: 0, right: 0, textAlign: "center" }}>
            <Pop at={T.reveal - 6} y={20} from={0.9}>
              <div style={{ fontFamily: F.body, fontSize: 60, color: C.ink }}>3개 이상이면 너는…</div>
            </Pop>
          </div>
          <div style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <Pop at={T.reveal} from={0.5} y={120} rot={2}>
              <Polaroid id={animal.id} name={animal.name} quote={animal.quote} develop={dev} bg={animal.bg} width={660} />
            </Pop>
          </div>
        </>
      )}

      <div style={{ position: "absolute", top: 1500, left: 0, right: 0, textAlign: "center" }}>
        <Pop at={T.ask} rot={-2}>
          <span style={{ display: "inline-block", background: C.ink, color: "#fff", fontFamily: F.body, fontSize: 54, padding: "16px 34px", borderRadius: 999 }}>{ask}</span>
        </Pop>
      </div>

      <Outro at={T.outro} />
    </AbsoluteFill>
  );
};
