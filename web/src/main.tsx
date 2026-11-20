import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/yeon-sung";
import "@fontsource/nanum-pen-script";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./styles/font-display.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/pages.css";
import "./styles/post.css";
import "./styles/result.css";
import "./styles/lounge.css";
import "./styles/cork.css";
import "./styles/mascot.css";
import "./styles/fonts.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
