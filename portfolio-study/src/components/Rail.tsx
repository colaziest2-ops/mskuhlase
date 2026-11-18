import type { CSSProperties } from "react";
import { SECTIONS } from "../content";
import styles from "./Rail.module.css";

/**
 * The glowing readout in the bottom-left corner on wide screens: the current
 * section's number and title, arriving distorted each time it changes. The
 * section buttons themselves live in the Flow Tab Bar.
 */
export function Rail({ active }: { readonly active: number }) {
  const section = SECTIONS[active];
  return (
    <div className={styles.rail} aria-hidden="true">
      {/* keyed on the section so the distortion replays each time the readout changes */}
      <p key={active} className={styles.readout} style={{ "--mc": `var(--c-${section?.color ?? "amber"})` } as CSSProperties}>
        <span>{String(active + 1).padStart(2, "0")}</span>
        {section?.title}
      </p>
    </div>
  );
}
