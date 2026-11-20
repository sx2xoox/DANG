import { useId } from "react";

/* =====================================================================
   고민 동물 마스코트 (우리 사이트 그림체)

   고정되는 것: 같은 몸통, 같은 굵기의 손그림 외곽선, 점 눈, 빗금 볼터치,
               그리고 머리에 붙은 노란 고민 쪽지.
   바뀌는 것:   귀 · 코 · 꼬리 · 무늬 · 색 (어떤 동물인지), 표정 (어떤 고민인지)

   그림 파일이 아니라 부품 조합이라서, 처음 보는 동물도 부품만 고르면 같은 그림체로 나옵니다.
   ===================================================================== */

export type Ears = "none" | "round" | "big" | "pointy" | "long" | "floppy" | "tuft";
export type Nose = "dot" | "tri" | "oval" | "beak" | "bill" | "snout" | "none";
export type Tail = "none" | "long" | "bushy" | "ring" | "puff";
export type Mark =
  | "muzzle" // 주둥이 밝은 부분
  | "belly" // 배 밝은 부분
  | "mask" // 눈 주위 가면 (라쿤, 판다)
  | "discs" // 눈 주위 둥근 판 (부엉이)
  | "tabby" // 이마 줄무늬
  | "spots" // 점박이
  | "cheeks" // 볼주머니
  | "patch" // 한쪽 눈 얼룩
  | "spikes" // 등 가시
  | "shell" // 등딱지
  | "tentacles" // 다리 여러 개
  | "wings" // 날개 · 지느러미
  | "mane"; // 갈기
export type Mood = "calm" | "worry" | "teary" | "angry" | "dizzy" | "happy" | "blank" | "sleepy";

export type Look = {
  body: string;
  second: string;
  ears: Ears;
  nose: Nose;
  tail: Tail;
  marks: Mark[];
};

const INK = "#2b2118";
const CREAM = "#fff8ea";
const SW = 5;

/** 자주 나오는 동물은 미리 정해 둔 생김새를 씁니다. 없는 동물은 AI 가 부품을 직접 골라요. */
export const SPECIES: Record<string, Look> = {
  라쿤: { body: "#bdb6ac", second: "#4a4038", ears: "pointy", nose: "dot", tail: "ring", marks: ["mask", "muzzle"] },
  부엉이: { body: "#c79f74", second: "#8a6444", ears: "tuft", nose: "beak", tail: "none", marks: ["discs", "belly", "wings"] },
  문어: { body: "#f3a3ae", second: "#e07a8b", ears: "none", nose: "none", tail: "none", marks: ["tentacles", "spots"] },
  고양이: { body: "#f6cf83", second: "#d99c3c", ears: "pointy", nose: "tri", tail: "long", marks: ["tabby", "muzzle"] },
  햄스터: { body: "#f3c58a", second: "#fff3df", ears: "round", nose: "dot", tail: "none", marks: ["cheeks", "belly"] },
  강아지: { body: "#f4e6cc", second: "#a8794f", ears: "floppy", nose: "dot", tail: "long", marks: ["patch", "muzzle"] },
  토끼: { body: "#fbf5ec", second: "#f3b3bd", ears: "long", nose: "tri", tail: "puff", marks: [] },
  펭귄: { body: "#454c5e", second: "#2f3545", ears: "none", nose: "beak", tail: "none", marks: ["belly", "wings"] },
  거북이: { body: "#abd38f", second: "#6f9a58", ears: "none", nose: "none", tail: "none", marks: ["shell"] },
  여우: { body: "#f0935a", second: "#fff3df", ears: "pointy", nose: "dot", tail: "bushy", marks: ["muzzle", "cheeks"] },
  코알라: { body: "#b7bcc4", second: "#eef0f3", ears: "big", nose: "oval", tail: "none", marks: ["belly"] },
  고슴도치: { body: "#f3dcc0", second: "#8a6248", ears: "round", nose: "dot", tail: "none", marks: ["spikes"] },
  미어캣: { body: "#dcb98a", second: "#6b513a", ears: "round", nose: "dot", tail: "long", marks: ["mask", "belly"] },
  거위: { body: "#fbf8f1", second: "#e9e2d2", ears: "none", nose: "bill", tail: "none", marks: ["wings"] },
  카피바라: { body: "#b98c5f", second: "#8f6842", ears: "round", nose: "snout", tail: "none", marks: [] },
  치타: { body: "#f5cf74", second: "#6b4a2a", ears: "round", nose: "tri", tail: "long", marks: ["spots", "muzzle"] },
  나무늘보: { body: "#b9a184", second: "#6b513a", ears: "none", nose: "dot", tail: "none", marks: ["mask", "muzzle"] },
  해달: { body: "#9a7658", second: "#f3e3cc", ears: "round", nose: "tri", tail: "none", marks: ["muzzle", "belly"] },
  앵무새: { body: "#8fd08a", second: "#f2c94c", ears: "tuft", nose: "beak", tail: "none", marks: ["belly", "wings"] },
  경주마: { body: "#b98558", second: "#5a3d28", ears: "pointy", nose: "snout", tail: "bushy", marks: ["mane"] },
  사자: { body: "#f2c773", second: "#c7873a", ears: "round", nose: "tri", tail: "long", marks: ["mane", "muzzle"] },
  판다: { body: "#fbf8f1", second: "#3b3632", ears: "round", nose: "dot", tail: "none", marks: ["mask"] },
  곰: { body: "#b78a5e", second: "#f3dcc0", ears: "round", nose: "dot", tail: "none", marks: ["muzzle"] },
  다람쥐: { body: "#d59a5b", second: "#fff3df", ears: "round", nose: "dot", tail: "bushy", marks: ["belly", "cheeks"] },
  오리: { body: "#ffe08a", second: "#f5c84a", ears: "none", nose: "bill", tail: "none", marks: ["wings"] },
  돼지: { body: "#f7c0c4", second: "#f09aa3", ears: "floppy", nose: "snout", tail: "none", marks: [] },
};

const DEFAULT_LOOK: Look = { body: "#e9d9c0", second: "#a8855f", ears: "round", nose: "dot", tail: "none", marks: ["muzzle"] };

/** "새벽 3시 부엉이" → 부엉이 생김새. 목록에 없으면 기본 생김새. */
export function lookFor(name: string, custom?: Partial<Look> | null): Look {
  const species = name.trim().split(/\s+/).pop() ?? "";
  return { ...(SPECIES[species] ?? DEFAULT_LOOK), ...(custom ?? {}) };
}

/** 감정 우표 → 표정 */
export const STAMP_MOOD: Record<string, Mood> = {
  unfair: "teary",
  angry: "angry",
  flutter: "happy",
  worry: "worry",
  panic: "dizzy",
  hyeonta: "blank",
  sad: "teary",
};

function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
}

const BODY = "M40,150 C34,108 52,56 100,56 C148,56 166,108 160,150 C158,172 132,177 100,177 C68,177 42,172 40,150 Z";

export function Mascot({
  name,
  look: custom,
  mood = "calm",
  size = 200,
  note = true,
  title,
}: {
  name: string;
  look?: Partial<Look> | null;
  mood?: Mood;
  size?: number;
  note?: boolean;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const L = lookFor(name, custom);
  const has = (m: Mark) => L.marks.includes(m);
  const stroke = { stroke: INK, strokeWidth: SW, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const eyesOnDark = has("mask") || isDark(L.body);
  // 동물마다 선이 조금씩 다르게 흔들리도록
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 97;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={title ?? name} style={{ display: "block", overflow: "visible" }}>
      <defs>
        {/* 손으로 그린 듯 선이 살짝 흔들리게 */}
        <filter id={`wob-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" />
        </filter>
        <clipPath id={`body-${uid}`}>
          <path d={BODY} />
        </clipPath>
      </defs>

      <ellipse cx="100" cy="181" rx="56" ry="7" fill="rgba(43,33,24,0.16)" />

      <g filter={`url(#wob-${uid})`}>
        {/* ---------- 몸 뒤: 꼬리, 등딱지, 가시, 갈기, 다리 ---------- */}
        {L.tail === "long" && (
          <>
            <path d="M150,162 C186,166 192,128 172,116" fill="none" stroke={INK} strokeWidth={15} strokeLinecap="round" />
            <path d="M150,162 C186,166 192,128 172,116" fill="none" stroke={L.body} strokeWidth={6} strokeLinecap="round" />
          </>
        )}
        {(L.tail === "bushy" || L.tail === "ring") && (
          <>
            <path d="M146,168 C192,176 200,120 172,96 C160,110 170,134 146,146 Z" fill={L.tail === "bushy" && has("cheeks") ? L.body : L.body} {...stroke} />
            {L.tail === "ring" && (
              <g stroke={L.second} strokeWidth={8} strokeLinecap="round" fill="none">
                <path d="M171,112 L185,108" />
                <path d="M170,134 L190,134" />
                <path d="M160,154 L182,160" />
              </g>
            )}
            {L.tail === "bushy" && <path d="M172,96 C164,106 166,116 168,122 C178,118 184,110 172,96 Z" fill={CREAM} stroke="none" />}
          </>
        )}
        {L.tail === "puff" && <circle cx="158" cy="162" r="13" fill={CREAM} {...stroke} />}

        {has("shell") && (
          <>
            <ellipse cx="100" cy="136" rx="78" ry="48" fill={L.second} {...stroke} />
            <path d="M30,128 Q100,96 170,128 M40,152 Q100,128 160,152" fill="none" stroke={INK} strokeWidth={3} opacity={0.45} />
          </>
        )}
        {has("spikes") && (
          <path
            d={spikePath()}
            fill={L.second}
            {...stroke}
          />
        )}
        {has("mane") && (
          <g fill={L.second} {...stroke}>
            {maneCircles().map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="17" />
            ))}
          </g>
        )}
        {has("tentacles") &&
          ["M58,158 C36,170 30,190 46,193", "M82,168 C76,184 66,194 80,197", "M118,168 C124,184 134,194 120,197", "M142,158 C164,170 170,190 154,193"].map((d) => (
            <g key={d}>
              <path d={d} fill="none" stroke={INK} strokeWidth={19} strokeLinecap="round" />
              <path d={d} fill="none" stroke={L.body} strokeWidth={10} strokeLinecap="round" />
            </g>
          ))}

        {/* ---------- 귀 ---------- */}
        {L.ears === "round" && (
          <>
            <circle cx="60" cy="72" r="18" fill={L.body} {...stroke} />
            <circle cx="140" cy="72" r="18" fill={L.body} {...stroke} />
            <circle cx="60" cy="73" r="8" fill={has("mask") ? L.second : "#f3b3a6"} />
            <circle cx="140" cy="73" r="8" fill={has("mask") ? L.second : "#f3b3a6"} />
          </>
        )}
        {L.ears === "big" && (
          <>
            <circle cx="48" cy="80" r="27" fill={L.body} {...stroke} />
            <circle cx="152" cy="80" r="27" fill={L.body} {...stroke} />
            <circle cx="48" cy="81" r="14" fill={L.second} />
            <circle cx="152" cy="81" r="14" fill={L.second} />
          </>
        )}
        {L.ears === "pointy" && (
          <>
            <path d="M46,92 L56,36 L94,66 Z" fill={L.body} {...stroke} />
            <path d="M154,92 L144,36 L106,66 Z" fill={L.body} {...stroke} />
            <path d="M58,76 L62,52 L80,66 Z" fill={has("mask") ? L.second : "#f3b3a6"} />
            <path d="M142,76 L138,52 L120,66 Z" fill={has("mask") ? L.second : "#f3b3a6"} />
          </>
        )}
        {L.ears === "long" && (
          <>
            <ellipse cx="78" cy="40" rx="13" ry="36" transform="rotate(-9 78 40)" fill={L.body} {...stroke} />
            <ellipse cx="122" cy="40" rx="13" ry="36" transform="rotate(9 122 40)" fill={L.body} {...stroke} />
            <ellipse cx="78" cy="42" rx="5.5" ry="24" transform="rotate(-9 78 42)" fill={L.second} />
            <ellipse cx="122" cy="42" rx="5.5" ry="24" transform="rotate(9 122 42)" fill={L.second} />
          </>
        )}
        {L.ears === "tuft" && (
          <>
            <path d="M54,82 L52,44 L86,62 Z" fill={L.second} {...stroke} />
            <path d="M146,82 L148,44 L114,62 Z" fill={L.second} {...stroke} />
          </>
        )}

        {/* ---------- 몸통 ---------- */}
        <path d={BODY} fill={L.body} {...stroke} />

        {/* 몸 안쪽 무늬 (몸통 밖으로 나가지 않게) */}
        <g clipPath={`url(#body-${uid})`}>
          {has("belly") && <ellipse cx="100" cy="156" rx="38" ry="30" fill={isDark(L.body) ? "#fbf8f1" : CREAM} />}
          {has("discs") && (
            <>
              <circle cx="78" cy="108" r="23" fill={CREAM} />
              <circle cx="122" cy="108" r="23" fill={CREAM} />
            </>
          )}
          {has("cheeks") && (
            <>
              <ellipse cx="58" cy="130" rx="22" ry="17" fill={CREAM} />
              <ellipse cx="142" cy="130" rx="22" ry="17" fill={CREAM} />
            </>
          )}
          {has("muzzle") && <ellipse cx="100" cy="128" rx="25" ry="17" fill={CREAM} />}
          {has("mask") && (
            <>
              <ellipse cx="77" cy="110" rx="20" ry="14" transform="rotate(-14 77 110)" fill={L.second} />
              <ellipse cx="123" cy="110" rx="20" ry="14" transform="rotate(14 123 110)" fill={L.second} />
            </>
          )}
          {has("patch") && <ellipse cx="122" cy="106" rx="24" ry="22" fill={L.second} />}
          {has("tabby") && (
            <g stroke={L.second} strokeWidth={6} strokeLinecap="round">
              <path d="M62,84 L74,90" />
              <path d="M58,98 L71,100" />
              <path d="M138,84 L126,90" />
              <path d="M142,98 L129,100" />
            </g>
          )}
          {has("spots") && (
            <g fill={L.second}>
              <circle cx="58" cy="146" r="7" />
              <circle cx="144" cy="152" r="6" />
              <circle cx="132" cy="80" r="6" />
              <circle cx="70" cy="84" r="5" />
              <circle cx="150" cy="118" r="4" />
            </g>
          )}
        </g>

        {/* 날개 · 지느러미 */}
        {has("wings") && (
          <>
            <ellipse cx="42" cy="136" rx="12" ry="27" transform="rotate(14 42 136)" fill={L.second} {...stroke} />
            <ellipse cx="158" cy="136" rx="12" ry="27" transform="rotate(-14 158 136)" fill={L.second} {...stroke} />
          </>
        )}
        {L.ears === "floppy" && (
          <>
            <path d="M52,76 C26,78 22,122 40,132 C54,124 58,100 62,82 Z" fill={L.second} {...stroke} />
            <path d="M148,76 C174,78 178,122 160,132 C146,124 142,100 138,82 Z" fill={L.second} {...stroke} />
          </>
        )}

        {/* ---------- 얼굴 ---------- */}
        <Face mood={mood} nose={L.nose} light={eyesOnDark} patch={has("patch")} />

        {/* 빗금 볼터치 (우리 그림체 표식) */}
        {mood !== "blank" && (
          <g stroke="#e5533d" strokeWidth={2.8} strokeLinecap="round" opacity={0.85}>
            <path d="M50,124 L54,131 M57,123 L61,130 M64,124 L68,131" />
            <path d="M132,124 L136,131 M139,123 L143,130 M146,124 L150,131" />
          </g>
        )}

        {/* ---------- 고민 쪽지 (모든 고민 동물이 하나씩 붙이고 있어요) ---------- */}
        {note && (
          <g transform="translate(86 34) rotate(7)">
            <rect x="0" y="0" width="34" height="34" fill="#fff1a8" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <path d="M7,15 L27,15 M7,23 L21,23" stroke={INK} strokeWidth={2.6} strokeLinecap="round" opacity={0.55} />
            <circle cx="17" cy="2" r="5" fill="#e5533d" stroke={INK} strokeWidth={2.5} />
          </g>
        )}
      </g>
    </svg>
  );
}

function spikePath(): string {
  const cx = 100;
  const cy = 118;
  const pts: string[] = [];
  const n = 13;
  for (let i = 0; i <= n * 2; i++) {
    const a = Math.PI * (1.02 + (0.96 * i) / (n * 2));
    const r = i % 2 === 0 ? 62 : 86;
    pts.push(`${(cx + Math.cos(a) * r * 1.02).toFixed(1)},${(cy + Math.sin(a) * r * 0.86).toFixed(1)}`);
  }
  return `M${pts.join(" L")} L150,150 L50,150 Z`;
}

function maneCircles(): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (0.95 + (1.1 * i) / 10);
    out.push([100 + Math.cos(a) * 62, 110 + Math.sin(a) * 56]);
  }
  return out;
}

function Face({ mood, nose, light, patch }: { mood: Mood; nose: Nose; light: boolean; patch: boolean }) {
  const eyeFill = INK;
  const stroke = { stroke: INK, strokeWidth: 4.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const lx = 78;
  const rx = 122;
  const ey = 110;

  const eye = (x: number, onDark: boolean) => {
    if (mood === "happy") return <path d={`M${x - 8},${ey + 2} Q${x},${ey - 9} ${x + 8},${ey + 2}`} {...stroke} stroke={onDark ? "#fff" : INK} />;
    if (mood === "sleepy") return <path d={`M${x - 8},${ey - 1} Q${x},${ey + 6} ${x + 8},${ey - 1}`} {...stroke} stroke={onDark ? "#fff" : INK} />;
    if (mood === "blank") return <path d={`M${x - 8},${ey} L${x + 8},${ey}`} {...stroke} stroke={onDark ? "#fff" : INK} />;
    if (mood === "dizzy")
      return (
        <path
          d={`M${x},${ey} m0,-1 a2,2 0 1 1 -2,2 a4.5,4.5 0 1 1 4.5,4.5 a7,7 0 1 1 -7,-7`}
          {...stroke}
          strokeWidth={3}
          stroke={onDark ? "#fff" : INK}
        />
      );
    return onDark ? (
      <>
        <circle cx={x} cy={ey} r="7.5" fill="#fff" />
        <circle cx={x} cy={ey} r="4" fill={eyeFill} />
      </>
    ) : (
      <circle cx={x} cy={ey} r="5.6" fill={eyeFill} />
    );
  };

  const browColor = light ? "#fff" : INK;
  return (
    <g>
      {eye(lx, light)}
      {eye(rx, light || patch)}

      {/* 눈썹 */}
      {(mood === "worry" || mood === "teary") && (
        <g {...stroke} stroke={browColor} strokeWidth={3.6}>
          <path d="M67,98 L85,93" />
          <path d="M115,93 L133,98" />
        </g>
      )}
      {mood === "angry" && (
        <g {...stroke} stroke={browColor} strokeWidth={4.4}>
          <path d="M66,92 L86,99" />
          <path d="M114,99 L134,92" />
        </g>
      )}

      {/* 코 */}
      {nose === "dot" && <ellipse cx="100" cy="121" rx="5.2" ry="4" fill={INK} />}
      {nose === "tri" && <path d="M94,118 L106,118 L100,125 Z" fill="#e88f86" stroke={INK} strokeWidth={3} strokeLinejoin="round" />}
      {nose === "oval" && <ellipse cx="100" cy="122" rx="10" ry="13" fill={INK} />}
      {nose === "beak" && <path d="M90,116 L110,116 L100,132 Z" fill="#f2a43a" stroke={INK} strokeWidth={4} strokeLinejoin="round" />}
      {nose === "bill" && <ellipse cx="100" cy="126" rx="18" ry="9" fill="#f2a43a" stroke={INK} strokeWidth={4} />}
      {nose === "snout" && (
        <>
          <ellipse cx="100" cy="126" rx="16" ry="11" fill="rgba(255,255,255,0.35)" stroke={INK} strokeWidth={4} />
          <circle cx="94" cy="126" r="2.4" fill={INK} />
          <circle cx="106" cy="126" r="2.4" fill={INK} />
        </>
      )}

      {/* 입 */}
      {nose !== "beak" && nose !== "bill" && nose !== "snout" && (
        <>
          {(mood === "calm" || mood === "happy" || mood === "sleepy") && <path d="M92,131 Q96,137 100,131 Q104,137 108,131" {...stroke} strokeWidth={3.4} />}
          {mood === "worry" && <path d="M92,136 Q96,131 100,135 Q104,139 108,134" {...stroke} strokeWidth={3.4} />}
          {mood === "teary" && <path d="M91,137 Q100,129 109,137" {...stroke} strokeWidth={3.4} />}
          {mood === "angry" && <path d="M92,137 L100,132 L108,137" {...stroke} strokeWidth={3.4} />}
          {mood === "dizzy" && <ellipse cx="100" cy="136" rx="5" ry="6" fill={INK} />}
          {mood === "blank" && <path d="M93,135 L107,135" {...stroke} strokeWidth={3.4} />}
        </>
      )}

      {/* 표정 소품 */}
      {mood === "worry" && <path d="M158,74 C152,86 152,94 158,95 C164,94 164,86 158,74 Z" fill="#9cd3f0" stroke={INK} strokeWidth={3} strokeLinejoin="round" />}
      {mood === "teary" && (
        <g fill="#9cd3f0" stroke={INK} strokeWidth={2.6} strokeLinejoin="round">
          <path d="M70,120 C66,128 66,134 70,135 C74,134 74,128 70,120 Z" />
          <path d="M130,120 C126,128 126,134 130,135 C134,134 134,128 130,120 Z" />
        </g>
      )}
      {mood === "angry" && (
        <g stroke="#e5533d" strokeWidth={4} strokeLinecap="round" fill="none" transform="translate(40 60)">
          <path d="M-8,-3 Q-3,-3 -3,-8 M3,-8 Q3,-3 8,-3 M8,3 Q3,3 3,8 M-3,8 Q-3,3 -8,3" />
        </g>
      )}
      {mood === "happy" && <path d="M40,66 C34,58 22,64 30,74 L40,84 L50,74 C58,64 46,58 40,66 Z" fill="#f08a94" stroke={INK} strokeWidth={3} strokeLinejoin="round" transform="rotate(-12 40 70)" />}
      {mood === "dizzy" && (
        <g stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none">
          <path d="M34,62 l8,6 M30,76 l10,0 M36,90 l8,-5" />
        </g>
      )}
      {mood === "blank" && (
        <g fill={INK} opacity={0.6}>
          <circle cx="32" cy="74" r="3" />
          <circle cx="43" cy="68" r="3" />
          <circle cx="54" cy="62" r="3" />
        </g>
      )}
      {mood === "sleepy" && (
        <g stroke={INK} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M28,76 l12,0 l-12,12 l12,0" />
          <path d="M46,56 l8,0 l-8,8 l8,0" />
        </g>
      )}
    </g>
  );
}
