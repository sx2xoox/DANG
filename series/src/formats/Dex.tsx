import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, CorkBg, F, Headline, Note, Outro, Polaroid, Pop, shake, useFonts, useOut } from "../kit";

/**
 * ② 고민 동물 도감: "○○한 사람 특징" 3가지 → 그런 너의 고민 동물 공개
 *  0s 제목(첫 화면부터 보임) · 1.5s~ 특징 3개 · 8s 공개 · 13s 댓글 유도 · 15s 마무리
 */
export type DexProps = {
  hook: string; // 첫 화면 제목 ([[강조]] 가능)
  traits: [string, string, string];
  animal: { id: string; name: string; quote: string; bg?: string };
  ask: string; // 공개 뒤 한 줄 (댓글 유도)
};

export const DEX_FRAMES = 600;
const T = { teaseOut: 34, traits: [45, 105, 165], clear: 228, reveal: 240, develop: 282, ask: 360, outro: 450 };
const NOTE_COLORS = [C.noteY, C.noteP, C.noteB];

export const Dex: React.FC<DexProps> = ({ hook, traits, animal, ask }) => {
  useFonts();
  const frame = useCurrentFrame();
  const notesOut = useOut(T.clear);
  const dev = interpolate(frame, [T.reveal + 10, T.develop], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flip = interpolate(frame, [T.reveal, T.reveal + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ transform: shake(frame, [T.traits[0], T.traits[1], T.traits[2], T.develop], 8) }}>
      <CorkBg />

      {/* 제목: 첫 화면부터 보여서 썸네일 역할도 해요 */}
      <div style={{ position: "absolute", top: 210, left: 0, right: 0 }}>
        <Headline text={hook} size={78} />
      </div>

      {/* 첫 화면: 물음표 카드 (썸네일) */}
      {frame < T.teaseOut + 10 && (
        <div style={{ position: "absolute", top: 600, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: interpolate(frame, [T.teaseOut, T.teaseOut + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), transform: `scale(${interpolate(frame, [T.teaseOut, T.teaseOut + 8], [1, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}) rotate(-3deg)` }}>
          <Polaroid id={null} width={600} />
          <div style={{ marginTop: 40, background: C.ink, color: "#fff", fontFamily: F.body, fontSize: 54, padding: "14px 34px", borderRadius: 999 }}>다 해당되면 너는 이 동물</div>
        </div>
      )}

      {/* 특징 3개 */}
      {frame < T.clear + 10 && (
        <div style={{ position: "absolute", top: 560, left: 0, right: 0, opacity: notesOut }}>
          {traits.map((t, i) => (
            <div key={i} style={{ position: "absolute", top: i * 300, left: i % 2 ? 300 : 90 }}>
              <Pop at={T.traits[i]} rot={i % 2 ? 3 : -3}>
                <Note color={NOTE_COLORS[i]} width={620} size={64}>
                  <span style={{ fontFamily: F.title, fontSize: 52, color: C.red, marginRight: 16 }}>{i + 1}</span>
                  {t}
                </Note>
              </Pop>
            </div>
          ))}
        </div>
      )}

      {/* 공개 */}
      {frame >= T.reveal - 12 && (
        <>
          <div style={{ position: "absolute", top: 520, left: 0, right: 0, textAlign: "center" }}>
            <Pop at={T.reveal - 12} y={20} from={0.9}>
              <div style={{ fontFamily: F.body, fontSize: 62, color: C.ink }}>이런 너의 고민 동물은…</div>
            </Pop>
          </div>
          <div style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <Pop at={T.reveal} from={0.5} y={120} rot={-2}>
              <div style={{ transform: `scale(${interpolate(frame, [T.develop, T.develop + 6, T.develop + 14], [1, 1.06, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>
                <Polaroid id={flip >= 1 ? animal.id : null} name={animal.name} quote={animal.quote} develop={dev} bg={animal.bg} width={660} />
              </div>
            </Pop>
          </div>
        </>
      )}

      {/* 댓글 유도 */}
      <div style={{ position: "absolute", top: 1500, left: 0, right: 0, textAlign: "center" }}>
        <Pop at={T.ask} rot={-2}>
          <span style={{ display: "inline-block", background: C.ink, color: "#fff", fontFamily: F.body, fontSize: 54, padding: "16px 34px", borderRadius: 999 }}>{ask}</span>
        </Pop>
      </div>

      <Outro at={T.outro} />
    </AbsoluteFill>
  );
};
