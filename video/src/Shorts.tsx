import React from "react";
import { AbsoluteFill, Audio, interpolate, Easing, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import tl from "./timeline.json";
import { B, beatPulse, C, Caption, CorkBg, F, Pin, Polaroid, PolaroidBack, PostIt, shakeAt, Tape, useFonts, useSlam, type AnimalInfo } from "./parts";

export type ShortsProps = { siteUrl: string };

const S = tl.scenes;
const len = (k: keyof typeof S) => S[k][1] - S[k][0];

// 화면이 흔들리는 순간 (압정, 도장, 공개)
const HITS = [
  { f: 0, power: 10 },
  { f: 60, power: 5 },
  { f: 75, power: 5 },
  { f: 90, power: 5 },
  { f: 105, power: 5 },
  { f: 210, power: 12 },
  { f: 300, power: 16 },
  { f: 420, power: 8 },
  { f: 540, power: 10 },
  { f: 600, power: 6 },
];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Shorts: React.FC<ShortsProps> = ({ siteUrl }) => {
  useFonts();
  const frame = useCurrentFrame();
  const shake = shakeAt(frame, HITS);
  return (
    <AbsoluteFill style={{ background: C.cork, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        <Sequence from={S.hook[0]} durationInFrames={S.phone[1]} name="쪽지 보드 + 휴대폰">
          <BoardAndPhone />
        </Sequence>
        <Sequence from={S.tension[0]} durationInFrames={S.reveal[1] - S.tension[0]} name="두근두근 → 공개">
          <Reveal />
        </Sequence>
        <Sequence from={S.carousel[0]} durationInFrames={len("carousel")} name="다른 동물들">
          <Carousel />
        </Sequence>
        <Sequence from={S.question[0]} durationInFrames={len("question")} name="너는?">
          <Question />
        </Sequence>
        <Sequence from={S.live[0]} durationInFrames={len("live")} name="방송">
          <Live />
        </Sequence>
        <Sequence from={S.end[0]} durationInFrames={len("end")} name="마무리">
          <End siteUrl={siteUrl} />
        </Sequence>
      </AbsoluteFill>
      <Audio src={staticFile("audio/shorts.wav")} />
    </AbsoluteFill>
  );
};

// ================================================================== 1. 쪽지 보드 (0~4초) + 휴대폰 (4~8초)
const NOTES = [
  { at: 0, x: 540, y: 1000, rot: -3, color: C.noteY, text: "시험 망했는데\n엄마한테\n뭐라 하지", size: 460, fontSize: 76 },
  { at: 60, x: 300, y: 610, rot: -6, color: C.noteP, text: "단톡방 약속,\n나 빼고 잡힘" },
  { at: 75, x: 790, y: 660, rot: 5, color: C.noteB, text: "썸인지 아닌지\n모르겠음" },
  { at: 90, x: 290, y: 1450, rot: 4, color: C.noteG, text: "하고 싶은 게\n없어서 불안해" },
  { at: 105, x: 800, y: 1400, rot: -5, color: C.noteV, text: "반 바뀌고\n친구가 없어" },
];

const BoardAndPhone: React.FC = () => {
  const frame = useCurrentFrame();
  // 보드가 차면서 살짝 물러나고, 휴대폰이 오면 흐려짐
  const zoom = interpolate(frame, [0, 60, 110], [1.22, 1.12, 1.0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const phoneIn = frame >= S.phone[0];
  const blur = interpolate(frame, [118, 128], [0, 7], clamp);
  const dim = interpolate(frame, [118, 128], [0, 0.32], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${zoom * (frame < 120 ? beatPulse(frame, 0.008) : 1)})`, filter: `blur(${blur}px)` }}>
        <CorkBg dim={dim} />
        {NOTES.map((n, i) => (
          <PostIt key={i} {...n} />
        ))}
      </AbsoluteFill>
      <Caption at={30} y={170} segs={[{ t: "이 고민, " }, { t: "어디다", hl: true }, { t: " 말해?" }]} out={116} />
      {phoneIn && <Phone />}
      <Caption at={150} y={120} size={78} rot={1.5} segs={[{ t: "이름 없이, " }, { t: "1분이면 끝", hl: true }]} out={234} />
    </AbsoluteFill>
  );
};

const AGE = ["초등학생", "중학생", "고등학생", "대학생", "그 이상"];
const STAMPS = [
  { e: "😤", l: "억울", c: "#F59E0B" },
  { e: "😡", l: "분노", c: "#E11D2E" },
  { e: "💗", l: "설렘", c: "#EC4899" },
  { e: "😟", l: "걱정", c: "#2563EB" },
  { e: "🤯", l: "멘붕", c: "#8B5CF6" },
  { e: "🫠", l: "현타", c: "#14B8A6" },
];

const Phone: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - S.phone[0];
  const enter = spring({ frame: local, fps, config: { damping: 15, stiffness: 170 } });
  const exit = interpolate(frame, [234, 240], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  // 화면 안 단계: 학년대 → 온도 → 우표 (박자에 맞춰 넘김)
  const step = frame < 157 ? 0 : frame < 200 ? 1 : 2;
  const slide = (start: number) => interpolate(frame, [start, start + 6], [100, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const offset = step === 1 ? slide(157) : step === 2 ? slide(200) : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: 720,
          height: 1240,
          marginTop: 200,
          borderRadius: 86,
          background: "#231a12",
          padding: 22,
          boxSizing: "border-box",
          boxShadow: "0 60px 80px -30px rgba(30, 18, 8, 0.7)",
          transform: `translateY(${interpolate(enter, [0, 1], [1500, 0]) + exit * 1600}px) rotate(${interpolate(enter, [0, 1], [8, 0]) - exit * 6}deg)`,
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: 66, background: C.poster, overflow: "hidden", position: "relative" }}>
          {/* 상단 진행 표시 */}
          <div style={{ padding: "70px 56px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontWeight: 600, fontSize: 30, color: C.dim }}>
              <span>고민 쪽지</span>
              <span>{[2, 5, 7][step]} / 10</span>
            </div>
            <div style={{ height: 10, background: "#efe4cf", marginTop: 18 }}>
              <div style={{ height: "100%", width: `${[20, 50, 70][step]}%`, background: C.ink, transition: "none" }} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 210, bottom: 0, transform: `translateX(${offset}%)` }}>
            {step === 0 && <StepAge />}
            {step === 1 && <StepTemp />}
            {step === 2 && <StepStamp />}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const stepTitle: React.CSSProperties = { fontFamily: F.soft, fontSize: 68, whiteSpace: "nowrap", color: C.ink, letterSpacing: "-0.03em", margin: "10px 56px 48px", lineHeight: 1.2 };

const StepAge: React.FC = () => {
  const frame = useCurrentFrame();
  const picked = frame >= 135;
  const ripple = interpolate(frame, [135, 145], [0, 1], clamp);
  return (
    <div>
      <div style={stepTitle}>학년대를 골라줘</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, margin: "0 56px" }}>
        {AGE.map((a, i) => {
          const on = picked && i === 2;
          return (
            <div
              key={a}
              style={{
                position: "relative",
                overflow: "hidden",
                height: 132,
                display: "flex",
                alignItems: "center",
                padding: "0 40px",
                border: `4px solid ${C.ink}`,
                background: on ? C.ink : "#fff",
                color: on ? C.poster : C.ink,
                fontFamily: F.bold,
                fontWeight: 800,
                fontSize: 52,
                transform: on ? `scale(${1 + 0.05 * Math.exp(-(frame - 135) / 3)})` : undefined,
              }}
            >
              {on && (
                <div
                  style={{
                    position: "absolute",
                    left: "60%",
                    top: "50%",
                    width: 900 * ripple,
                    height: 900 * ripple,
                    marginLeft: -450 * ripple,
                    marginTop: -450 * ripple,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.18)",
                    opacity: 1 - ripple,
                  }}
                />
              )}
              {a}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function tempColor(t: number) {
  const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);
  const from = t <= 50 ? [37, 99, 235] : [255, 196, 0];
  const to = t <= 50 ? [255, 196, 0] : [229, 83, 61];
  const k = t <= 50 ? t / 50 : (t - 50) / 50;
  return `rgb(${lerp(from[0], to[0], k)}, ${lerp(from[1], to[1], k)}, ${lerp(from[2], to[2], k)})`;
}

const StepTemp: React.FC = () => {
  const frame = useCurrentFrame();
  const t = Math.round(interpolate(frame, [165, 195], [18, 82], { ...clamp, easing: Easing.inOut(Easing.cubic) }));
  const label = t < 30 ? "가끔 생각나" : t < 60 ? "며칠째 신경 쓰여" : "머릿속이 꽉 찼어";
  const col = tempColor(t);
  return (
    <div>
      <div style={stepTitle}>이 고민, 몇 도쯤?</div>
      <div style={{ margin: "40px 56px 0", textAlign: "center" }}>
        <div style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 220, color: col, lineHeight: 1, letterSpacing: "-0.05em" }}>{t}°</div>
        <div style={{ fontFamily: F.hand, fontSize: 76, color: C.ink, marginTop: 20 }}>{label}</div>
        <div style={{ position: "relative", height: 28, marginTop: 90, background: "linear-gradient(90deg, #2563eb, #ffc400 50%, #e5533d)" }}>
          <div
            style={{
              position: "absolute",
              left: `${t}%`,
              top: "50%",
              width: 84,
              height: 84,
              marginLeft: -42,
              marginTop: -42,
              borderRadius: "50%",
              background: "#fff",
              border: `10px solid ${col}`,
              boxSizing: "border-box",
              boxShadow: "0 8px 14px rgba(0,0,0,0.25)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

const StepStamp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hit = spring({ frame: frame - 210, fps, config: { damping: 9, stiffness: 400, mass: 0.5 } });
  return (
    <div>
      <div style={stepTitle}>지금 기분을 우표로</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 34, margin: "10px 56px" }}>
        {STAMPS.map((s, i) => {
          const on = i === 0 && frame >= 210;
          return (
            <div
              key={s.l}
              style={{
                aspectRatio: "0.85",
                background: s.c,
                outline: `6px dashed rgba(255,255,255,0.75)`,
                outlineOffset: -14,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: "#fff",
                fontFamily: F.bold,
                fontWeight: 900,
                fontSize: 34,
                transform: on ? `scale(${interpolate(hit, [0, 1], [1.7, 1])}) rotate(${interpolate(hit, [0, 1], [-14, -4])}deg)` : `rotate(${(i % 2 ? 2 : -2)}deg)`,
                boxShadow: on ? `0 0 0 10px ${C.ink}` : "0 6px 10px rgba(0,0,0,0.15)",
                opacity: frame >= 210 && !on ? 0.45 : 1,
                zIndex: on ? 2 : 1,
              }}
            >
              <span style={{ fontSize: 76, lineHeight: 1 }}>{s.e}</span>
              {s.l}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ================================================================== 2. 두근두근 (8~10초) → 공개 (10~12초)
const RACCOON: AnimalInfo = { emoji: "🦝", name: "곱씹는 라쿤", quote: "그때 이렇게 말했으면…?", bg: C.noteB };

const Reveal: React.FC = () => {
  const frame = useCurrentFrame() + S.tension[0];
  const { fps } = useVideoConfig();
  const drop = spring({ frame: frame - 240, fps, config: { damping: 12, stiffness: 140 } });
  // 심장 박동 (두 번씩 쿵쿵)
  const beatHits = [255, 260, 285, 290];
  let pulse = 1;
  for (const h of beatHits) {
    const d = frame - h;
    if (d >= 0 && d < 8) pulse += 0.045 * Math.exp(-d / 2);
  }
  // 공개 직전 떨림이 점점 커짐
  const tremble = frame >= 270 && frame < 300 ? Math.sin(frame * 3.3) * interpolate(frame, [270, 300], [0, 9]) : 0;
  const flip = interpolate(frame, [300, 309], [180, 0], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  const develop = interpolate(frame, [303, 332], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const flash = frame >= 300 ? interpolate(frame, [300, 307], [0.95, 0], clamp) : 0;
  const punch = frame >= 300 ? 1 + 0.09 * Math.exp(-(frame - 300) / 5) : 1;
  const dim = frame < 300 ? interpolate(frame, [240, 290], [0.15, 0.55], clamp) : interpolate(frame, [300, 306], [0.55, 0.05], clamp);
  const showFront = flip < 90;
  return (
    <AbsoluteFill>
      <CorkBg dim={dim} />
      {frame < 300 && <Caption at={255 - S.tension[0]} y={210} size={82} segs={[{ t: "내 고민 동물은" }]} />}
      {frame >= 300 && <Caption at={315 - S.tension[0]} y={150} size={74} rot={-1.5} segs={[{ t: "쓰자마자 나오는 " }, { t: "내 고민 동물", hl: true }]} />}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            marginTop: 140,
            transform: `translateY(${interpolate(drop, [0, 1], [-1500, 0])}px) rotate(${interpolate(drop, [0, 1], [-25, -2]) + tremble * 0.3}deg) translateX(${tremble}px) scale(${pulse * punch})`,
            perspective: 2200,
          }}
        >
          <div style={{ transform: `rotateY(${flip}deg)`, transformStyle: "preserve-3d" }}>
            {showFront ? (
              <Polaroid animal={RACCOON} develop={develop} tape={frame >= 330} tapeAt={330 - S.tension[0]} />
            ) : (
              <div style={{ transform: "rotateY(180deg)" }}>
                <PolaroidBack />
              </div>
            )}
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fffdf6", opacity: flash, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

// ================================================================== 3. 다른 동물들 (12~14초)
const OTHERS: AnimalInfo[] = [
  { emoji: "🦉", name: "새벽 3시 부엉이", quote: "벌써 3시야?", bg: C.noteV },
  { emoji: "🐙", name: "갈팡질팡 문어", quote: "다리 좀 정리할게", bg: C.noteP },
  { emoji: "🐈", name: "삐진 고양이", quote: "흥. 안 삐졌어", bg: C.noteY },
  { emoji: "🐹", name: "볼 빵빵 햄스터", quote: "이건 나중에 필요해", bg: C.noteG },
];

const Carousel: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <CorkBg />
      {OTHERS.map((a, i) => {
        const at = i * B;
        const inP = interpolate(frame, [at, at + 5], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
        const outP = i < OTHERS.length - 1 ? interpolate(frame, [at + B, at + B + 5], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) }) : interpolate(frame, [56, 60], [0, 1], clamp);
        if (frame < at || outP >= 1) return null;
        const rot = i % 2 ? 4 : -4;
        return (
          <AbsoluteFill key={a.name} style={{ alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                marginTop: 60,
                transform: `translateX(${inP * 1100 - outP * 1100}px) rotate(${rot + inP * 18 - outP * 18}deg) scale(${beatPulse(frame, 0.025)})`,
              }}
            >
              <Polaroid animal={a} width={660} />
            </div>
          </AbsoluteFill>
        );
      })}
      <div
        style={{
          position: "absolute",
          top: 170,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: F.mono,
          fontWeight: 600,
          fontSize: 44,
          letterSpacing: "0.12em",
          color: C.ink,
        }}
      >
        {String(Math.min(4, Math.floor(frame / B) + 1)).padStart(2, "0")} / 04
      </div>
    </AbsoluteFill>
  );
};

// ================================================================== 4. 너는? (14~16초)
const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const s = useSlam(0, { from: 1.5, stiffness: 300 });
  const wiggle = Math.sin(frame * 0.5) * 2;
  return (
    <AbsoluteFill>
      <CorkBg />
      <Caption at={15} y={170} size={92} segs={[{ t: "너는 " }, { t: "뭐가", hl: true }, { t: " 나올까" }]} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ marginTop: 150, transform: `translateY(${s.y}px) scale(${s.scale * beatPulse(frame, 0.02)}) rotate(${-3 + wiggle + s.wobble}deg)`, opacity: s.opacity }}>
          <Pin size={44} style={{ left: "50%", marginLeft: -22, top: -16 }} />
          <Polaroid animal={null} width={640} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ================================================================== 5. 방송 (16~18초)
const CHAT = [
  { at: 15, n: "뛰는 다람쥐", t: "이거 완전 나잖아" },
  { at: 23, n: "출근하는 펭귄", t: "먼저 연락하는 쪽이 이기는 거" },
  { at: 30, n: "낮잠 자는 고슴도치", t: "라쿤 나왔다 ㅋㅋ" },
  { at: 38, n: "줄넘기하는 하마", t: "나도 이번 주에 보낼래" },
  { at: 45, n: "별 보는 수달", t: "공감 백 개" },
];

const Live: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const open = spring({ frame, fps, config: { damping: 16, stiffness: 160 } });
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <AbsoluteFill>
      <CorkBg dim={0.1} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 260, transform: `scaleY(${open})`, transformOrigin: "50% 0%" }}>
        {/* 방송 화면 */}
        <div style={{ background: "#1d1610", padding: 18, boxShadow: "0 40px 60px -24px rgba(30, 18, 8, 0.7)" }}>
          <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#2a2017", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 22, top: 22, display: "flex", alignItems: "center", gap: 10, background: C.red, color: "#fff", padding: "6px 16px", fontFamily: F.mono, fontWeight: 600, fontSize: 26, zIndex: 2 }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", opacity: blink ? 1 : 0.3 }} />
              LIVE
            </div>
            <div
              style={{
                position: "absolute",
                left: "12%",
                right: "12%",
                top: "13%",
                bottom: "-6%",
                background: C.poster,
                padding: "46px 46px",
                boxSizing: "border-box",
                transform: `translateY(${interpolate(frame, [4, 14], [400, 0], { ...clamp, easing: Easing.out(Easing.cubic) })}px) rotate(-1deg)`,
              }}
            >
              <Tape style={{ left: "50%", marginLeft: -95, top: -24, transform: "rotate(-3deg)" }} />
              <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 22, color: C.dim }}>No.0127</div>
              <div style={{ fontFamily: F.soft, fontSize: 46, color: C.ink, margin: "10px 0 22px", letterSpacing: "-0.03em" }}>늦은 친구 두고 간 나, 잘못?</div>
              {[0.95, 0.88, 0.92, 0.6].map((w, i) => (
                <div key={i} style={{ height: 14, width: `${w * 100}%`, background: "rgba(43,33,24,0.16)", marginBottom: 22 }} />
              ))}
            </div>
          </div>
        </div>
        {/* 채팅 */}
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 18 }}>
          {CHAT.map((c) => {
            if (frame < c.at) return null;
            const p = spring({ frame: frame - c.at, fps, config: { damping: 14, stiffness: 300 } });
            return (
              <div
                key={c.n}
                style={{
                  alignSelf: "flex-start",
                  background: C.poster,
                  padding: "18px 30px",
                  boxShadow: "0 10px 16px -8px rgba(60, 36, 14, 0.45)",
                  fontFamily: F.bold,
                  fontWeight: 700,
                  fontSize: 42,
                  color: C.ink,
                  transform: `translateY(${(1 - p) * 40}px) scale(${0.85 + 0.15 * p})`,
                  opacity: p,
                  transformOrigin: "0% 100%",
                }}
              >
                <span style={{ color: C.red, fontWeight: 800, marginRight: 18 }}>{c.n}</span>
                {c.t}
              </div>
            );
          })}
        </div>
      </div>
      <Caption at={10} y={110} size={74} rot={1.5} segs={[{ t: "방송에서 " }, { t: "같이", hl: true }, { t: " 읽고, 같이 고민해" }]} />
    </AbsoluteFill>
  );
};

// ================================================================== 6. 마무리 (18~22초)
const End: React.FC<{ siteUrl: string }> = ({ siteUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = useSlam(0, { from: 1.4 });
  const underline = interpolate(frame, [8, 16], [0, 100], { ...clamp, easing: Easing.out(Easing.cubic) });
  const write = interpolate(frame, [30, 56], [0, 100], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const brand = spring({ frame: frame - 60, fps, config: { damping: 12, stiffness: 260 } });
  const url = spring({ frame: frame - 15, fps, config: { damping: 13, stiffness: 300 } });
  return (
    <AbsoluteFill>
      <CorkBg />
      <AbsoluteFill style={{ alignItems: "center" }}>
        <div
          style={{
            position: "relative",
            marginTop: 260,
            width: 880,
            background: C.poster,
            padding: "110px 70px 80px",
            boxSizing: "border-box",
            boxShadow: "0 40px 60px -24px rgba(50, 30, 10, 0.6)",
            transformOrigin: "50% 0%",
            transform: `translateY(${s.y}px) scale(${s.scale * (frame > 20 ? beatPulse(frame, 0.01) : 1)}) rotate(${-1.5 + s.wobble}deg)`,
            opacity: s.opacity,
          }}
        >
          <Pin size={46} style={{ left: "50%", marginLeft: -23, top: -14 }} />
          <div style={{ fontFamily: F.bold, fontWeight: 900, fontSize: 132, lineHeight: 1.08, letterSpacing: "-0.05em", color: C.ink }}>
            고민 쪽지
            <br />
            <span
              style={{
                backgroundImage: `linear-gradient(${C.marker}, ${C.marker})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: `${underline}% 42%`,
                backgroundPosition: "0 86%",
              }}
            >
              붙이러 가기
            </span>
          </div>
          <div
            style={{
              marginTop: 56,
              display: "inline-flex",
              alignItems: "center",
              gap: 20,
              background: C.ink,
              color: C.poster,
              padding: "22px 34px",
              fontFamily: F.mono,
              fontWeight: 600,
              fontSize: 38,
              whiteSpace: "nowrap",
              transform: `scale(${interpolate(url, [0, 1], [0.6, 1])})`,
              opacity: interpolate(url, [0, 0.3], [0, 1], clamp),
              transformOrigin: "0% 50%",
            }}
          >
            {siteUrl}
            <svg width="40" height="40" viewBox="0 0 24 24">
              <path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" />
            </svg>
          </div>
        </div>
        {/* 손글씨 한마디 (펜으로 쓰듯 왼쪽부터) */}
        <div
          style={{
            marginTop: 70,
            fontFamily: F.hand,
            fontSize: 118,
            color: C.red,
            transform: "rotate(-4deg)",
            clipPath: `inset(-20% ${100 - write}% -20% 0)`,
          }}
        >
          오늘도 고생했어
        </div>
        <div
          style={{
            marginTop: 70,
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontFamily: F.soft,
            fontSize: 56,
            color: C.ink,
            transform: `translateY(${(1 - brand) * 30}px)`,
            opacity: interpolate(brand, [0, 0.4], [0, 1], clamp),
          }}
        >
          <span style={{ width: 30, height: 30, borderRadius: "50%", background: "radial-gradient(circle at 34% 30%, #ff9a8a, #d9483b 48%, #9e2c24)" }} />
          다웅 고민 사연함
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
