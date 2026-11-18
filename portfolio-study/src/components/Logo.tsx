import type { CSSProperties } from "react";
import { logoFor } from "../lib/logos";
import styles from "./Logo.module.css";

/**
 * Brand marks (simple-icons, CC0) and generic icons (lucide, ISC) from lib/logos.ts.
 *
 * Two technologies have no official mark available to inline, so they get an honest
 * typographic badge instead of a wrong or invented logo:
 *   C#   – the set only has the .NET wordmark, which is a different thing
 *   SQL  – a language, not a product
 */
const TEXT: Readonly<Record<string, { label: string; hex: string }>> = {
  csharp: { label: "C#", hex: "512BD4" },
  sql: { label: "SQL", hex: "8A94A6" },
};

/** Marks that vanish on a near-black page (we lighten them) or on a white one (we deepen them). */
const DARK_ON_DARK = new Set(["nextjs", "csharp"]);
const DIM_ON_DARK = new Set(["framer", "vite", "postgresql"]);
const PALE_ON_LIGHT = new Set(["react", "tailwind", "nodejs", "sql", "php", "linux", "javascript"]);

interface LogoProps {
  readonly id: string;
  readonly size?: number;
  /** Draw in the surrounding text colour instead of the brand colour. */
  readonly mono?: boolean;
  /** The label is already written next to it, so hide the mark from screen readers. */
  readonly decorative?: boolean;
}

export function Logo({ id, size = 22, mono = false, decorative = false }: LogoProps) {
  const text = TEXT[id];
  const logo = logoFor(id);
  const hex = text?.hex ?? logo?.hex;
  const tone = DARK_ON_DARK.has(id)
    ? "dark"
    : DIM_ON_DARK.has(id)
      ? "dim"
      : PALE_ON_LIGHT.has(id)
        ? "pale"
        : "normal";
  const a11y = decorative ? { "aria-hidden": true } : { role: "img" as const };
  const style = {
    width: size,
    height: size,
    ...(hex && !mono ? { "--lg": `#${hex}` } : {}),
  } as CSSProperties;

  if (text) {
    return (
      <span
        className={styles.logo}
        data-tone={tone}
        data-mono={mono}
        data-kind="text"
        style={{ ...style, fontSize: Math.max(12, Math.round(size * (text.label.length > 2 ? 0.5 : 0.62))) }}
        {...a11y}
        {...(decorative ? {} : { "aria-label": text.label })}
      >
        {text.label}
      </span>
    );
  }

  if (!logo) return null;

  return (
    <svg
      className={styles.logo}
      data-tone={tone}
      data-mono={mono}
      data-kind={logo.kind}
      style={style}
      viewBox={logo.viewBox}
      {...a11y}
      {...(decorative ? {} : { "aria-label": logo.title })}
      {...(logo.stroke
        ? { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
        : { fill: "currentColor" })}
    >
      {logo.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
