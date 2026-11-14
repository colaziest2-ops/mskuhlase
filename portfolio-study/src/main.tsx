import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/global.css";
import { App } from "./App";
import { PARAMS } from "./lib/params";

// ?z= time dilation, read by every CSS animation as var(--z)
document.documentElement.style.setProperty("--z", String(PARAMS.z));

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
