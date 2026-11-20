import { CRITTERS, CritterArt } from "../components/Critters";

/** 고민 동물 캐릭터 시안 모아보기 (/lab/mascot) */
export default function MascotLab() {
  const ids = Object.keys(CRITTERS);
  return (
    <div style={{ background: "#f4ead8", minHeight: "100vh", padding: 40, color: "#2b2118" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: 34 }}>고민 동물 캐릭터 시안</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
        {ids.map((id) => (
          <figure key={id} style={{ margin: 0, background: "#fffaf0", padding: "26px 12px 18px", textAlign: "center", borderRadius: 20 }}>
            <div style={{ display: "grid", placeItems: "center" }}>
              <CritterArt id={id} size={300} />
            </div>
            <figcaption style={{ marginTop: 10 }}>
              <div style={{ fontSize: 26 }}>{CRITTERS[id].title}</div>
              <div style={{ fontSize: 18, opacity: 0.65, marginTop: 4 }}>{CRITTERS[id].concept}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
