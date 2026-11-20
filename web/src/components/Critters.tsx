import { useId, type ReactNode } from "react";

/* =====================================================================
   고민 동물 캐릭터 (우리 사이트 오리지널)

   캐릭터마다 몸 모양 · 자세 · 사연이 따로 있어요.
   공통 규칙: 갈색 색연필 선(끊김 없이), 꽉 찬 파스텔 색, 뽀얀 밝은 털,
             아주 작은 점 눈과 작은 입, 살짝 삐뚤고 물렁한 모양.
   ===================================================================== */

const LINE = "#7a5640";
const CREAM = "#fff6e6";
const O = { stroke: LINE, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const THIN = { ...O, strokeWidth: 3, fill: "none" };

type Ctx = { uid: string; soft: string };

const P = ({ d, fill }: { d: string; fill: string }) => <path d={d} fill={fill} {...O} />;

/** 어떤 모양 안에서만 보이는 뽀얀 털 */
function Fur({ ctx, id, clip, children }: { ctx: Ctx; id: string; clip: string; children: ReactNode }) {
  const cid = `c-${ctx.uid}-${id}`;
  return (
    <>
      <clipPath id={cid}>
        <path d={clip} />
      </clipPath>
      <g clipPath={`url(#${cid})`}>
        <g filter={ctx.soft}>{children}</g>
      </g>
      {/* 털 위로 선을 한 번 더 그려서 가장자리가 흐려지지 않게 */}
      <path d={clip} fill="none" {...O} />
    </>
  );
}

type FaceOpts = {
  gap?: number;
  eye?: "dot" | "line" | "wide" | "side";
  mouth?: "w" | "flat" | "o" | "frown" | "none";
  blush?: boolean;
  onDark?: boolean;
  brow?: "none" | "worry" | "angry";
};

function Face({ ctx, x, y, o = {} }: { ctx: Ctx; x: number; y: number; o?: FaceOpts }) {
  const gap = o.gap ?? 34;
  const lx = x - gap / 2;
  const rx = x + gap / 2;
  const c = o.onDark ? "#fffaf0" : LINE;
  const eye = (ex: number) => {
    if (o.eye === "line") return <path d={`M${ex - 5},${y} L${ex + 5},${y}`} {...THIN} stroke={c} />;
    if (o.eye === "wide")
      return (
        <>
          <circle cx={ex} cy={y} r="8" fill="#fffdf7" {...O} strokeWidth={3} />
          <circle cx={ex} cy={y} r="2.6" fill={LINE} />
        </>
      );
    if (o.onDark)
      return (
        <>
          <circle cx={ex} cy={y} r="5" fill="#fffaf0" />
          <circle cx={ex} cy={y} r="2.8" fill={LINE} />
        </>
      );
    return <circle cx={ex} cy={y} r="3.4" fill={LINE} />;
  };
  const my = y + 9;
  return (
    <g>
      {o.blush !== false && (
        <g fill="#f29a8f" opacity={0.55} filter={ctx.soft}>
          <ellipse cx={lx - 12} cy={y + 9} rx="8" ry="5" />
          <ellipse cx={rx + 12} cy={y + 9} rx="8" ry="5" />
        </g>
      )}
      {eye(lx)}
      {eye(rx)}
      {o.brow === "worry" && (
        <g {...THIN} strokeWidth={2.6}>
          <path d={`M${lx - 6},${y - 9} L${lx + 5},${y - 12}`} />
          <path d={`M${rx - 5},${y - 12} L${rx + 6},${y - 9}`} />
        </g>
      )}
      {o.brow === "angry" && (
        <g {...THIN} strokeWidth={3}>
          <path d={`M${lx - 6},${y - 12} L${lx + 5},${y - 8}`} />
          <path d={`M${rx - 5},${y - 8} L${rx + 6},${y - 12}`} />
        </g>
      )}
      <g {...THIN} strokeWidth={2.6}>
        {(o.mouth ?? "w") === "w" && <path d={`M${x - 5},${my} Q${x - 2.5},${my + 4} ${x},${my} Q${x + 2.5},${my + 4} ${x + 5},${my}`} />}
        {o.mouth === "flat" && <path d={`M${x - 4},${my + 1} L${x + 4},${my + 1}`} />}
        {o.mouth === "frown" && <path d={`M${x - 5},${my + 4} Q${x},${my - 1} ${x + 5},${my + 4}`} />}
        {o.mouth === "o" && <ellipse cx={x} cy={my + 2} rx="3" ry="3.6" fill={LINE} stroke="none" />}
      </g>
    </g>
  );
}

/** 고민 쪽지 */
const Note = ({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <rect x="-17" y="-15" width="34" height="30" fill="#fbe7a0" {...O} strokeWidth={3.4} />
    <path d="M-9,-3 L9,-3 M-9,5 L3,5" {...THIN} strokeWidth={2.2} opacity={0.5} />
  </g>
);

type Critter = { title: string; concept: string; draw: (ctx: Ctx) => ReactNode };

// ---------------------------------------------------------------------
// 1. 곱씹는 라쿤: 앉아서 쪽지를 두 손으로 들고 들여다보는 중
// ---------------------------------------------------------------------
const raccoon: Critter = {
  title: "곱씹는 라쿤",
  concept: "같은 쪽지를 몇 번째 다시 읽는 중",
  draw: (ctx) => {
    const gray = "#bdb5aa";
    const dark = "#766a60";
    const body = "M80,180 C60,152 68,118 98,108 L142,108 C172,118 180,152 160,180 C138,188 102,188 80,180 Z";
    const tail = "M150,172 C188,176 202,140 186,118 C178,108 164,116 172,128 C182,144 170,156 152,152 Z";
    const head = "M60,84 C54,52 82,34 120,36 C158,34 186,52 180,84 C178,110 152,122 120,122 C88,122 62,110 60,84 Z";
    return (
      <>
        <P d={tail} fill={gray} />
        <clipPath id={`c-${ctx.uid}-rt`}>
          <path d={tail} />
        </clipPath>
        <g clipPath={`url(#c-${ctx.uid}-rt)`} stroke={dark} strokeWidth={9} fill="none">
          <path d="M166,120 L196,112 M172,140 L200,144 M160,152 L182,176" />
        </g>
        <path d={tail} fill="none" {...O} />
        <P d="M70,60 C64,42 68,28 76,22 C88,28 96,36 100,46 Z" fill={gray} />
        <P d="M170,60 C176,42 172,28 164,22 C152,28 144,36 140,46 Z" fill={gray} />
        <P d={body} fill={gray} />
        <Fur ctx={ctx} id="rb" clip={body}>
          <ellipse cx="120" cy="158" rx="30" ry="30" fill={CREAM} />
        </Fur>
        <P d={head} fill={gray} />
        <Fur ctx={ctx} id="rh" clip={head}>
          <ellipse cx="120" cy="100" rx="26" ry="18" fill={CREAM} />
        </Fur>
        <ellipse cx="97" cy="80" rx="17" ry="12" transform="rotate(-12 97 80)" fill={dark} />
        <ellipse cx="143" cy="80" rx="17" ry="12" transform="rotate(12 143 80)" fill={dark} />
        <Face ctx={ctx} x={120} y={81} o={{ gap: 44, onDark: true, mouth: "frown", brow: "none" }} />
        <ellipse cx="120" cy="88" rx="3.6" ry="2.8" fill={LINE} />
        <Note x={120} y={140} r={-4} />
        <P d="M96,140 C88,138 86,150 94,152 C102,154 106,146 102,142 Z" fill={gray} />
        <P d="M144,140 C152,138 154,150 146,152 C138,154 134,146 138,142 Z" fill={gray} />
        <P d="M84,180 C82,174 104,174 104,181 C102,187 86,187 84,180 Z" fill={gray} />
        <P d="M136,181 C136,174 158,174 156,180 C154,187 138,187 136,181 Z" fill={gray} />
      </>
    );
  },
};

// ---------------------------------------------------------------------
// 2. 새벽 3시 부엉이: 다크서클 달고 눈만 말똥말똥
// ---------------------------------------------------------------------
const owl: Critter = {
  title: "새벽 3시 부엉이",
  concept: "다들 자는데 혼자 눈이 말똥말똥",
  draw: (ctx) => {
    const brown = "#cba67c";
    const dark = "#a37f5a";
    const body = "M68,176 C48,140 60,72 120,62 C182,70 192,140 172,176 C150,190 90,190 68,176 Z";
    return (
      <>
        <P d="M76,86 C68,68 70,54 76,46 C88,52 100,62 106,74 Z" fill={dark} />
        <P d="M164,86 C172,68 170,54 164,46 C152,52 140,62 134,74 Z" fill={dark} />
        <P d={body} fill={brown} />
        <Fur ctx={ctx} id="ob" clip={body}>
          <ellipse cx="120" cy="156" rx="34" ry="34" fill={CREAM} />
          <circle cx="98" cy="106" r="24" fill={CREAM} />
          <circle cx="142" cy="106" r="24" fill={CREAM} />
        </Fur>
        <g {...THIN} strokeWidth={2.4} opacity={0.55}>
          <path d="M108,148 l4,5 l4,-5 M124,148 l4,5 l4,-5 M116,162 l4,5 l4,-5" />
        </g>
        <P d="M62,122 C46,134 48,160 64,170 C74,158 74,136 68,124 Z" fill={dark} />
        <P d="M178,122 C194,134 192,160 176,170 C166,158 166,136 172,124 Z" fill={dark} />
        <Face ctx={ctx} x={120} y={106} o={{ gap: 44, eye: "wide", mouth: "none", blush: false }} />
        {/* 다크서클 */}
        <g {...THIN} strokeWidth={2.4} opacity={0.6}>
          <path d="M90,119 Q98,124 106,119 M134,119 Q142,124 150,119" />
        </g>
        <path d="M113,116 L127,116 L120,128 Z" fill="#f0b25a" {...O} strokeWidth={3} />
        <g {...THIN} stroke="#d99a45" strokeWidth={3.4}>
          <path d="M98,184 l5,4 l5,-4 M132,184 l5,4 l5,-4" />
        </g>
        {/* 초승달 */}
        <path d="M196,46 C184,48 178,60 184,70 C190,78 202,78 208,70 C198,70 192,58 196,46 Z" fill="#fbe7a0" {...O} strokeWidth={3} />
      </>
    );
  },
};

// ---------------------------------------------------------------------
// 3. 갈팡질팡 문어: 다리가 전부 다른 방향, 한 다리로 머리 긁적
// ---------------------------------------------------------------------
const octopus: Critter = {
  title: "갈팡질팡 문어",
  concept: "여덟 다리가 전부 다른 쪽을 가리키는 중",
  draw: (ctx) => {
    const pink = "#f2b1b7";
    const back = "#e59aa3";
    const head = "M70,126 C58,80 84,42 120,42 C156,42 182,80 170,126 C168,140 150,148 120,148 C90,148 72,140 70,126 Z";
    return (
      <>
        <P d="M100,140 C96,156 104,172 112,180 C118,186 128,180 124,172 C118,162 118,150 122,142 Z" fill={back} />
        <P d="M140,140 C144,156 136,172 128,180 C122,186 112,180 116,172 C122,162 122,150 118,142 Z" fill={back} />
        <P d="M76,110 C52,108 34,96 30,80 C28,70 40,66 44,76 C48,88 62,94 80,94 Z" fill={pink} />
        <P d="M80,130 C56,138 38,152 34,168 C32,180 46,184 52,174 C56,164 72,154 92,148 Z" fill={pink} />
        <P d="M94,140 C84,158 78,170 80,182 C82,192 96,192 98,182 C100,170 106,158 112,146 Z" fill={pink} />
        <P d="M146,140 C156,158 162,170 160,182 C158,192 144,192 142,182 C140,170 134,158 128,146 Z" fill={pink} />
        <P d="M160,130 C184,138 202,152 206,168 C208,180 194,184 188,174 C184,164 168,154 148,148 Z" fill={pink} />
        <P d="M164,116 C196,112 212,84 200,56 C194,42 176,40 166,50 C160,56 168,66 174,60 C182,54 190,66 186,80 C182,92 174,98 160,100 Z" fill={pink} />
        <P d={head} fill={pink} />
        <Fur ctx={ctx} id="oh" clip={head}>
          <ellipse cx="96" cy="62" rx="16" ry="10" fill="#fbdadd" />
          <ellipse cx="120" cy="150" rx="40" ry="14" fill="#e9949e" opacity={0.5} />
        </Fur>
        <Face ctx={ctx} x={120} y={108} o={{ gap: 38, mouth: "o", brow: "worry" }} />
        <g {...THIN} strokeWidth={3}>
          <path d="M196,24 C196,14 210,14 210,24 C210,30 203,30 203,38" />
        </g>
        <circle cx="203" cy="46" r="2.4" fill={LINE} />
      </>
    );
  },
};

// ---------------------------------------------------------------------
// 4. 이불 속 나무늘보: 이불 덮고 엎드려서 얼굴만 내밂
// ---------------------------------------------------------------------
const sloth: Critter = {
  title: "이불 속 나무늘보",
  concept: "이불 밖은 위험하다고 판단함",
  draw: (ctx) => {
    const fur = "#c8b398";
    const blanket = "M52,182 C44,146 74,112 132,110 C182,108 212,136 214,182 Z";
    const head = "M30,152 C28,128 46,112 70,112 C96,112 112,130 110,152 C108,172 92,182 70,182 C48,182 32,172 30,152 Z";
    return (
      <>
        <P d={blanket} fill="#cfe2ef" />
        <g fill="#fffdf7" opacity={0.9}>
          <circle cx="140" cy="134" r="5" />
          <circle cx="172" cy="150" r="5" />
          <circle cx="126" cy="162" r="5" />
          <circle cx="190" cy="172" r="5" />
          <circle cx="156" cy="174" r="5" />
        </g>
        <path d="M104,122 C96,140 98,164 106,182" {...THIN} opacity={0.6} />
        <P d={head} fill={fur} />
        <Fur ctx={ctx} id="sh" clip={head}>
          <ellipse cx="70" cy="152" rx="28" ry="22" fill={CREAM} />
        </Fur>
        <path d="M44,144 C50,138 58,140 62,148" {...THIN} stroke="#8d745c" strokeWidth={6} />
        <path d="M96,144 C90,138 82,140 78,148" {...THIN} stroke="#8d745c" strokeWidth={6} />
        <g {...THIN} strokeWidth={2.6}>
          <path d="M49,148 Q54,152 59,148 M81,148 Q86,152 91,148" />
        </g>
        <ellipse cx="70" cy="156" rx="4" ry="3" fill={LINE} />
        <path d="M64,163 Q70,168 76,163" {...THIN} strokeWidth={2.6} />
        <P d="M74,172 C54,166 30,168 22,176 C16,184 24,190 34,190 C50,190 66,188 78,184 Z" fill={fur} />
        <g {...THIN} stroke="#fffaf0" strokeWidth={3.4}>
          <path d="M24,178 L15,177 M23,183 L14,185 M26,188 L18,192" />
        </g>
        <g {...THIN} strokeWidth={2.8} opacity={0.75}>
          <path d="M118,86 l12,0 l-12,12 l12,0 M138,66 l8,0 l-8,8 l8,0" />
        </g>
      </>
    );
  },
};

// ---------------------------------------------------------------------
// 5. 볼 빵빵 햄스터: 볼이 몸보다 넓음, 해바라기씨 하나 쥠
// ---------------------------------------------------------------------
const hamster: Critter = {
  title: "볼 빵빵 햄스터",
  concept: "걱정을 볼에 한가득 모아둠",
  draw: (ctx) => {
    const tan = "#f0c994";
    const body = "M42,150 C26,118 58,92 86,104 C98,82 142,82 154,104 C182,92 214,118 198,150 C206,174 170,188 120,188 C70,188 34,174 42,150 Z";
    return (
      <>
        <P d="M72,98 C66,84 74,72 86,74 C98,76 100,90 94,100 Z" fill={tan} />
        <P d="M168,98 C174,84 166,72 154,74 C142,76 140,90 146,100 Z" fill={tan} />
        <circle cx="84" cy="88" r="6" fill="#f2bfb2" />
        <circle cx="156" cy="88" r="6" fill="#f2bfb2" />
        <P d={body} fill={tan} />
        <Fur ctx={ctx} id="hb" clip={body}>
          <ellipse cx="64" cy="140" rx="26" ry="22" fill={CREAM} />
          <ellipse cx="176" cy="140" rx="26" ry="22" fill={CREAM} />
          <ellipse cx="120" cy="172" rx="34" ry="22" fill={CREAM} />
        </Fur>
        <Face ctx={ctx} x={120} y={122} o={{ gap: 36, mouth: "w" }} />
        <ellipse cx="120" cy="128" rx="3.2" ry="2.4" fill="#e8877a" />
        {/* 해바라기씨 */}
        <path d="M120,142 C112,150 112,162 120,166 C128,162 128,150 120,142 Z" fill="#fffaf0" {...O} strokeWidth={3} />
        <path d="M117,150 L117,160 M123,150 L123,160" {...THIN} strokeWidth={2.2} />
        <P d="M100,152 C92,150 90,162 98,164 C106,166 110,158 106,154 Z" fill={tan} />
        <P d="M140,152 C148,150 150,162 142,164 C134,166 130,158 134,154 Z" fill={tan} />
      </>
    );
  },
};

// ---------------------------------------------------------------------
// 6. 삐진 고양이: 등 돌리고 앉아서 곁눈질
// ---------------------------------------------------------------------
const cat: Critter = {
  title: "삐진 고양이",
  concept: "등 돌렸지만 알아봐 주길 기다리는 중",
  draw: (ctx) => {
    const yel = "#f3d59a";
    const str = "#dba758";
    const body = "M78,182 C56,156 62,116 98,104 C140,94 176,112 182,148 C186,168 180,178 172,182 Z";
    const head = "M60,88 C56,62 78,44 104,44 C132,44 150,64 148,90 C146,112 126,124 102,124 C78,124 62,110 60,88 Z";
    return (
      <>
        <P d="M168,174 C198,178 210,158 200,146 C194,138 184,144 188,152 C192,160 184,166 172,162 Z" fill={yel} />
        <P d={body} fill={yel} />
        <g {...THIN} stroke={str} strokeWidth={6}>
          <path d="M128,112 L132,128 M148,118 L150,134 M166,130 L164,146" />
        </g>
        <P d="M66,66 C60,50 62,36 68,30 C80,34 90,42 94,52 Z" fill={yel} />
        <P d="M140,66 C146,50 144,36 138,30 C126,34 116,42 112,52 Z" fill={yel} />
        <P d={head} fill={yel} />
        <Fur ctx={ctx} id="ch" clip={head}>
          <ellipse cx="140" cy="100" rx="16" ry="12" fill={CREAM} />
        </Fur>
        <g {...THIN} stroke={str} strokeWidth={5.5}>
          <path d="M92,50 L94,62 M106,48 L106,60" />
        </g>
        {/* 곁눈질하는 한쪽 눈 */}
        <circle cx="132" cy="86" r="3.6" fill={LINE} />
        <path d="M124,76 L138,80" {...THIN} strokeWidth={3} />
        <path d="M138,98 l6,-3" {...THIN} strokeWidth={2.6} />
        <g fill="#f29a8f" opacity={0.5} filter={ctx.soft}>
          <ellipse cx="136" cy="96" rx="7" ry="4" />
        </g>
        {/* 흥! */}
        <g {...THIN} strokeWidth={3}>
          <path d="M170,40 C172,46 176,48 182,48 M192,48 C198,48 202,46 204,40 M170,66 C172,60 176,58 182,58 M192,58 C198,58 202,60 204,66" />
        </g>
        <P d="M84,182 C82,176 104,176 104,183 C102,188 86,188 84,182 Z" fill={yel} />
      </>
    );
  },
};

// ---------------------------------------------------------------------
// 7. 갈림길 거북이: 등딱지 위에 양쪽 화살표 표지판
// ---------------------------------------------------------------------
const turtle: Critter = {
  title: "갈림길 거북이",
  concept: "왼쪽일까 오른쪽일까, 아직 제자리",
  draw: (ctx) => {
    const skin = "#c6dfae";
    const shellC = "#93b57f";
    const shell = "M64,172 C58,122 92,92 134,92 C176,92 206,122 202,172 Z";
    const head = "M86,168 C54,172 16,158 14,130 C12,104 36,92 58,96 C80,100 90,126 90,150 Z";
    return (
      <>
        <P d="M196,160 C208,160 214,168 212,174 C204,176 196,174 192,170 Z" fill={skin} />
        <P d="M84,174 C82,166 110,166 110,176 C108,186 86,186 84,174 Z" fill={skin} />
        <P d="M158,174 C156,166 184,166 184,176 C182,186 160,186 158,174 Z" fill={skin} />
        <P d={head} fill={skin} />
        <P d={shell} fill={shellC} />
        <Fur ctx={ctx} id="ts" clip={shell}>
          <ellipse cx="120" cy="112" rx="34" ry="16" fill="#b9d3a4" />
        </Fur>
        <g {...THIN} strokeWidth={2.6} opacity={0.5}>
          <path d="M112,96 L104,130 L128,150 L160,138 L168,104 M104,130 L72,138 M128,150 L126,172 M160,138 L192,148" />
        </g>
        <path d="M66,172 L200,172" {...THIN} strokeWidth={4} />
        <Face ctx={ctx} x={42} y={128} o={{ gap: 26, mouth: "flat", brow: "worry", blush: false }} />
        <g fill="#f29a8f" opacity={0.5} filter={ctx.soft}>
          <ellipse cx="30" cy="142" rx="6" ry="4" />
        </g>
        {/* 갈림길 표지판 */}
        <path d="M134,92 L134,50" {...THIN} stroke={LINE} strokeWidth={4.5} />
        <P d="M134,48 L104,48 L94,56 L104,64 L134,64 Z" fill="#fbe7a0" />
        <P d="M134,66 L164,66 L174,74 L164,82 L134,82 Z" fill="#fffaf0" />
      </>
    );
  },
};

// ---------------------------------------------------------------------
// 8. 평화주의 카피바라: 머리에 귤 얹고 멍하니
// ---------------------------------------------------------------------
const capybara: Critter = {
  title: "평화주의 카피바라",
  concept: "일단 따뜻한 물에 들어가서 생각하자",
  draw: (ctx) => {
    const br = "#c59d73";
    const body = "M70,182 C56,154 62,118 92,110 L172,110 C200,116 208,154 196,182 Z";
    const head = "M34,132 C28,98 52,76 90,76 C126,76 142,98 140,128 C138,150 114,160 86,160 C58,160 36,152 34,132 Z";
    return (
      <>
        <P d={body} fill={br} />
        <Fur ctx={ctx} id="kb" clip={body}>
          <ellipse cx="150" cy="186" rx="60" ry="18" fill="#a9825c" opacity={0.5} />
        </Fur>
        <P d="M88,182 C86,174 110,174 110,183 C108,189 90,189 88,182 Z" fill={br} />
        <P d="M128,183 C128,174 152,174 150,182 C148,189 130,189 128,183 Z" fill={br} />
        <P d="M166,183 C166,174 190,174 188,182 C186,189 168,189 166,183 Z" fill={br} />
        <P d="M52,84 C46,74 52,64 62,66 C70,68 72,78 68,86 Z" fill={br} />
        <P d="M118,82 C124,72 118,62 108,64 C100,66 98,76 102,84 Z" fill={br} />
        <P d={head} fill={br} />
        <Fur ctx={ctx} id="kh" clip={head}>
          <ellipse cx="80" cy="140" rx="34" ry="18" fill="#dcbb94" />
        </Fur>
        <g {...THIN} strokeWidth={2.8}>
          <path d="M58,112 L68,112 M104,112 L114,112" />
        </g>
        <circle cx="76" cy="132" r="2.4" fill={LINE} />
        <circle cx="94" cy="132" r="2.4" fill={LINE} />
        <path d="M78,144 Q85,148 92,144" {...THIN} strokeWidth={2.6} />
        <g fill="#f29a8f" opacity={0.5} filter={ctx.soft}>
          <ellipse cx="50" cy="126" rx="8" ry="5" />
          <ellipse cx="122" cy="126" rx="8" ry="5" />
        </g>
        {/* 귤 */}
        <circle cx="86" cy="62" r="15" fill="#f5b25a" {...O} />
        <path d="M86,48 C80,40 90,36 96,40 C96,46 92,48 86,48 Z" fill="#9cc47f" {...O} strokeWidth={3} />
        {/* 김 */}
        <g {...THIN} strokeWidth={2.8} opacity={0.6}>
          <path d="M176,92 C170,84 182,78 176,68 M196,96 C190,88 202,82 196,72" />
        </g>
      </>
    );
  },
};

export const CRITTERS: Record<string, Critter> = { raccoon, owl, octopus, sloth, hamster, cat, turtle, capybara };

export function CritterArt({ id, size = 220 }: { id: keyof typeof CRITTERS | string; size?: number }) {
  const uid = useId().replace(/:/g, "");
  const c = CRITTERS[id];
  if (!c) return null;
  const ctx: Ctx = { uid, soft: `url(#soft-${uid})` };
  return (
    <svg width={size} height={(size * 200) / 240} viewBox="0 0 240 200" role="img" aria-label={c.title} style={{ display: "block", overflow: "visible" }}>
      <defs>
        {/* 손그림처럼 선이 아주 살짝 흔들림 (끊기지는 않음) */}
        <filter id={`wob-${uid}`} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed={id.length * 7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" />
        </filter>
        <filter id={`soft-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <ellipse cx="120" cy="187" rx="78" ry="7" fill="rgba(122,86,64,0.14)" />
      <g filter={`url(#wob-${uid})`}>{c.draw(ctx)}</g>
    </svg>
  );
}
