import type { CSSProperties, ReactNode } from "react";
import type { ColorName } from "../content";
import { useInView } from "../lib/scroll";
import styles from "./Hl.module.css";

/** A highlighted word in running text: coloured, with a marker stroke that wipes in when it's read. */
export function Hl({ c, children }: { c: ColorName; children: ReactNode }) {
  const [ref, seen] = useInView<HTMLSpanElement>({ threshold: 0.9, rootMargin: "0px 0px -10% 0px" });
  return (
    <span ref={ref} className={styles.hl} data-in={seen} style={{ "--hc": `var(--c-${c})` } as CSSProperties}>
      {children}
    </span>
  );
}
