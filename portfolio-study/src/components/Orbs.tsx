import { useEffect, useRef } from "react";
import { subscribeScroll } from "../lib/scroll";
import styles from "./Orbs.module.css";

/**
 * Soft colour fields behind everything. They drift on their own, very slowly,
 * and travel with the scroll so the page's colour temperature shifts as you move.
 */
export function Orbs() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      subscribeScroll((s) => {
        root.current?.style.setProperty("--sp", s.p.toFixed(4));
      }),
    [],
  );

  return (
    <div ref={root} className={styles.orbs} aria-hidden="true">
      <i className={`${styles.o} ${styles.a}`} />
      <i className={`${styles.o} ${styles.b}`} />
      <i className={`${styles.o} ${styles.c}`} />
      <i className={`${styles.o} ${styles.d}`} />
    </div>
  );
}
