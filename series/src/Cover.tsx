import React from "react";
import { AbsoluteFill } from "remotion";
import type { Episode } from "./episodes";
import { C, CorkBg, F, Headline, Mascot, Tape, useFonts, W } from "./kit";
import { TraitNotes } from "./formats/Dex";

/**
 * 썸네일 (커버) 이미지: 1080 × 1920
 *  - 인스타 프로필 격자는 가운데 3:4 (위아래 240px 씩 잘림) 만 보여서, 중요한 건 y 300 ~ 1620 안에 둬요.
 *  - 도감은 특징을 "?" 포스트잇으로 가려서, 체크리스트는 목록을 그대로 보여줘서 궁금하게
 */
const LABEL: Record<Episode["format"], string> = {
  dex: "고민 동물 도감",
  poll: "너라면?",
  check: "공감 테스트",
  letter: "다웅의 편지",
};

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
        <Headline text={ep.format === "poll" ? ep.props.situation : hook} size={ep.format === "poll" ? 70 : ep.format === "dex" ? 82 : 92} width={960} />
      </div>

      <div style={{ position: "absolute", top: 800, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {ep.format === "dex" && (
          <div style={{ position: "relative", width: W, height: 840, marginTop: -100, transform: "scale(0.9)", transformOrigin: "50% 0" }}>
            <TraitNotes traits={ep.props.traits} />
          </div>
        )}
        {ep.format === "check" && (
          <div style={{ width: 860, background: "#fffdf3", backgroundImage: "repeating-linear-gradient(transparent 0 106px, rgba(47,127,209,0.12) 106px 109px)", padding: "50px 46px 40px", boxShadow: "0 24px 34px -14px rgba(50,30,10,0.5)", transform: "rotate(-1deg)", position: "relative" }}>
            <Tape style={{ left: "50%", marginLeft: -95, top: -26 }} />
            {ep.props.items.slice(0, 5).map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, padding: "18px 0", borderBottom: "3px dashed rgba(43,33,24,0.18)" }}>
                <div style={{ flex: "none", width: 70, height: 70, border: `6px solid ${C.ink}`, borderRadius: 10, background: "#fff" }} />
                <div style={{ fontFamily: F.hand, fontSize: 66, lineHeight: 1.05, color: C.ink, wordBreak: "keep-all" }}>{t}</div>
              </div>
            ))}
          </div>
        )}

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

      {(ep.format === "poll" || ep.format === "letter" || ep.format === "dex") && (
        <div style={{ position: "absolute", top: ep.format === "dex" ? 1500 : 1440, left: 0, right: 0, textAlign: "center" }}>
          <span style={{ display: "inline-block", background: C.ink, color: "#fff", fontFamily: ep.format === "poll" ? F.title : F.body, fontSize: 62, padding: "16px 44px", borderRadius: 999, transform: "rotate(-2deg)" }}>
            {ep.format === "dex" ? (
              "너는 몇 개나 해당돼? 👀"
            ) : ep.format === "poll" ? (
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
