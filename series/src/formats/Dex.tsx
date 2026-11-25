import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, CorkBg, F, Headline, Note, Outro, Polaroid, Pop, shake, useFonts, useOut } from "../kit";

/**
 * ② 고민 동물 도감: "○○한 사람 특징" 3가지 → 그런 너의 고민 동물 공개
 *  0s 제목·"?" 포스트잇 3장(첫 화면 = 썸네일) · 0.7s~ 하나씩 뒤집혀 공개 (1.1초 간격) · 5.1s 동물 공개 · 6.5s 댓글 유도 · 8.8s 마무리 (총 11.3초)
 */
export type DexProps = {
  hook: string; // 첫 화면 제목 ([[강조]] 가능)
  traits: [string, string, string];
  animal: { id: string; name: string; quote: string; bg?: string };
  ask: string; // 공개 뒤 한 줄 (댓글 유도)
};

export const DEX_FRAMES = 340;
const T = { traits: [22, 54, 86], clear: 146, reveal: 154, develop: 178, ask: 196, outro: 265 };
const NOTE_COLORS = [C.noteY, C.noteP, C.noteB];

/** 특징 포스트잇 3장. openAt 이 없으면 셋 다 "?" 로 가린 채 (썸네일용) */
export const TraitNotes: React.FC<{ traits: string[]; openAt?: number[] }> = ({ traits, openAt }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {traits.map((t, i) => {
        const at = openAt ? openAt[i] : 1e6;
        const p = interpolate(frame, [at, at + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const open = p >= 0.5;
        const sx = Math.max(0.04, Math.abs(Math.cos(p * Math.PI)));
        const pop = open ? 1 + 0.06 * Math.sin(Math.min(1, (frame - at - 4) / 8) * Math.PI) : 1;
        return (
          <div key={i} style={{ position: "absolute", top: i * 300, left: i % 2 ? 300 : 90, transform: `rotate(${i % 2 ? 3 : -3}deg) scale(${pop})` }}>
            <div style={{ transform: `scaleX(${sx})` }}>
              <Note color={NOTE_COLORS[i]} width={620} height={236} size={64}>
                {open ? (
                  <>
                    <span style={{ fontFamily: F.title, fontSize: 52, color: C.red, marginRight: 16 }}>{i + 1}</span>
                    {t}
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, height: 150 }}>
                    <span style={{ fontFamily: F.title, fontSize: 52, color: C.red }}>{i + 1}</span>
                    <span style={{ fontFamily: F.title, fontSize: 130, color: C.ink, opacity: 0.85, lineHeight: 1 }}>?</span>
                  </div>
                )}
              </Note>
            </div>
          </div>
        );
      })}
    </>
  );
};

export const Dex: React.FC<DexProps> = ({ hook, traits, animal, ask }) => {
  useFonts();
  const frame = useCurrentFrame();
  const notesOut = useOut(T.clear);
  const dev = interpolate(frame, [T.reveal + 4, T.develop], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flip = interpolate(frame, [T.reveal, T.reveal + 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ transform: shake(frame, [T.traits[0], T.traits[1], T.traits[2], T.develop], 8) }}>
      <CorkBg />

      {/* 제목: 첫 화면부터 보여서 썸네일 역할도 해요 */}
      <div style={{ position: "absolute", top: 210, left: 0, right: 0 }}>
        <Headline text={hook} size={78} />
      </div>

      {/* 특징 3개: 처음엔 "?" 로 가려져 있다가 하나씩 뒤집혀요 */}
      {frame < T.clear + 10 && (
        <div style={{ position: "absolute", top: 560, left: 0, right: 0, opacity: notesOut }}>
          <TraitNotes traits={traits} openAt={T.traits} />
        </div>
      )}
      {frame < T.clear + 10 && (
        <div style={{ position: "absolute", top: 1500, left: 0, right: 0, textAlign: "center", opacity: notesOut }}>
          <span style={{ display: "inline-block", background: C.ink, color: "#fff", fontFamily: F.body, fontSize: 54, padding: "14px 34px", borderRadius: 999, transform: "rotate(-2deg)" }}>너는 몇 개나 해당돼? 👀</span>
        </div>
      )}

      {/* 공개 */}
      {frame >= T.reveal - 8 && (
        <>
          <div style={{ position: "absolute", top: 520, left: 0, right: 0, textAlign: "center" }}>
            <Pop at={T.reveal - 8} y={20} from={0.9}>
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
