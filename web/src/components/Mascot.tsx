import { useId, type ReactNode } from "react";

/* =====================================================================
   고민 동물 마스코트 (우리 사이트 그림체)

   그림체: 색연필 선 + 크레파스 질감 + 뽀얗게 번지는 밝은 털 + 아주 작은 점 눈
   고정되는 것: 물렁한 몸통, 선과 질감, 얼굴 비율, 이마에 붙은 노란 고민 쪽지
   바뀌는 것:   귀 · 코 · 꼬리 · 무늬 · 색 (어떤 동물인지), 표정 (어떤 고민인지)

   그림 파일이 아니라 부품 조합이라서, 처음 보는 동물도 부품만 고르면 같은 그림체로 나옵니다.
   ===================================================================== */

export type Ears = "none" | "round" | "big" | "pointy" | "long" | "floppy" | "tuft";
export type Nose = "dot" | "tri" | "oval" | "beak" | "bill" | "snout" | "none";
export type Tail = "none" | "long" | "bushy" | "ring" | "puff";
export type Mark =
  | "muzzle" // 주둥이 밝은 털
  | "belly" // 배 밝은 털
  | "mask" // 눈 주위 가면 (라쿤, 판다)
  | "discs" // 눈 주위 둥근 판 (부엉이)
  | "tabby" // 줄무늬
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

const LINE = "#6b4a35"; // 색연필 갈색
const CREAM = "#fff6e6";

/** 자주 나오는 동물은 미리 정해 둔 생김새를 씁니다. 없는 동물은 AI 가 부품을 직접 골라요. */
export const SPECIES: Record<string, Look> = {
  라쿤: { body: "#bfb8ae", second: "#6f6259", ears: "pointy", nose: "dot", tail: "ring", marks: ["mask", "muzzle"] },
  부엉이: { body: "#cfa97f", second: "#a07a56", ears: "tuft", nose: "beak", tail: "none", marks: ["discs", "belly", "wings"] },
  문어: { body: "#f2b3b8", second: "#e58f9a", ears: "none", nose: "none", tail: "none", marks: ["tentacles", "spots"] },
  고양이: { body: "#f3d59a", second: "#dba758", ears: "pointy", nose: "tri", tail: "long", marks: ["tabby", "muzzle"] },
  햄스터: { body: "#f1cb97", second: "#fff3df", ears: "round", nose: "dot", tail: "none", marks: ["cheeks", "belly"] },
  강아지: { body: "#f3e7d0", second: "#b98d66", ears: "floppy", nose: "dot", tail: "long", marks: ["patch", "muzzle"] },
  토끼: { body: "#faf4ea", second: "#f2bcc3", ears: "long", nose: "tri", tail: "puff", marks: [] },
  펭귄: { body: "#6f7789", second: "#565d6e", ears: "none", nose: "beak", tail: "none", marks: ["belly", "wings"] },
  거북이: { body: "#b9d8a0", second: "#86a971", ears: "none", nose: "none", tail: "none", marks: ["shell"] },
  여우: { body: "#f0a66a", second: "#fff3df", ears: "pointy", nose: "dot", tail: "bushy", marks: ["belly", "cheeks"] },
  코알라: { body: "#bcc1c8", second: "#eef0f3", ears: "big", nose: "oval", tail: "none", marks: ["belly"] },
  고슴도치: { body: "#f2dfc6", second: "#a47c5f", ears: "round", nose: "dot", tail: "none", marks: ["spikes"] },
  미어캣: { body: "#dfc096", second: "#8a6f56", ears: "round", nose: "dot", tail: "long", marks: ["mask", "belly"] },
  거위: { body: "#fbf7ee", second: "#ebe3d2", ears: "none", nose: "bill", tail: "none", marks: ["wings"] },
  카피바라: { body: "#c39a70", second: "#a57c55", ears: "round", nose: "snout", tail: "none", marks: [] },
  치타: { body: "#f3d587", second: "#8a6a48", ears: "round", nose: "tri", tail: "long", marks: ["spots", "muzzle"] },
  나무늘보: { body: "#c2ac90", second: "#8a6f56", ears: "none", nose: "dot", tail: "none", marks: ["mask", "muzzle"] },
  해달: { body: "#a98a6e", second: "#f3e3cc", ears: "round", nose: "tri", tail: "none", marks: ["muzzle", "belly"] },
  앵무새: { body: "#a6d6a0", second: "#f0cf6a", ears: "tuft", nose: "beak", tail: "none", marks: ["belly", "wings"] },
  경주마: { body: "#c39670", second: "#7d5b43", ears: "pointy", nose: "snout", tail: "bushy", marks: ["mane"] },
  사자: { body: "#f1cf8a", second: "#cf9a55", ears: "round", nose: "tri", tail: "long", marks: ["mane", "muzzle"] },
  판다: { body: "#fbf7ee", second: "#5b534d", ears: "round", nose: "dot", tail: "none", marks: ["mask"] },
  곰: { body: "#c19a72", second: "#f3dcc0", ears: "round", nose: "dot", tail: "none", marks: ["muzzle"] },
  다람쥐: { body: "#d9a66f", second: "#fff3df", ears: "round", nose: "dot", tail: "bushy", marks: ["belly", "cheeks"] },
  오리: { body: "#fbe49c", second: "#f1cc62", ears: "none", nose: "bill", tail: "none", marks: ["wings"] },
  돼지: { body: "#f6c9cc", second: "#eea9b1", ears: "floppy", nose: "snout", tail: "none", marks: [] },
};

const DEFAULT_LOOK: Look = { body: "#ead9c0", second: "#b39373", ears: "round", nose: "dot", tail: "none", marks: ["muzzle"] };

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

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 색을 갈색 쪽으로 눌러서 "같은 색 색연필로 그린 선"을 만듭니다 */
function lineOf(fill: string): string {
  const [r, g, b] = rgb(fill);
  const [lr, lg, lb] = rgb(LINE);
  const k = 0.62;
  const mix = (a: number, c: number) => Math.round(a * (1 - k) * 0.8 + c * k);
  return `rgb(${mix(r, lr)}, ${mix(g, lg)}, ${mix(b, lb)})`;
}

function isDark(hex: string): boolean {
  const [r, g, b] = rgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b < 135;
}

// 좌우가 살짝 안 맞는 물렁한 몸
const BODY = "M43,152 C35,116 50,66 98,60 C146,56 168,112 160,151 C157,171 133,177 100,177 C68,177 46,172 43,152 Z";

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
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 97;
  const fx = { fill: `url(#crayon-${uid})`, line: `url(#pencil-${uid})`, soft: `url(#soft-${uid})`, soft2: `url(#soft2-${uid})` };

  /** 부품 하나 = 크레파스로 칠한 면 + 색연필 선 */
  const Part = ({ children, fill, sw = 3.4 }: { children: (p: Record<string, unknown>) => ReactNode; fill: string; sw?: number }) => (
    <>
      <g filter={fx.fill}>{children({ fill, stroke: "none" })}</g>
      <g filter={fx.line}>{children({ fill: "none", stroke: lineOf(fill), strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" })}</g>
    </>
  );

  const eyesOnDark = has("mask") || isDark(L.body);
  const inner = has("mask") ? L.second : "#f2c0b4";

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={title ?? name} style={{ display: "block", overflow: "visible" }}>
      <defs>
        {/* 크레파스 면: 가장자리가 살짝 울퉁불퉁하고 종이 결이 비쳐 보임 */}
        <filter id={`crayon-${uid}`} x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed={seed} result="wob" />
          <feDisplacementMap in="SourceGraphic" in2="wob" scale="3" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed + 3} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.92  0 0 0 -1.9 0.78" result="specks" />
          <feComposite in="specks" in2="shape" operator="in" result="specksIn" />
          <feMerge>
            <feMergeNode in="shape" />
            <feMergeNode in="specksIn" />
          </feMerge>
        </filter>
        {/* 색연필 선: 살짝 흔들리고 군데군데 옅어짐 */}
        <filter id={`pencil-${uid}`} x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed={seed} result="wob" />
          <feDisplacementMap in="SourceGraphic" in2="wob" scale="3" result="line" />
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed={seed + 7} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.9 1.55" result="gaps" />
          <feComposite in="line" in2="gaps" operator="in" />
        </filter>
        {/* 뽀얗게 번지는 밝은 털 */}
        <filter id={`soft-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed + 5} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.5" result="g" />
          <feComposite in="b" in2="g" operator="in" />
        </filter>
        <filter id={`soft2-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed + 9} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.6" result="g" />
          <feComposite in="b" in2="g" operator="in" />
        </filter>
        <clipPath id={`body-${uid}`}>
          <path d={BODY} />
        </clipPath>
      </defs>

      {/* ---------- 몸 뒤: 꼬리, 등딱지, 가시, 갈기, 다리 ---------- */}
      {L.tail === "long" && (
        <Part fill={L.body}>{(p) => <path d="M150,158 C178,170 196,138 176,118 C172,114 166,118 170,124 C180,138 170,152 152,148 Z" {...p} />}</Part>
      )}
      {(L.tail === "bushy" || L.tail === "ring") && (
        <>
          <Part fill={L.body}>{(p) => <path d="M146,168 C190,178 202,122 174,96 C162,110 170,134 146,146 Z" {...p} />}</Part>
          {L.tail === "ring" && (
            <g filter={fx.line} stroke={L.second} strokeWidth={7} strokeLinecap="round" fill="none">
              <path d="M172,112 L186,108" />
              <path d="M171,134 L190,134" />
              <path d="M161,154 L182,160" />
            </g>
          )}
          {L.tail === "bushy" && <ellipse cx="174" cy="110" rx="9" ry="12" fill={CREAM} filter={fx.soft} />}
        </>
      )}
      {L.tail === "puff" && <Part fill={CREAM}>{(p) => <circle cx="158" cy="162" r="12" {...p} />}</Part>}

      {has("shell") && (
        <>
          <Part fill={L.second}>{(p) => <ellipse cx="100" cy="138" rx="77" ry="46" {...p} />}</Part>
          <g filter={fx.line} fill="none" stroke={lineOf(L.second)} strokeWidth={2.4} opacity={0.6}>
            <path d="M32,130 Q100,100 168,130 M42,153 Q100,130 158,153" />
          </g>
        </>
      )}
      {has("spikes") && <Part fill={L.second}>{(p) => <path d={spikePath()} {...p} />}</Part>}
      {has("mane") && (
        <Part fill={L.second}>
          {(p) => (
            <>
              {maneCircles().map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="16" {...p} />
              ))}
            </>
          )}
        </Part>
      )}
      {has("tentacles") && (
        <Part fill={L.body}>
          {(p) => (
            <>
              <path d="M52,150 C30,166 28,190 44,194 C54,196 58,186 52,182 C46,178 52,168 66,164 Z" {...p} />
              <path d="M76,166 C68,182 62,194 76,198 C86,200 90,190 84,186 C80,182 86,176 92,170 Z" {...p} />
              <path d="M124,166 C132,182 138,194 124,198 C114,200 110,190 116,186 C120,182 114,176 108,170 Z" {...p} />
              <path d="M148,150 C170,166 172,190 156,194 C146,196 142,186 148,182 C154,178 148,168 134,164 Z" {...p} />
            </>
          )}
        </Part>
      )}

      {/* ---------- 귀 ---------- */}
      {L.ears === "round" && (
        <>
          <Part fill={L.body}>
            {(p) => (
              <>
                <circle cx="62" cy="76" r="16" {...p} />
                <circle cx="140" cy="74" r="16" {...p} />
              </>
            )}
          </Part>
          <circle cx="62" cy="77" r="7" fill={inner} filter={fx.fill} opacity={0.8} />
          <circle cx="140" cy="75" r="7" fill={inner} filter={fx.fill} opacity={0.8} />
        </>
      )}
      {L.ears === "big" && (
        <>
          <Part fill={L.body}>
            {(p) => (
              <>
                <circle cx="50" cy="84" r="25" {...p} />
                <circle cx="152" cy="82" r="25" {...p} />
              </>
            )}
          </Part>
          <circle cx="50" cy="85" r="13" fill={L.second} filter={fx.soft} />
          <circle cx="152" cy="83" r="13" fill={L.second} filter={fx.soft} />
        </>
      )}
      {L.ears === "pointy" && (
        <>
          <Part fill={L.body}>
            {(p) => (
              <>
                <path d="M48,94 C46,70 52,50 58,42 C70,48 86,58 94,68 Z" {...p} />
                <path d="M154,92 C156,68 150,48 144,40 C132,46 116,56 108,66 Z" {...p} />
              </>
            )}
          </Part>
          <path d="M58,78 C58,66 60,58 63,54 C70,58 76,62 80,68 Z" fill={inner} filter={fx.fill} opacity={0.85} />
          <path d="M144,76 C144,64 142,56 139,52 C132,56 126,60 122,66 Z" fill={inner} filter={fx.fill} opacity={0.85} />
        </>
      )}
      {L.ears === "long" && (
        <>
          <Part fill={L.body}>
            {(p) => (
              <>
                <ellipse cx="79" cy="42" rx="12" ry="34" transform="rotate(-10 79 42)" {...p} />
                <ellipse cx="122" cy="40" rx="12" ry="34" transform="rotate(8 122 40)" {...p} />
              </>
            )}
          </Part>
          <ellipse cx="79" cy="44" rx="5" ry="22" transform="rotate(-10 79 44)" fill={L.second} filter={fx.fill} opacity={0.85} />
          <ellipse cx="122" cy="42" rx="5" ry="22" transform="rotate(8 122 42)" fill={L.second} filter={fx.fill} opacity={0.85} />
        </>
      )}
      {L.ears === "tuft" && (
        <Part fill={L.second}>
          {(p) => (
            <>
              <path d="M56,84 C52,70 52,56 54,48 C66,52 78,58 86,66 Z" {...p} />
              <path d="M146,82 C150,68 150,54 148,46 C136,50 124,56 116,64 Z" {...p} />
            </>
          )}
        </Part>
      )}

      {/* ---------- 몸통 ---------- */}
      <Part fill={L.body} sw={3.8}>{(p) => <path d={BODY} {...p} />}</Part>

      {/* 몸 안쪽: 뽀얗게 번지는 밝은 털과 무늬 */}
      <g clipPath={`url(#body-${uid})`}>
        {/* 아래쪽이 살짝 진해지는 그늘 */}
        <ellipse cx="100" cy="186" rx="70" ry="22" fill={lineOf(L.body)} opacity={0.22} filter={fx.soft} />
        {has("belly") && <ellipse cx="100" cy="158" rx="36" ry="30" fill={isDark(L.body) ? "#fbf7ee" : CREAM} filter={fx.soft} />}
        {has("discs") && (
          <>
            <circle cx="80" cy="108" r="21" fill={CREAM} filter={fx.soft} />
            <circle cx="120" cy="108" r="21" fill={CREAM} filter={fx.soft} />
          </>
        )}
        {has("cheeks") && (
          <>
            <ellipse cx="60" cy="126" rx="20" ry="16" fill={CREAM} filter={fx.soft} />
            <ellipse cx="140" cy="126" rx="20" ry="16" fill={CREAM} filter={fx.soft} />
          </>
        )}
        {has("muzzle") && <ellipse cx="100" cy="122" rx="24" ry="17" fill={CREAM} filter={fx.soft} />}
        {has("mask") && (
          <>
            <ellipse cx="80" cy="108" rx="15" ry="11" transform="rotate(-14 80 108)" fill={L.second} filter={fx.soft2} />
            <ellipse cx="120" cy="108" rx="15" ry="11" transform="rotate(14 120 108)" fill={L.second} filter={fx.soft2} />
          </>
        )}
        {has("patch") && <ellipse cx="121" cy="105" rx="18" ry="17" fill={L.second} filter={fx.soft2} />}
        {has("tabby") && (
          <g stroke={L.second} strokeWidth={5.5} strokeLinecap="round" filter={fx.line}>
            <path d="M58,88 L70,93 M54,101 L67,103 M142,86 L130,91 M146,99 L133,101" />
          </g>
        )}
        {has("spots") && (
          <g fill={L.second} filter={fx.fill} opacity={0.85}>
            <circle cx="58" cy="146" r="6.5" />
            <circle cx="144" cy="150" r="5.5" />
            <circle cx="136" cy="84" r="5.5" />
            <circle cx="66" cy="86" r="4.5" />
            <circle cx="152" cy="118" r="4" />
          </g>
        )}
      </g>

      {/* 날개 · 지느러미, 늘어진 귀 */}
      {has("wings") && (
        <Part fill={L.second}>
          {(p) => (
            <>
              <ellipse cx="44" cy="138" rx="11" ry="25" transform="rotate(14 44 138)" {...p} />
              <ellipse cx="158" cy="136" rx="11" ry="25" transform="rotate(-14 158 136)" {...p} />
            </>
          )}
        </Part>
      )}
      {L.ears === "floppy" && (
        <Part fill={L.second}>
          {(p) => (
            <>
              <path d="M54,80 C30,82 26,122 42,132 C54,124 58,102 62,86 Z" {...p} />
              <path d="M148,78 C172,80 176,120 160,130 C148,122 144,100 140,84 Z" {...p} />
            </>
          )}
        </Part>
      )}

      {/* 작은 앞발 */}
      <g filter={fx.line} fill="none" stroke={lineOf(L.body)} strokeWidth={3} strokeLinecap="round">
        <path d="M80,168 q5,7 11,0" />
        <path d="M110,168 q5,7 11,0" />
      </g>

      {/* ---------- 얼굴 ---------- */}
      <Face mood={mood} nose={L.nose} light={eyesOnDark} patch={has("patch")} lineFx={fx.line} softFx={fx.soft} />

      {/* ---------- 고민 쪽지 (모든 고민 동물이 하나씩 붙이고 있어요) ---------- */}
      {note && (
        <g transform="translate(86 36) rotate(7)">
          <Part fill="#fbe9a0" sw={2.8}>{(p) => <rect x="0" y="0" width="32" height="32" {...p} />}</Part>
          <g filter={fx.line} stroke={LINE} strokeWidth={2.2} strokeLinecap="round" opacity={0.5}>
            <path d="M7,15 L25,15 M7,22 L19,22" />
          </g>
          <Part fill="#e8877a" sw={2.2}>{(p) => <circle cx="16" cy="2" r="4.6" {...p} />}</Part>
        </g>
      )}
    </svg>
  );
}

function spikePath(): string {
  const cx = 100;
  const cy = 118;
  const pts: string[] = [];
  const n = 11;
  for (let i = 0; i <= n * 2; i++) {
    const a = Math.PI * (1.02 + (0.96 * i) / (n * 2));
    const r = i % 2 === 0 ? 64 : 84;
    pts.push(`${(cx + Math.cos(a) * r * 1.02).toFixed(1)},${(cy + Math.sin(a) * r * 0.86).toFixed(1)}`);
  }
  return `M${pts.join(" L")} L150,150 L50,150 Z`;
}

function maneCircles(): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (0.95 + (1.1 * i) / 10);
    out.push([100 + Math.cos(a) * 62, 112 + Math.sin(a) * 56]);
  }
  return out;
}

function Face({ mood, nose, light, patch, lineFx, softFx }: { mood: Mood; nose: Nose; light: boolean; patch: boolean; lineFx: string; softFx: string }) {
  const stroke = { strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const lx = 82;
  const rx = 118;
  const ey = 108;
  const hasMouth = nose !== "beak" && nose !== "bill" && nose !== "snout";
  const my = nose === "oval" ? 134 : 119; // 입 높이

  const eye = (x: number, onDark: boolean) => {
    const c = onDark ? "#fffaf0" : LINE;
    if (mood === "happy") return <path d={`M${x - 6},${ey + 2} Q${x},${ey - 6} ${x + 6},${ey + 2}`} {...stroke} stroke={c} />;
    if (mood === "sleepy") return <path d={`M${x - 6},${ey - 1} Q${x},${ey + 5} ${x + 6},${ey - 1}`} {...stroke} stroke={c} />;
    if (mood === "blank") return <path d={`M${x - 6},${ey} L${x + 6},${ey}`} {...stroke} stroke={c} />;
    if (mood === "dizzy") return <path d={`M${x},${ey} m0,-1 a1.6,1.6 0 1 1 -1.6,1.6 a3.6,3.6 0 1 1 3.6,3.6 a5.6,5.6 0 1 1 -5.6,-5.6`} {...stroke} strokeWidth={2.4} stroke={c} />;
    return onDark ? (
      <>
        <circle cx={x} cy={ey} r="5.6" fill="#fffaf0" />
        <circle cx={x} cy={ey} r="3" fill={LINE} />
      </>
    ) : (
      <circle cx={x} cy={ey} r="3.9" fill={LINE} />
    );
  };

  const browColor = light ? "#fffaf0" : LINE;
  return (
    <g>
      {/* 볼터치: 크레파스로 문지른 듯 뽀얗게 */}
      {mood !== "blank" && (
        <g fill="#f08f86" opacity={mood === "happy" ? 0.75 : 0.5} filter={softFx}>
          <ellipse cx="64" cy="120" rx="9" ry="6" />
          <ellipse cx="136" cy="120" rx="9" ry="6" />
        </g>
      )}

      <g filter={lineFx}>
        {eye(lx, light)}
        {eye(rx, light || patch)}

        {(mood === "worry" || mood === "teary") && (
          <g {...stroke} stroke={browColor} strokeWidth={2.6}>
            <path d="M73,98 L87,94" />
            <path d="M113,94 L127,98" />
          </g>
        )}
        {mood === "angry" && (
          <g {...stroke} stroke={browColor} strokeWidth={3.2}>
            <path d="M72,94 L88,100" />
            <path d="M112,100 L128,94" />
          </g>
        )}

        {/* 코 */}
        {nose === "dot" && <ellipse cx="100" cy="113" rx="3.6" ry="2.8" fill={LINE} />}
        {nose === "tri" && <path d="M96,111 L104,111 L100,116 Z" fill="#e8877a" stroke={LINE} strokeWidth={2} strokeLinejoin="round" />}
        {nose === "oval" && <ellipse cx="100" cy="118" rx="8" ry="11" fill={LINE} />}
        {nose === "beak" && <path d="M92,112 L108,112 L100,125 Z" fill="#f0b25a" stroke={LINE} strokeWidth={2.6} strokeLinejoin="round" />}
        {nose === "bill" && <ellipse cx="100" cy="120" rx="15" ry="8" fill="#f0b25a" stroke={LINE} strokeWidth={2.6} />}
        {nose === "snout" && (
          <>
            <ellipse cx="100" cy="121" rx="14" ry="10" fill="rgba(255,250,240,0.4)" stroke={LINE} strokeWidth={2.6} />
            <circle cx="95" cy="121" r="2" fill={LINE} />
            <circle cx="105" cy="121" r="2" fill={LINE} />
          </>
        )}

        {/* 입: 아주 작게 */}
        {hasMouth && (
          <g stroke={LINE} {...stroke} strokeWidth={2.6}>
            {(mood === "calm" || mood === "happy" || mood === "sleepy") && <path d={`M94,${my} Q97,${my + 5} 100,${my} Q103,${my + 5} 106,${my}`} />}
            {mood === "worry" && <path d={`M94,${my + 3} Q97,${my - 1} 100,${my + 2} Q103,${my + 5} 106,${my + 1}`} />}
            {mood === "teary" && <path d={`M93,${my + 5} Q100,${my - 2} 107,${my + 5}`} />}
            {mood === "angry" && <path d={`M94,${my + 5} L100,${my + 1} L106,${my + 5}`} />}
            {mood === "dizzy" && <ellipse cx="100" cy={my + 4} rx="3.6" ry="4.6" fill={LINE} stroke="none" />}
            {mood === "blank" && <path d={`M95,${my + 3} L105,${my + 3}`} />}
          </g>
        )}

        {/* 표정 소품 */}
        {mood === "worry" && <path d="M158,76 C153,86 153,93 158,94 C163,93 163,86 158,76 Z" fill="#a9d6ee" stroke="#6f9db8" strokeWidth={2.2} strokeLinejoin="round" />}
        {mood === "teary" && (
          <g fill="#a9d6ee" stroke="#6f9db8" strokeWidth={2} strokeLinejoin="round">
            <path d="M76,116 C73,123 73,128 76,129 C79,128 79,123 76,116 Z" />
            <path d="M124,116 C121,123 121,128 124,129 C127,128 127,123 124,116 Z" />
          </g>
        )}
        {mood === "angry" && (
          <g stroke="#e0766a" strokeWidth={3.2} strokeLinecap="round" fill="none" transform="translate(40 62)">
            <path d="M-7,-3 Q-3,-3 -3,-7 M3,-7 Q3,-3 7,-3 M7,3 Q3,3 3,7 M-3,7 Q-3,3 -7,3" />
          </g>
        )}
        {mood === "happy" && <path d="M40,68 C35,61 25,66 31,75 L40,84 L49,75 C55,66 45,61 40,68 Z" fill="#f2a3a8" stroke="#d97f86" strokeWidth={2.2} strokeLinejoin="round" transform="rotate(-12 40 72)" />}
        {mood === "dizzy" && (
          <g stroke={LINE} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.8}>
            <path d="M36,64 l7,5 M32,77 l9,0 M38,90 l7,-4" />
          </g>
        )}
        {mood === "blank" && (
          <g fill={LINE} opacity={0.5}>
            <circle cx="34" cy="76" r="2.6" />
            <circle cx="44" cy="70" r="2.6" />
            <circle cx="54" cy="64" r="2.6" />
          </g>
        )}
        {mood === "sleepy" && (
          <g stroke={LINE} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.8}>
            <path d="M30,78 l11,0 l-11,11 l11,0" />
            <path d="M47,58 l7,0 l-7,7 l7,0" />
          </g>
        )}
      </g>
    </g>
  );
}
