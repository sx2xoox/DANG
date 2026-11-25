import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, CorkBg, F, Headline, Outro, Pop, Tape, useFonts } from "../kit";

/**
 * ⑤ 다웅의 편지: 진행자(다웅)가 지친 사람에게 건네는 짧은 편지 (저장 유도)
 *  0s 제목·편지 봉투(첫 화면) · 1.5s~ 한 줄씩 손글씨 · 끝에 서명 · "저장해 둬" · 마무리
 */
export type LetterProps = {
  title: string;
  lines: string[]; // 빈 줄("")은 한 줄 띄우기
  to?: string; // 봉투 받는 사람
  from?: string; // 서명 (기본: 다웅)
  save?: string;
};

const LINE_GAP = 40;
const FIRST = 45;

export function letterFrames(lines: string[]) {
  const end = FIRST + lines.length * LINE_GAP;
  return end + 150 + 150; // 서명·저장 안내 5초 + 마무리 5초
}

const Line: React.FC<{ at: number; text: string }> = ({ at, text }) => {
  const frame = useCurrentFrame();
  if (!text) return <div style={{ height: 40 }} />;
  // 손으로 쓰듯 왼쪽부터 드러남
  const p = interpolate(frame, [at, at + 22], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        fontFamily: F.hand,
        fontSize: 74,
        lineHeight: 1.22,
        color: C.ink,
        WebkitMaskImage: `linear-gradient(90deg, #000 ${p}%, transparent ${p + 8}%)`,
        maskImage: `linear-gradient(90deg, #000 ${p}%, transparent ${p + 8}%)`,
      }}
    >
      {text}
    </div>
  );
};

/** 이름 뒤 "이/가" (받침 있으면 "이") */
function subj(name: string) {
  const c = name.charCodeAt(name.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? "이" : "가";
}

/** 편지 봉투: 받는 사람·보내는 사람 손글씨 + 우표 */
const Envelope: React.FC<{ to: string; from: string }> = ({ to, from }) => (
  <div style={{ position: "relative", width: 820, height: 520, background: "#f7ecd6", boxShadow: "0 30px 40px -14px rgba(50,30,10,0.55)", overflow: "hidden" }}>
    {/* 접힌 뚜껑 */}
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 260, background: "#efdfc0", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 262, background: "rgba(120,80,40,0.12)", clipPath: "polygon(0 0, 100% 0, 50% 100%, 50% 98%, 99% 0, 1% 0, 50% 98%)" }} />
    {/* 봉인 스티커 */}
    <div style={{ position: "absolute", left: 410 - 46, top: 214, width: 92, height: 92, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #ff8f7d, #d9483b 60%, #a8322a)", boxShadow: "0 6px 8px rgba(0,0,0,0.3)", display: "grid", placeItems: "center", color: "#fff", fontSize: 44 }}>♥</div>
    {/* 우표 */}
    <div style={{ position: "absolute", right: 40, top: 300, width: 120, height: 140, background: "#fff", border: "6px dotted #e5d3b3", display: "grid", placeItems: "center", transform: "rotate(5deg)" }}>
      <div style={{ width: 92, height: 110, background: C.noteY, display: "grid", placeItems: "center", fontFamily: F.title, fontSize: 30, color: C.red, lineHeight: 1.1, textAlign: "center" }}>
        고민
        <br />
        우편
      </div>
    </div>
    <div style={{ position: "absolute", left: 60, top: 320, fontFamily: F.hand, fontSize: 70, color: C.ink, lineHeight: 1.15 }}>
      To. {to}
      <br />
      <span style={{ color: C.red }}>From. {from}</span>
    </div>
  </div>
);

export const Letter: React.FC<LetterProps> = ({ title, lines, to = "오늘도 애쓴 너", from = "다웅", save = "힘들 때 꺼내 보게 저장해 둬" }) => {
  useFonts();
  const frame = useCurrentFrame();
  const end = FIRST + lines.length * LINE_GAP;
  const outro = end + 150;
  const bob = Math.sin(frame / 14) * 6;
  const k = interpolate(frame, [26, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const paperO = interpolate(frame, [30, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <CorkBg />
      <div style={{ position: "absolute", top: 200, left: 0, right: 0 }}>
        <Headline text={title} size={76} rot={1} />
      </div>

      <div style={{ position: "absolute", top: 470, left: 80, right: 150, opacity: paperO, transform: `translateY(${(1 - paperO) * 60}px)` }}>
        <div
          style={{
            position: "relative",
            background: "#fffaf0",
            backgroundImage: "repeating-linear-gradient(transparent 0 89px, rgba(229,83,61,0.16) 89px 91px)",
            padding: "56px 56px 70px",
            minHeight: 820,
            boxShadow: "0 26px 36px -14px rgba(50,30,10,0.5)",
            transform: "rotate(-1.2deg)",
          }}
        >
          <Tape style={{ left: 40, top: -24, transform: "rotate(-6deg)" }} />
          <Tape color={C.tapeB} style={{ right: 40, top: -22, transform: "rotate(5deg)" }} />
          {lines.map((t, i) => (
            <Line key={i} at={FIRST + i * LINE_GAP} text={t} />
          ))}
          <div style={{ textAlign: "right", marginTop: 26 }}>
            <Pop at={end + 6} y={10} from={1.1}>
              <span style={{ fontFamily: F.hand, fontSize: 64, color: C.red }}>— {from}</span>
            </Pop>
          </div>
        </div>
      </div>

      {/* 첫 화면: 다웅이 보낸 편지 봉투 (썸네일) → 편지가 펼쳐지면 사라짐 */}
      {k < 1 && (
        <div
          style={{
            position: "absolute",
            top: 560,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: 1 - k,
            transform: `translateY(${k * 120 + bob}px) scale(${1 - k * 0.15}) rotate(-3deg)`,
            zIndex: 5,
          }}
        >
          <Envelope to={to} from={from} />
          <div style={{ marginTop: 56, background: C.ink, color: "#fff", fontFamily: F.body, fontSize: 56, padding: "14px 36px", borderRadius: 999 }}>
            💌 {from}
            {subj(from)} 보낸 편지
          </div>
        </div>
      )}

      <div style={{ position: "absolute", top: 1500, left: 0, right: 0, textAlign: "center" }}>
        <Pop at={end + 30} rot={-2}>
          <span style={{ display: "inline-block", background: C.ink, color: "#fff", fontFamily: F.body, fontSize: 54, padding: "16px 34px", borderRadius: 999 }}>
            📌 {save}
          </span>
        </Pop>
      </div>

      <Outro at={outro} line={"혼자 끙끙 앓지 말고\n[[익명]]으로 털어놔"} />
    </AbsoluteFill>
  );
};
