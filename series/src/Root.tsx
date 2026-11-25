import React from "react";
import { Composition, Still } from "remotion";
import { Cover } from "./Cover";
import { EPISODES } from "./episodes";
import { FPS, H, W } from "./kit";
import { Check, CHECK_FRAMES } from "./formats/Check";
import { Dex, DEX_FRAMES } from "./formats/Dex";
import { Letter, letterFrames } from "./formats/Letter";
import { Poll, POLL_FRAMES } from "./formats/Poll";

// 목록에 있는 편마다 영상 하나씩 (이름 = 편 id)
export const Root: React.FC = () => (
  <>
    {/* 썸네일 (편마다 하나, 이름 = 편-cover) */}
    {EPISODES.map((ep) => (
      <Still key={`${ep.id}-cover`} id={`${ep.id}-cover`} component={Cover} width={W} height={H} defaultProps={{ ep }} />
    ))}
    {EPISODES.map((ep) => {
      const common = { id: ep.id, fps: FPS, width: W, height: H };
      switch (ep.format) {
        case "dex":
          return <Composition key={ep.id} {...common} component={Dex} durationInFrames={DEX_FRAMES} defaultProps={ep.props} />;
        case "poll":
          return <Composition key={ep.id} {...common} component={Poll} durationInFrames={POLL_FRAMES} defaultProps={ep.props} />;
        case "check":
          return <Composition key={ep.id} {...common} component={Check} durationInFrames={CHECK_FRAMES} defaultProps={ep.props} />;
        case "letter":
          return <Composition key={ep.id} {...common} component={Letter} durationInFrames={letterFrames(ep.props.lines)} defaultProps={ep.props} />;
      }
    })}
  </>
);
