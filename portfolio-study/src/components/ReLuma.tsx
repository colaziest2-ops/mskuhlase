/**
 * RELUMA for React — depth-aware relighting that follows the cursor, on the
 * visitor's GPU. Adapted from the exported wrapper: the engine is self-hosted
 * from /public/reluma.js (it makes no network calls), and the photo and depth
 * map are same-origin so WebGL can read them. Without WebGL the plain photo
 * is shown.
 */
import { createElement, useEffect } from "react";
import type { CSSProperties } from "react";

export const RELUMA_SCRIPT = "/reluma.js";

export type RelumaPreset = "soft-studio" | "dramatic" | "cinematic" | "neon" | "daylight";

export interface ReLumaProps {
  src: string;
  depth: string;
  preset?: RelumaPreset;
  intensity?: number;
  radius?: number;
  softness?: number;
  color?: string;
  ambient?: number;
  lightHeight?: number;
  spec?: number;
  relief?: number;
  shadow?: number;
  interaction?: "hover" | "page" | "none";
  idle?: "drift" | "still";
  fit?: "cover" | "contain";
  view?: "relit" | "original" | "depth";
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

let loading: Promise<void> | null = null;

function loadEngine(): Promise<void> {
  if (window.customElements.get("reluma-light")) return Promise.resolve();
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = RELUMA_SCRIPT;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        reject(new Error("RELUMA engine failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export function ReLuma({ className, style, ...options }: ReLumaProps) {
  useEffect(() => {
    loadEngine().catch((e: unknown) => console.warn(e));
  }, []);

  const attrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(options)) {
    // camelCase props become kebab-case attributes: lightHeight → light-height
    if (value !== undefined && value !== null) {
      attrs[key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())] = String(value);
    }
  }

  const props: Record<string, unknown> = {
    ...attrs,
    className,
    style: { display: "block", ...style },
  };
  return createElement("reluma-light" as string, props);
}
