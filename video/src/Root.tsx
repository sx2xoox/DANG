import React from "react";
import { Composition } from "remotion";
import { Shorts } from "./Shorts";
import tl from "./timeline.json";

export const Root: React.FC = () => (
  <Composition
    id="Shorts"
    component={Shorts}
    durationInFrames={tl.durationFrames}
    fps={tl.fps}
    width={tl.width}
    height={tl.height}
    defaultProps={{ siteUrl: "dawoong-gomin.pages.dev" }}
  />
);
