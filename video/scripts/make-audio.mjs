// 영상 소리 만들기: 로파이 비트 + 효과음을 timeline.json 박자에 정확히 맞춰 합성합니다.
// 외부 음원을 쓰지 않으므로 저작권 걱정이 없습니다.  →  public/audio/shorts.wav
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const tl = JSON.parse(fs.readFileSync(path.join(here, "../src/timeline.json"), "utf8"));

const SR = 48000;
const dur = tl.durationFrames / tl.fps + 0.5;
const N = Math.ceil(dur * SR);
const music = new Float32Array(N);
const fx = new Float32Array(N);
const beatSec = 60 / 92;
const barSec = beatSec * 4;
const fr = (f) => f / tl.fps;

// 재현 가능한 잡음
let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296 * 2 - 1;
};

function add(buf, t0, len, fn) {
  const s0 = Math.floor(t0 * SR);
  const n = Math.floor(len * SR);
  for (let i = 0; i < n; i++) {
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    buf[k] += fn(i / SR, i);
  }
}

// 한 극 저역 통과 필터를 쓰는 잡음
function filteredNoise(t0, len, amp, envFn, cutoff = 0.2) {
  let y = 0;
  add(fx, t0, len, (t) => {
    y += cutoff * (rnd() - y);
    return y * amp * envFn(t);
  });
}

function hpNoise(buf, t0, len, amp, envFn) {
  let prev = 0;
  add(buf, t0, len, (t) => {
    const x = rnd();
    const y = x - prev;
    prev = x;
    return y * 0.5 * amp * envFn(t);
  });
}

const exp = (k) => (t) => Math.exp(-t * k);

// ------------------------------------------------------------------ 음악
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// Fmaj7 - Em7 - Dm7 - Cmaj7 (부드러운 로파이 진행)
const CHORDS = [
  [53, 57, 60, 64],
  [52, 55, 59, 62],
  [50, 53, 57, 60],
  [48, 52, 55, 59],
];
const BASS = [41, 40, 38, 36];

function kick(buf, t0, amp = 0.9) {
  let ph = 0;
  add(buf, t0, 0.45, (t) => {
    const f = 45 + 80 * Math.exp(-t * 28);
    ph += (2 * Math.PI * f) / SR;
    return Math.sin(ph) * amp * Math.exp(-t * 7.5);
  });
  add(buf, t0, 0.006, (t) => rnd() * 0.25 * amp * (1 - t / 0.006));
}

function snare(buf, t0, amp = 0.45) {
  hpNoise(buf, t0, 0.22, amp, exp(18));
  add(buf, t0, 0.12, (t) => Math.sin(2 * Math.PI * 190 * t) * amp * 0.4 * Math.exp(-t * 30));
}

function hat(buf, t0, amp = 0.12) {
  hpNoise(buf, t0, 0.05, amp, exp(90));
}

function pad(t0, len, notes, amp = 0.05) {
  for (const n of notes) {
    const f = NOTE(n);
    add(music, t0, len + 0.3, (t) => {
      const a = Math.min(1, t / 0.06) * (t > len ? Math.exp(-(t - len) * 10) : 1);
      const vib = 1 + 0.0025 * Math.sin(2 * Math.PI * 4.2 * t);
      const w = 2 * Math.PI * f * vib * t;
      return (Math.sin(w) + 0.25 * Math.sin(2 * w) + 0.08 * Math.sin(3 * w)) * amp * a * (0.75 + 0.25 * Math.exp(-t * 2));
    });
  }
}

function bass(t0, len, n, amp = 0.22) {
  const f = NOTE(n);
  add(music, t0, len, (t) => Math.sin(2 * Math.PI * f * t) * amp * Math.min(1, t / 0.01) * Math.exp(-t * 2.2));
}

function rim(buf, t0, amp = 0.16) {
  add(buf, t0, 0.05, (t) => Math.sin(2 * Math.PI * 1150 * t) * amp * Math.exp(-t * 110));
  hpNoise(buf, t0, 0.02, amp * 0.6, exp(200));
}

function pluck(t0, n, amp = 0.06) {
  const f = NOTE(n);
  add(music, t0, 0.9, (t) => (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * amp * Math.min(1, t / 0.004) * Math.exp(-t * 5));
}

// 장면에 맞춘 구성: 박자를 화면에 끼워 맞추지 않고, 장면이 바뀌는 순간에 음악이 새로 시작합니다.
//  board   : 화음만 깔고 쪽지 붙는 소리가 주인공
//  groove  : 부드러운 리듬 (세게 치는 북 없이)
//  tension : 낮은 화음과 심장 소리
//  live    : 북 없이 잔잔하게 (읽고 이야기 나누는 구간)
//  end     : 긴 화음으로 마무리
const M = tl.marks;
const SECTIONS = [
  { kind: "board", from: 0, to: M.caption1 },
  { kind: "groove", from: M.caption1, to: M.drop },
  { kind: "tension", from: M.drop, to: M.flip },
  { kind: "groove", from: M.flip, to: tl.scenes.live[0] },
  { kind: "live", from: tl.scenes.live[0], to: M.endSlam },
  { kind: "end", from: M.endSlam, to: tl.durationFrames },
];
let chordAt = 0;
for (const sec of SECTIONS) {
  const t0 = fr(sec.from);
  const t1 = fr(sec.to);
  if (sec.kind === "end") {
    pad(t0, t1 - t0, CHORDS[3], 0.055);
    bass(t0, barSec, BASS[3], 0.2);
    [60, 64, 67, 71, 76].forEach((n, i) => pluck(t0 + 0.25 + i * 0.22, n, 0.06));
    continue;
  }
  for (let bar = 0; t0 + bar * barSec < t1 - 0.05; bar++) {
    const t = t0 + bar * barSec;
    const len = Math.min(barSec, t1 - t);
    const ci = chordAt++ % 4;
    const chord = CHORDS[ci];
    const inBar = (bt) => bt < t1 - 0.02;
    if (sec.kind === "board") {
      pad(t, len, chord, 0.02 + 0.006 * bar);
      continue;
    }
    if (sec.kind === "tension") {
      pad(t, len, chord.map((n) => n - 12), 0.04);
      continue;
    }
    const live = sec.kind === "live";
    pad(t, len, chord, live ? 0.042 : 0.048);
    for (let b = 0; b < 4; b++) {
      const bt = t + b * beatSec;
      if (!inBar(bt)) break;
      if (b === 0 || b === 2) bass(bt, beatSec * 2, BASS[ci], live ? 0.13 : 0.18);
      if (!live) {
        if (b === 0 || b === 2) kick(music, bt, 0.42);
        if (b === 1 || b === 3) rim(music, bt, 0.15);
        if (inBar(bt + beatSec / 2)) hat(music, bt + beatSec / 2, 0.055);
      } else if (b === 3) {
        rim(music, bt, 0.08);
      } else if (inBar(bt + beatSec / 2)) {
        hat(music, bt + beatSec / 2, 0.03);
      }
    }
    // 화음을 풀어 치는 가락
    const arp = live ? [[0, 0], [2.5, 2]] : [[0, 0], [1.5, 2], [2.5, 1], [3.5, 3]];
    for (const [b, k] of arp) {
      const bt = t + b * beatSec;
      if (inBar(bt)) pluck(bt, chord[k] + 12, live ? 0.045 : 0.055);
    }
  }
}

// 바이닐 잡음 (아주 작게)
for (let i = 0; i < N; i++) {
  if (rnd() > 0.9992) music[i] += rnd() * 0.08;
  music[i] += rnd() * 0.004;
}

// ------------------------------------------------------------------ 효과음
const SFX = {
  pin(t0, e, amp = 1, pitch = 1) {
    add(fx, t0, 0.04, (t) => Math.sin(2 * Math.PI * 2100 * pitch * t) * 0.45 * amp * Math.exp(-t * 140));
    add(fx, t0, 0.08, (t) => Math.sin(2 * Math.PI * 420 * pitch * t) * 0.55 * amp * Math.exp(-t * 60));
    hpNoise(fx, t0, 0.012, 0.5 * amp, exp(300));
  },
  marker(t0) {
    filteredNoise(t0, 0.3, 0.7, (t) => Math.sin(Math.PI * Math.min(1, t / 0.3)) ** 2, 0.45);
  },
  soft(t0) {
    for (const [n, d] of [[72, 0], [79, 0.09]]) {
      add(fx, t0 + d, 0.7, (t) => Math.sin(2 * Math.PI * NOTE(n) * t) * 0.14 * Math.exp(-t * 6));
    }
  },
  tick(t0) {
    add(fx, t0, 0.03, (t) => Math.sin(2 * Math.PI * 1500 * t) * 0.18 * Math.exp(-t * 120));
  },
  whoosh(t0) {
    filteredNoise(t0 - 0.12, 0.35, 0.9, (t) => Math.sin(Math.PI * Math.min(1, t / 0.35)) ** 2, 0.08);
  },
  tap(t0) {
    add(fx, t0, 0.05, (t) => Math.sin(2 * Math.PI * 640 * t) * 0.3 * Math.exp(-t * 80));
  },
  swish(t0) {
    let y = 0;
    add(fx, t0, 1.0, (t) => {
      const c = 0.05 + 0.25 * t;
      y += c * (rnd() - y);
      return y * 0.35 * Math.sin(Math.PI * t);
    });
  },
  stamp(t0) {
    kick(fx, t0, 1.0);
    filteredNoise(t0, 0.12, 0.9, exp(30), 0.35);
  },
  flutter(t0) {
    filteredNoise(t0, 0.45, 0.6, (t) => (0.5 + 0.5 * Math.sin(2 * Math.PI * 28 * t)) * Math.exp(-t * 4), 0.3);
  },
  heartbeat(t0) {
    for (const d of [0, 0.16]) {
      add(fx, t0 + d, 0.2, (t) => Math.sin(2 * Math.PI * 52 * t) * (d ? 0.55 : 0.75) * Math.exp(-t * 18));
    }
  },
  riser(t0, e) {
    let y = 0;
    const len = fr(e.to) - t0;
    add(fx, t0, len, (t) => {
      const p = t / len;
      y += (0.02 + 0.4 * p * p) * (rnd() - y);
      return y * 0.45 * p * p;
    });
  },
  impact(t0) {
    kick(fx, t0, 1.0);
    hpNoise(fx, t0, 0.9, 0.35, exp(4.5));
  },
  whir(t0) {
    let ph = 0;
    add(fx, t0, 0.5, (t) => {
      ph += (2 * Math.PI * (130 + 40 * t)) / SR;
      const saw = (ph / Math.PI) % 2 - 1;
      return saw * 0.06 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 22 * t)) * Math.sin(Math.PI * t / 0.5);
    });
  },
  tape(t0) {
    hpNoise(fx, t0, 0.14, 0.55, (t) => Math.min(1, t / 0.01) * Math.exp(-t * 22));
  },
  flip(t0) {
    filteredNoise(t0, 0.08, 1.2, exp(45), 0.5);
    add(fx, t0, 0.04, (t) => Math.sin(2 * Math.PI * 900 * t) * 0.12 * Math.exp(-t * 90));
  },
  thud(t0) {
    add(fx, t0, 0.25, (t) => Math.sin(2 * Math.PI * 85 * t) * 0.8 * Math.exp(-t * 16));
    filteredNoise(t0, 0.06, 0.6, exp(50), 0.4);
  },
  chat(t0) {
    add(fx, t0, 0.07, (t) => (Math.sin(2 * Math.PI * 880 * t) + (t > 0.03 ? Math.sin(2 * Math.PI * 1320 * t) : 0)) * 0.13 * Math.exp(-t * 40));
  },
  pen(t0) {
    let y = 0;
    add(fx, t0, 0.9, (t) => {
      y += 0.5 * (rnd() - y);
      const strokes = Math.max(0, Math.sin(2 * Math.PI * 7 * t + Math.sin(13 * t) * 2));
      return y * 0.22 * strokes * Math.sin(Math.PI * t / 0.9);
    });
  },
};

for (const e of tl.sfx) {
  const fn = SFX[e.type];
  if (!fn) throw new Error(`unknown sfx ${e.type}`);
  fn(fr(e.f), e);
}

// 쪽지 붙는 소리: 처음엔 또렷하게 하나씩, 빨라질수록 작고 가볍게
tl.notes.forEach((f, i) => {
  const k = i / (tl.notes.length - 1);
  SFX.pin(fr(f), null, i === 0 ? 1 : 0.85 - 0.45 * k, 1 + 0.25 * k + 0.08 * rnd());
});
// 쪽지가 몰아칠 때 깔리는 바람 소리
SFX.riser(fr(tl.notes[8]), { to: tl.marks.caption1 });

// ------------------------------------------------------------------ 섞기 + 덕킹
// 효과음이 날 때 음악을 살짝 낮춰서 효과가 또렷하게 들리게
const env = new Float32Array(N);
let e = 0;
for (let i = 0; i < N; i++) {
  const a = Math.abs(fx[i]);
  e = a > e ? a : e * 0.9995;
  env[i] = e;
}
const out = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  const duck = 1 - Math.min(0.45, env[i] * 0.6);
  let v = music[i] * 0.9 * duck + fx[i] * 1.0;
  // 끝부분 페이드 아웃
  const t = i / SR;
  const end = tl.durationFrames / tl.fps;
  if (t > end - 0.6) v *= Math.max(0, (end - t) / 0.6);
  v = Math.tanh(v * 1.1);
  out[i] = v;
  peak = Math.max(peak, Math.abs(v));
}
const gain = 0.89 / peak;

// 16비트 WAV (스테레오, 같은 소리)
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const s = Math.max(-1, Math.min(1, out[i] * gain));
  const v = Math.round(s * 32767);
  data.writeInt16LE(v, i * 4);
  data.writeInt16LE(v, i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);
const outDir = path.join(here, "../public/audio");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "shorts.wav"), Buffer.concat([header, data]));
console.log(`wrote public/audio/shorts.wav (${dur.toFixed(1)}s, peak gain ${gain.toFixed(2)})`);
