import { Mascot, SPECIES, type Mood } from "../components/Mascot";

const MOODS: Mood[] = ["calm", "worry", "teary", "angry", "dizzy", "happy", "blank", "sleepy"];
const MOOD_LABEL: Record<Mood, string> = { calm: "평온", worry: "걱정", teary: "슬픔·억울", angry: "분노", dizzy: "멘붕", happy: "설렘", blank: "현타", sleepy: "졸림" };
const SAMPLE: [string, Mood][] = [
  ["곱씹는 라쿤", "worry"],
  ["새벽 3시 부엉이", "sleepy"],
  ["갈팡질팡 문어", "dizzy"],
  ["삐진 고양이", "angry"],
  ["볼 빵빵 햄스터", "calm"],
  ["꼬리 내린 강아지", "teary"],
  ["두근두근 토끼", "happy"],
  ["현타 온 펭귄", "blank"],
  ["갈림길 거북이", "worry"],
  ["눈치 보는 여우", "calm"],
  ["현타 온 코알라", "blank"],
  ["웅크린 고슴도치", "teary"],
];

/** 마스코트 그림체 시안 모아보기 (/lab/mascot) */
export default function MascotLab() {
  const rest = Object.keys(SPECIES).filter((s) => !SAMPLE.some(([n]) => n.endsWith(s)));
  return (
    <div style={{ background: "#e2c49b", minHeight: "100vh", padding: 40, color: "#2b2118" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: 34 }}>고민 동물 그림체 시안</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 20 }}>
        {SAMPLE.map(([name, mood]) => (
          <figure key={name} style={{ margin: 0, background: "#fffdf6", padding: "18px 10px 14px", textAlign: "center", boxShadow: "0 10px 16px -8px rgba(60,36,14,.45)" }}>
            <div style={{ display: "grid", placeItems: "center" }}>
              <Mascot name={name} mood={mood} size={190} />
            </div>
            <figcaption style={{ fontSize: 22, marginTop: 6 }}>{name}</figcaption>
          </figure>
        ))}
      </div>

      <h2 style={{ margin: "40px 0 16px", fontSize: 26 }}>같은 동물, 다른 고민 (표정 8종)</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 14 }}>
        {MOODS.map((m) => (
          <figure key={m} style={{ margin: 0, background: "#fff1a8", padding: "12px 6px", textAlign: "center" }}>
            <div style={{ display: "grid", placeItems: "center" }}>
              <Mascot name="라쿤" mood={m} size={140} />
            </div>
            <figcaption style={{ fontSize: 20 }}>{MOOD_LABEL[m]}</figcaption>
          </figure>
        ))}
      </div>

      <h2 style={{ margin: "40px 0 16px", fontSize: 26 }}>그 밖의 동물들</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 14 }}>
        {rest.map((s, i) => (
          <figure key={s} style={{ margin: 0, background: "#fffdf6", padding: "12px 6px", textAlign: "center" }}>
            <div style={{ display: "grid", placeItems: "center" }}>
              <Mascot name={s} mood={MOODS[i % MOODS.length]} size={140} />
            </div>
            <figcaption style={{ fontSize: 20 }}>{s}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
