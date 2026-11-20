import { useState } from "react";
import { MASCOTS, MASCOT_MOODS, mascotFor, moodFromStamp, type MascotMood } from "@shared/mascots.ts";
import { GOMIN } from "@shared/boxes.ts";
import { Mascot } from "../components/Mascot";

/** 고민 동물 캐릭터 도안: 그려진 친구 전체 + 표정 + 황금·실루엣 + 이름 맞춰보기 */
export default function Mascots() {
  const [mood, setMood] = useState<MascotMood>("basic");
  const [look, setLook] = useState<"normal" | "golden" | "silhouette">("normal");
  const [test, setTest] = useState("곱씹는 라쿤");
  const hit = mascotFor(test);
  const moodStamps = (m: MascotMood) =>
    GOMIN.stamps.filter((s) => moodFromStamp(s.id) === m).map((s) => s.label).join("·");

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">캐릭터 도안</h1>
          <p className="adm-dim">
            지금 그려진 고민 동물 {MASCOTS.length}마리예요. 고민 동물 이름 끝이 아래 이름과 맞으면 이 그림이 나오고, 맞는 그림이 없으면 예전처럼 이모지가 나와요.
            표정은 사연을 보낼 때 고른 감정 우표에 따라 바뀌어요.
          </p>
        </div>
      </header>

      <section className="adm-panel adm-ms-test">
        <label htmlFor="ms-test">고민 동물 이름으로 맞춰보기</label>
        <div className="adm-ms-test-row">
          <input id="ms-test" className="input" value={test} onChange={(e) => setTest(e.target.value)} placeholder="예) 새벽 3시 부엉이" />
          <Mascot name={test} emoji="❔" mood={mood} size={72} />
          <span className="adm-small">{hit ? `→ ${hit.ko} 그림` : "→ 아직 그려지지 않은 동물이라 이모지가 나와요"}</span>
        </div>
      </section>

      <div className="adm-ms-controls" role="group" aria-label="표정 고르기">
        {MASCOT_MOODS.map((m) => (
          <button key={m.id} type="button" className={`adm-chip ${mood === m.id ? "is-on" : ""}`} onClick={() => setMood(m.id)}>
            {m.label}
            {moodStamps(m.id) && <small> ({moodStamps(m.id)} 우표)</small>}
          </button>
        ))}
      </div>
      <div className="adm-ms-controls" role="group" aria-label="모습 고르기">
        {(
          [
            ["normal", "보통"],
            ["golden", "황금"],
            ["silhouette", "도감에서 아직 못 모은 칸"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={`adm-chip ${look === id ? "is-on" : ""}`} onClick={() => setLook(id)}>
            {label}
          </button>
        ))}
      </div>

      <ul className="adm-ms-grid">
        {MASCOTS.map((m) => (
          <li key={m.id} className="adm-ms-item">
            <Mascot mascot={m} mood={mood} golden={look === "golden"} silhouette={look === "silhouette"} size={110} />
            <strong>{m.ko}</strong>
            <span className="adm-small adm-dim">{m.names.join(", ")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

