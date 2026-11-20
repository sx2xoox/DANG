import React from "react";
import { AbsoluteFill, Audio, interpolate, Easing, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import tl from "./timeline.json";
import { C, Caption, CorkBg, F, Mascot, Pin, Polaroid, PolaroidBack, PostIt, shakeAt, Tape, useFonts, useSlam, type AnimalInfo } from "./parts";

export type ShortsProps = { siteUrl: string };

const S = tl.scenes;
const M = tl.marks;
const len = (k: keyof typeof S) => S[k][1] - S[k][0];

// 화면이 흔들리는 순간은 힘줄 곳 몇 군데뿐 (첫 자막, 우표, 공개, 물음표 카드, 마무리)
const HITS = [
  { f: tl.notes[0], power: 4 },
  { f: M.caption1, power: 9 },
  { f: M.stamp, power: 10 },
  { f: M.flip, power: 16 },
  { f: M.question, power: 9 },
  { f: M.endSlam, power: 7 },
];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Shorts: React.FC<ShortsProps> = ({ siteUrl }) => {
  useFonts();
  const frame = useCurrentFrame();
  const shake = shakeAt(frame, HITS);
  return (
    <AbsoluteFill style={{ background: C.cork, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        <Sequence from={0} durationInFrames={S.phone[1]} name="쪽지 보드 + 휴대폰">
          <BoardAndPhone />
        </Sequence>
        <Sequence from={S.reveal[0]} durationInFrames={len("reveal")} name="두근두근 → 공개">
          <Reveal />
        </Sequence>
        <Sequence from={S.cards[0]} durationInFrames={S.question[1] - S.cards[0]} name="다른 동물들 → 너는?">
          <Cards />
        </Sequence>
        <Sequence from={S.live[0]} durationInFrames={len("live")} name="방송에서 같이 읽기">
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

// ================================================================== 1. 쪽지 보드 + 휴대폰
// 쪽지가 하나씩 천천히 붙다가 점점 빨라져서 보드가 다닥다닥 찹니다 (붙는 시각은 timeline.json 의 notes)
const TEXTS = [
  "시험 망했는데\n엄마한테\n뭐라 하지",
  "단톡방 약속,\n나 빼고 잡힘",
  "썸인지 아닌지\n모르겠음",
  "하고 싶은 게\n없어서 불안해",
  "반 바뀌고\n친구가 없어",
  "친구가 내 뒷담\n한 것 같아",
  "용돈이 벌써\n바닥났어",
  "고백할까\n말까",
  "언니랑 또\n싸웠어",
  "발표 생각에\n잠이 안 와",
  "꿈이 뭔지\n모르겠어",
  "답장이\n안 와",
  "학원 가기\n너무 싫다",
  "성적표\n어디 숨기지",
  "친구 생일\n깜빡했어",
  "전학 가기\n싫어",
  "급식 혼자\n먹기 싫어",
  "짝사랑\n3년째",
  "게임 그만하라는\n잔소리",
  "키가\n안 커",
  "말실수\n했어",
  "친구랑\n어색해",
  "늦잠\n또 잤어",
  "비밀\n들켰어",
  "숙제\n안 했다",
  "다\n귀찮아",
  "야식\n못 끊겠어",
  "나만\n뒤처진 기분",
  "나\n왜 이러지",
];
const NOTE_COLORS = [C.noteY, C.noteP, C.noteB, C.noteG, C.noteV, C.noteO];
const rand = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const NOTES = (() => {
  const cx = 540;
  const cy = 960;
  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 4; c++) {
      const i = r * 4 + c;
      let x = 135 + c * 270 + (rand(i, 1) - 0.5) * 80;
      let y = 160 + r * 268 + (rand(i, 2) - 0.5) * 80;
      // 가운데 큰 쪽지를 가리지 않게 가까운 칸은 바깥으로 밀어냄
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d < 410) {
        const k = 410 / Math.max(d, 1);
        x = cx + dx * k;
        y = cy + dy * k;
      }
      cells.push({ x, y });
    }
  }
  // 가운데에서 가까운 칸부터 채워서, 화면이 물러나는 동안 바깥으로 번져 나가게
  cells.sort((a, b) => Math.hypot((a.x - cx) * 1.8, a.y - cy) - Math.hypot((b.x - cx) * 1.8, b.y - cy));
  const hero = { at: tl.notes[0], x: cx, y: cy, rot: -3, color: C.noteY, text: TEXTS[0], size: 470, fontSize: 78, z: 100 };
  const rest = cells.map((c, i) => {
    const size = i < 6 ? 370 : i < 14 ? 330 : 300;
    return {
      at: tl.notes[i + 1],
      x: c.x,
      y: c.y,
      rot: (rand(i, 3) - 0.5) * 16,
      color: NOTE_COLORS[(i + 1) % NOTE_COLORS.length],
      text: TEXTS[i + 1],
      size,
      fontSize: size * 0.17,
      z: i + 2,
    };
  });
  return [hero, ...rest];
})();

const BoardAndPhone: React.FC = () => {
  const frame = useCurrentFrame();
  // 첫 쪽지를 가까이서 보다가, 쪽지가 늘어나는 만큼 화면이 물러남
  const zoom = interpolate(frame, [0, 190], [1.75, 1.0], { ...clamp, easing: Easing.out(Easing.quad) });
  const phoneIn = frame >= S.phone[0];
  const blur = interpolate(frame, [S.phone[0] - 2, S.phone[0] + 8], [0, 7], clamp);
  const dim = interpolate(frame, [M.caption1 - 2, M.caption1 + 6], [0, 0.3], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, filter: `blur(${blur}px)` }}>
        <CorkBg />
        {NOTES.map((n, i) => (
          <PostIt key={i} {...n} />
        ))}
        <AbsoluteFill style={{ background: `rgba(30, 20, 10, ${dim})`, zIndex: 200 }} />
      </AbsoluteFill>
      <Caption at={M.caption1} y={820} size={104} segs={[{ t: "이 고민, " }, { t: "어디다", hl: true }, { t: " 말해?" }]} out={S.phone[0] - 6} />
      {phoneIn && <Phone />}
      <Caption at={M.tap + 12} y={120} size={78} rot={1.5} segs={[{ t: "이름 없이, " }, { t: "1분이면 끝", hl: true }]} out={M.phoneOut - 2} />
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
  const exit = interpolate(frame, [M.phoneOut, M.phoneOut + 6], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  // 화면 안 단계: 학년대 → 온도 → 우표
  const step = frame < M.slide1 ? 0 : frame < M.slide2 ? 1 : 2;
  const slide = (start: number) => interpolate(frame, [start, start + 6], [100, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const offset = step === 1 ? slide(M.slide1) : step === 2 ? slide(M.slide2) : 0;
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
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.body, fontSize: 42, color: C.dim }}>
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

const stepTitle: React.CSSProperties = { fontFamily: F.body, fontSize: 82, whiteSpace: "nowrap", color: C.ink, letterSpacing: "-0.03em", margin: "10px 56px 48px", lineHeight: 1.2 };

const StepAge: React.FC = () => {
  const frame = useCurrentFrame();
  const picked = frame >= M.tap;
  const ripple = interpolate(frame, [M.tap, M.tap + 10], [0, 1], clamp);
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
                fontFamily: F.body,
                fontSize: 66,
                transform: on ? `scale(${1 + 0.05 * Math.exp(-(frame - M.tap) / 3)})` : undefined,
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
  const t = Math.round(interpolate(frame, [M.tempFrom, M.tempTo], [18, 82], { ...clamp, easing: Easing.inOut(Easing.cubic) }));
  const label = t < 30 ? "가끔 생각나" : t < 60 ? "며칠째 신경 쓰여" : "머릿속이 꽉 찼어";
  const col = tempColor(t);
  return (
    <div>
      <div style={stepTitle}>이 고민, 몇 도쯤?</div>
      <div style={{ margin: "40px 56px 0", textAlign: "center" }}>
        <div style={{ fontFamily: F.display, fontWeight: 400, fontSize: 220, color: col, lineHeight: 1, letterSpacing: "-0.05em" }}>{t}°</div>
        <div style={{ fontFamily: F.hand, fontSize: 84, color: C.ink, marginTop: 20 }}>{label}</div>
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
  const hit = spring({ frame: frame - M.stamp, fps, config: { damping: 9, stiffness: 400, mass: 0.5 } });
  return (
    <div>
      <div style={stepTitle}>지금 기분을 우표로</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 34, margin: "10px 56px" }}>
        {STAMPS.map((s, i) => {
          const on = i === 0 && frame >= M.stamp;
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
                fontFamily: F.display,
                fontWeight: 400,
                fontSize: 34,
                transform: on ? `scale(${interpolate(hit, [0, 1], [1.7, 1])}) rotate(${interpolate(hit, [0, 1], [-14, -4])}deg)` : `rotate(${(i % 2 ? 2 : -2)}deg)`,
                boxShadow: on ? `0 0 0 10px ${C.ink}` : "0 6px 10px rgba(0,0,0,0.15)",
                opacity: frame >= M.stamp && !on ? 0.45 : 1,
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

// ================================================================== 2. 두근두근 → 공개
const RACCOON: AnimalInfo = { id: "raccoon", name: "곱씹는 라쿤", quote: "그때 이렇게 말했으면…?", bg: C.noteB };

const Reveal: React.FC = () => {
  const base = S.reveal[0];
  const frame = useCurrentFrame() + base;
  const { fps } = useVideoConfig();
  const drop = spring({ frame: frame - M.drop, fps, config: { damping: 12, stiffness: 140 } });
  // 심장 박동 (두 번씩 쿵쿵)
  let pulse = 1;
  for (const h of M.heart.flatMap((f) => [f, f + 5])) {
    const d = frame - h;
    if (d >= 0 && d < 8) pulse += 0.045 * Math.exp(-d / 2);
  }
  // 공개 직전 떨림이 점점 커짐
  const tremble = frame >= M.tremble && frame < M.flip ? Math.sin(frame * 3.3) * interpolate(frame, [M.tremble, M.flip], [0, 9]) : 0;
  const flip = interpolate(frame, [M.flip, M.flip + 9], [180, 0], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  const develop = interpolate(frame, [M.flip + 3, M.flip + 32], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const flash = frame >= M.flip ? interpolate(frame, [M.flip, M.flip + 7], [0.95, 0], clamp) : 0;
  const punch = frame >= M.flip ? 1 + 0.09 * Math.exp(-(frame - M.flip) / 5) : 1;
  const dim = frame < M.flip ? interpolate(frame, [M.drop, M.flip - 10], [0.15, 0.55], clamp) : interpolate(frame, [M.flip, M.flip + 6], [0.55, 0.05], clamp);
  const showFront = flip < 90;
  return (
    <AbsoluteFill>
      <CorkBg dim={dim} />
      {frame < M.flip && <Caption at={M.drop + 15 - base} y={210} size={82} segs={[{ t: "내 고민 동물은" }]} />}
      {frame >= M.flip && <Caption at={M.flip + 15 - base} y={150} size={74} rot={-1.5} segs={[{ t: "쓰자마자 나오는 " }, { t: "내 고민 동물", hl: true }]} />}
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
              <Polaroid animal={RACCOON} develop={develop} tape={frame >= M.tapeOn} tapeAt={M.tapeOn - base} />
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

// ================================================================== 3. 다른 동물들 → 너는?
const OTHERS: (AnimalInfo & { x: number; y: number; rot: number })[] = [
  { id: "cat", name: "삐진 고양이", quote: "흥. 안 삐졌어", bg: C.noteY, x: 285, y: 520, rot: -4 },
  { id: "hamster", name: "볼 빵빵 햄스터", quote: "이건 나중에 필요해", bg: C.noteG, x: 795, y: 560, rot: 3 },
  { id: "fox", name: "눈치 보는 여우", quote: "지금 말해도 되나", bg: C.noteO, x: 290, y: 1040, rot: 3 },
  { id: "penguin", name: "현타 온 펭귄", quote: "나 뭐 하고 있지", bg: C.noteV, x: 800, y: 1080, rot: -3 },
  { id: "hedgehog", name: "웅크린 고슴도치", quote: "조금 있다 나갈게", bg: C.noteP, x: 280, y: 1560, rot: -3 },
  { id: "capybara", name: "멍 때리는 카피바라", quote: "일단 좀 쉬자", bg: C.noteB, x: 795, y: 1600, rot: 4 },
];
const CARD_W = 400;
const CARD_H = CARD_W + 170 - 32;

const Cards: React.FC = () => {
  const base = S.cards[0];
  const frame = useCurrentFrame() + base;
  const { fps } = useVideoConfig();
  const asked = frame >= M.question;
  const back = interpolate(frame, [M.question - 2, M.question + 6], [0, 1], clamp);
  const s = useSlam(M.question - base, { from: 1.5, stiffness: 300 });
  return (
    <AbsoluteFill>
      <CorkBg />
      {/* 카드를 나눠 주듯 한 장씩, 점점 빠르게 */}
      <AbsoluteFill style={{ filter: `blur(${back * 5}px)`, transform: `scale(${1 - back * 0.04})` }}>
        {OTHERS.map((a, i) => {
          const at = M.deal[i];
          if (frame < at) return null;
          const p = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 170, mass: 0.7 } });
          const fromX = i % 2 ? 1500 : -500;
          return (
            <div
              key={a.id}
              style={{
                position: "absolute",
                left: a.x - CARD_W / 2,
                top: a.y - CARD_H / 2,
                transform: `translate(${(1 - p) * (fromX - a.x)}px, ${(1 - p) * 700}px) rotate(${a.rot + (1 - p) * (i % 2 ? 30 : -30)}deg)`,
                zIndex: i + 1,
              }}
            >
              <Polaroid animal={a} width={CARD_W} />
            </div>
          );
        })}
        <AbsoluteFill style={{ background: `rgba(30, 20, 10, ${back * 0.42})`, zIndex: 10 }} />
      </AbsoluteFill>
      <Caption at={M.deal[5] + 6 - base} y={100} size={84} segs={[{ t: "사연마다 " }, { t: "다른 동물", hl: true }]} out={M.question - 5 - base} />
      {asked && (
        <>
          <Caption at={M.question + 10 - base} y={190} size={96} segs={[{ t: "너는 " }, { t: "뭐가", hl: true }, { t: " 나올까" }]} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", zIndex: 15 }}>
            <div style={{ marginTop: 170, transform: `translateY(${s.y}px) scale(${s.scale}) rotate(${-3 + s.wobble}deg)`, opacity: s.opacity }}>
              <Pin size={44} style={{ left: "50%", marginLeft: -22, top: -16 }} />
              <Polaroid animal={null} width={620} />
            </div>
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  );
};

// ================================================================== 4. 방송에서 같이 읽고, 채팅으로 의견 나누기
const STORY = ["친구가 30분째 안 와서", "먼저 들어갔어. 영화 끝나고", "보니 삐져서 말을 안 해.", "내가 잘못한 거야?"];
const CHAT = [
  { id: "squirrel", n: "뛰는 다람쥐", t: "30분이면 나도 들어감", bg: C.noteO },
  { id: "penguin", n: "출근하는 펭귄", t: "그래도 연락은 했어야지", bg: C.noteV },
  { id: "hedgehog", n: "낮잠 자는 고슴도치", t: "둘 다 이해돼서 어렵다", bg: C.noteP },
  { id: "rabbit", n: "줄넘기하는 토끼", t: "먼저 미안하다 하면 끝", bg: C.noteG },
  { id: "seal", n: "별 보는 물범", t: "이거 완전 내 얘기", bg: C.noteB },
  { id: "chick", n: "졸린 병아리", t: "나도 이번 주에 보낼래", bg: C.noteY },
];
const PICKED = 3;

const Live: React.FC = () => {
  const base = S.live[0];
  const frame = useCurrentFrame() + base;
  const { fps } = useVideoConfig();
  const open = spring({ frame: frame - base, fps, config: { damping: 16, stiffness: 160 } });
  const blink = Math.floor(frame / 12) % 2 === 0;
  const read = interpolate(frame, [M.readFrom, M.readTo], [0, STORY.length], clamp);
  const cat = spring({ frame: frame - (base + 16), fps, config: { damping: 11, stiffness: 200 } });
  const pick = spring({ frame: frame - M.pick, fps, config: { damping: 12, stiffness: 240 } });
  const pickHl = interpolate(frame, [M.pick + 2, M.pick + 12], [0, 100], clamp);
  return (
    <AbsoluteFill>
      <CorkBg dim={0.1} />
      <div style={{ position: "absolute", left: 50, right: 50, top: 270, transform: `scaleY(${open})`, transformOrigin: "50% 0%" }}>
        {/* 방송 화면 */}
        <div style={{ background: "#1d1610", padding: 16, boxShadow: "0 40px 60px -24px rgba(30, 18, 8, 0.7)" }}>
          <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#2a2017", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: 22, top: 22, display: "flex", alignItems: "center", gap: 10, background: C.red, color: "#fff", padding: "6px 16px", fontFamily: F.mono, fontWeight: 600, fontSize: 26, zIndex: 2 }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", opacity: blink ? 1 : 0.3 }} />
              LIVE
            </div>
            {/* 사연 카드 */}
            <div
              style={{
                position: "absolute",
                left: "4%",
                right: "27%",
                top: "12%",
                bottom: "-6%",
                background: C.poster,
                padding: "34px 34px",
                boxSizing: "border-box",
                transform: `translateY(${interpolate(frame, [base + 4, base + 14], [420, 0], { ...clamp, easing: Easing.out(Easing.cubic) })}px) rotate(-1deg)`,
              }}
            >
              <Tape style={{ left: "50%", marginLeft: -95, top: -24, transform: "rotate(-3deg)" }} />
              <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 22, color: C.dim }}>No.0127</div>
              <div style={{ fontFamily: F.body, fontSize: 50, color: C.ink, margin: "6px 0 18px", letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>늦은 친구 두고 간 나, 잘못?</div>
              {/* 읽는 줄을 형광펜이 따라감 */}
              {STORY.map((line, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <span
                    style={{
                      fontFamily: F.body,
                      fontSize: 40,
                      color: C.ink,
                      whiteSpace: "nowrap",
                      backgroundImage: `linear-gradient(${C.marker}, ${C.marker})`,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: `${Math.max(0, Math.min(1, read - i)) * 100}% 62%`,
                      backgroundPosition: "0 70%",
                    }}
                  >
                    {line}
                  </span>
                </div>
              ))}
            </div>
            {/* 이 사연의 고민 동물 */}
            <div style={{ position: "absolute", right: "2.5%", bottom: "5%", width: 220, textAlign: "center", transform: `translateY(${(1 - cat) * 320}px)` }}>
              <Mascot id="cat" size={220} style={{ filter: "drop-shadow(0 10px 8px rgba(0,0,0,0.4))" }} />
              <div style={{ display: "inline-block", marginTop: 6, background: C.poster, color: C.ink, fontFamily: F.body, fontSize: 28, padding: "4px 14px", transform: "rotate(-2deg)" }}>삐진 고양이</div>
            </div>
          </div>
        </div>
        {/* 채팅: 의견이 하나씩 올라옴 */}
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 16 }}>
          {CHAT.map((c, i) => {
            const at = M.chat[i];
            if (frame < at) return null;
            const p = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 260 } });
            const on = i === PICKED && frame >= M.pick;
            const others = frame >= M.pick && !on ? 1 - 0.45 * Math.min(1, pick) : 1;
            return (
              <div
                key={c.id}
                style={{
                  position: "relative",
                  alignSelf: "flex-start",
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  background: C.poster,
                  padding: "14px 34px 14px 16px",
                  boxShadow: on ? "0 22px 30px -12px rgba(60, 36, 14, 0.6)" : "0 10px 16px -8px rgba(60, 36, 14, 0.45)",
                  transform: `translateY(${(1 - p) * 40}px) scale(${(0.85 + 0.15 * p) * (on ? 1 + 0.06 * pick : 1)}) rotate(${on ? -1.5 * pick : 0}deg)`,
                  opacity: p * others,
                  transformOrigin: "0% 100%",
                  zIndex: on ? 3 : 1,
                }}
              >
                {on && <Pin size={34} style={{ left: -8, top: -12, transform: `scale(${pick})` }} />}
                <div style={{ width: 96, height: 96, borderRadius: "50%", background: c.bg, display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}>
                  <Mascot id={c.id} size={92} style={{ marginTop: 14 }} />
                </div>
                <div>
                  <div style={{ fontFamily: F.body, fontSize: 32, color: C.red, lineHeight: 1.1 }}>{c.n}</div>
                  <div style={{ fontFamily: F.body, fontSize: 54, color: C.ink, lineHeight: 1.15, whiteSpace: "nowrap" }}>
                    <span
                      style={
                        on
                          ? { backgroundImage: `linear-gradient(${C.marker}, ${C.marker})`, backgroundRepeat: "no-repeat", backgroundSize: `${pickHl}% 50%`, backgroundPosition: "0 80%" }
                          : undefined
                      }
                    >
                      {c.t}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Caption at={10} y={100} size={80} rot={1.5} segs={[{ t: "방송에서 " }, { t: "같이 읽고", hl: true }]} out={M.chat[1] + 8 - base} />
      <Caption at={M.chat[1] + 14 - base} y={100} size={80} rot={-1.5} segs={[{ t: "채팅으로 " }, { t: "같이 고민해", hl: true }]} />
    </AbsoluteFill>
  );
};

// ================================================================== 5. 마무리
const CREW = ["raccoon", "cat", "hamster", "fox", "penguin"];

const End: React.FC<{ siteUrl: string }> = ({ siteUrl }) => {
  const base = S.end[0];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = useSlam(0, { from: 1.4 });
  const underline = interpolate(frame, [8, 16], [0, 100], { ...clamp, easing: Easing.out(Easing.cubic) });
  const write = interpolate(frame, [M.pen - base, M.pen - base + 26], [0, 100], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const brand = spring({ frame: frame - (M.brand - base), fps, config: { damping: 12, stiffness: 260 } });
  const url = spring({ frame: frame - 15, fps, config: { damping: 13, stiffness: 300 } });
  return (
    <AbsoluteFill>
      <CorkBg />
      <AbsoluteFill style={{ alignItems: "center" }}>
        <div
          style={{
            position: "relative",
            marginTop: 250,
            width: 880,
            background: C.poster,
            padding: "110px 70px 80px",
            boxSizing: "border-box",
            boxShadow: "0 40px 60px -24px rgba(50, 30, 10, 0.6)",
            transformOrigin: "50% 0%",
            transform: `translateY(${s.y}px) scale(${s.scale}) rotate(${-1.5 + s.wobble}deg)`,
            opacity: s.opacity,
          }}
        >
          <Pin size={46} style={{ left: "50%", marginLeft: -23, top: -14 }} />
          <div style={{ fontFamily: F.display, fontWeight: 400, fontSize: 132, lineHeight: 1.08, letterSpacing: "-0.05em", color: C.ink }}>
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
            marginTop: 60,
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
            marginTop: 56,
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontFamily: F.body,
            fontSize: 70,
            color: C.ink,
            transform: `translateY(${(1 - brand) * 30}px)`,
            opacity: interpolate(brand, [0, 0.4], [0, 1], clamp),
          }}
        >
          <span style={{ width: 30, height: 30, borderRadius: "50%", background: "radial-gradient(circle at 34% 30%, #ff9a8a, #d9483b 48%, #9e2c24)" }} />
          다웅 고민 사연함
        </div>
      </AbsoluteFill>
      {/* 고민 동물들이 아래에서 하나씩 올라옴 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
        {CREW.map((id, i) => {
          const p = spring({ frame: frame - (36 + i * 5), fps, config: { damping: 11, stiffness: 190 } });
          return (
            <div key={id} style={{ margin: "0 -24px", transform: `translateY(${(1 - p) * 520}px) rotate(${(i - 2) * 3}deg)` }}>
              <Mascot id={id} size={i === 2 ? 280 : 250} style={{ filter: "drop-shadow(0 12px 10px rgba(60, 36, 14, 0.3))" }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
