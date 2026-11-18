import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/global.css";
import { App } from "./App";
import { PARAMS } from "./lib/params";
import { installViewportFix } from "./lib/vvFix";

// ?z= time dilation, read by every CSS animation as var(--z)
document.documentElement.style.setProperty("--z", String(PARAMS.z));

installViewportFix();

// iOS Safari only applies :active styles when the page listens for touches.
// This empty passive listener turns on instant pressed states everywhere.
document.addEventListener("touchstart", () => {}, { passive: true });

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
