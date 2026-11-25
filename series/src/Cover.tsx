import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import type { Episode } from "./episodes";
import { C, CorkBg, F, Headline, Mascot, Tape, useFonts } from "./kit";

/**
 * 썸네일 (커버) 이미지: 1080 × 1920
 *  - 인스타 프로필 격자는 가운데 3:4 (위아래 240px 씩 잘림) 만 보여서, 중요한 건 y 300 ~ 1620 안에 둬요.
 *  - 도감·체크리스트는 정답 동물을 실루엣으로 가려서 궁금하게
 */
const LABEL: Record<Episode["format"], string> = {
  dex: "고민 동물 도감",
  poll: "너라면?",
  check: "공감 테스트",
  letter: "다웅의 편지",
};

const Silhouette: React.FC<{ id: string; bg?: string }> = ({ id, bg = "#d6e9f5" }) => (
  <div style={{ width: 640, background: "#fffefb", padding: "32px 32px 0", boxSizing: "border-box", boxShadow: "0 30px 40px -14px rgba(50,30,10,0.55)", position: "relative", transform: "rotate(-3deg)" }}>
    <Tape style={{ left: -36, top: -16, transform: "rotate(-22deg)" }} />
    <Tape color={C.tapeB} style={{ right: -36, top: -16, transform: "rotate(20deg)" }} />
    <div style={{ width: 576, height: 576, background: bg, display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
      <Img src={staticFile(`mascots/${id}.webp`)} style={{ width: 470, height: 470, objectFit: "contain", filter: "brightness(0) opacity(0.82)" }} />
      <span style={{ position: "absolute", fontFamily: F.title, fontSize: 300, color: "#fff", WebkitTextStroke: `10px ${C.ink}`, paintOrder: "stroke", lineHeight: 1 }}>?</span>
    </div>
    <div style={{ padding: "22px 0 30px", textAlign: "center", fontFamily: F.title, fontSize: 64, color: C.ink }}>너는 어떤 동물?</div>
  </div>
);

export const Cover: React.FC<{ ep: Episode }> = ({ ep }) => {
  useFonts();
  const hook = ep.format === "letter" ? ep.props.title : ep.props.hook;
  return (
    <AbsoluteFill>
      <CorkBg />
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ display: "inline-block", background: C.red, color: "#fff", fontFamily: F.title, fontSize: 46, padding: "10px 34px", borderRadius: 999, transform: "rotate(-2deg)" }}>{LABEL[ep.format]}</span>
      </div>
      <div style={{ position: "absolute", top: 420, left: 0, right: 0 }}>
        <Headline text={ep.format === "poll" ? ep.props.situation : hook} size={ep.format === "poll" ? 70 : 92} width={960} />
      </div>

      <div style={{ position: "absolute", top: 800, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {(ep.format === "dex" || ep.format === "check") && <Silhouette id={ep.props.animal.id} bg={ep.props.animal.bg} />}

        {ep.format === "poll" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 40 }}>
            {[
              { k: "A", m: ep.props.a.mascot, c: C.red, r: -6 },
              { k: "VS" },
              { k: "B", m: ep.props.b.mascot, c: C.blue, r: 6 },
            ].map((x) =>
              x.k === "VS" ? (
                <div key="vs" style={{ fontFamily: F.title, fontSize: 150, color: C.marker, WebkitTextStroke: `9px ${C.ink}`, paintOrder: "stroke", textShadow: `6px 8px 0 ${C.ink}`, transform: "rotate(-8deg)", zIndex: 2 }}>VS</div>
              ) : (
                <div key={x.k} style={{ position: "relative", transform: `rotate(${x.r}deg)`, background: C.poster, border: `7px solid ${C.ink}`, boxShadow: `10px 12px 0 ${C.ink}`, padding: "60px 20px 20px" }}>
                  <div style={{ position: "absolute", top: -56, left: "50%", marginLeft: -56, width: 112, height: 112, borderRadius: "50%", background: x.c, border: `7px solid ${C.ink}`, display: "grid", placeItems: "center", fontFamily: F.title, fontSize: 66, color: "#fff" }}>{x.k}</div>
                  <Mascot id={x.m!} size={300} />
                </div>
              ),
            )}
          </div>
        )}

        {ep.format === "letter" && (
          <div style={{ position: "relative", width: 860, height: 560, background: "#f7ecd6", boxShadow: "0 30px 40px -14px rgba(50,30,10,0.55)", overflow: "hidden", transform: "rotate(-3deg)", marginTop: 40 }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 280, background: "#efdfc0", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
            <div style={{ position: "absolute", left: 430 - 50, top: 230, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #ff8f7d, #d9483b 60%, #a8322a)", boxShadow: "0 6px 8px rgba(0,0,0,0.3)", display: "grid", placeItems: "center", color: "#fff", fontSize: 48 }}>♥</div>
            <div style={{ position: "absolute", left: 64, top: 350, fontFamily: F.hand, fontSize: 80, color: C.ink, lineHeight: 1.12 }}>
              To. {ep.props.to ?? "오늘도 애쓴 너"}
              <br />
              <span style={{ color: C.red }}>From. {ep.props.from ?? "다웅"}</span>
            </div>
          </div>
        )}
      </div>

      {(ep.format === "poll" || ep.format === "letter") && (
        <div style={{ position: "absolute", top: 1440, left: 0, right: 0, textAlign: "center" }}>
          <span style={{ display: "inline-block", background: C.ink, color: "#fff", fontFamily: ep.format === "poll" ? F.title : F.body, fontSize: 62, padding: "16px 44px", borderRadius: 999, transform: "rotate(-2deg)" }}>
            {ep.format === "poll" ? (
              <>
                댓글로 <span style={{ color: "#ff8a78" }}>A</span> / <span style={{ color: "#8cc4ff" }}>B</span> 골라줘!
              </>
            ) : (
              "💌 다웅이 보낸 편지"
            )}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
