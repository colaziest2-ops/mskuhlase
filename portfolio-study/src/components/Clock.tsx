import { useEffect, useState } from "react";
import { sastParts, untilNextSecond, type ClockParts } from "../lib/time";
import styles from "./Clock.module.css";

/** Durban time, top-right. The seconds flicker briefly on every tick, like a relay. */
export function Clock({ reduced }: { reduced: boolean }) {
  const [t, setT] = useState<ClockParts>(() => sastParts());

  useEffect(() => {
    let id = 0;
    const tick = () => {
      setT(sastParts());
      id = window.setTimeout(tick, untilNextSecond());
    };
    id = window.setTimeout(tick, untilNextSecond());
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className={styles.clock} role="timer" aria-label={`Durban time ${t.h}:${t.m}`}>
      <span className={styles.zone}>DURBAN · SAST</span>
      <span className={styles.time} aria-hidden="true">
        {t.h}
        <i>:</i>
        {t.m}
        <i>:</i>
        {/* keyed on the second so the flicker animation restarts every tick */}
        <b key={t.s} className={reduced ? undefined : styles.tick}>
          {t.s}
        </b>
      </span>
    </div>
  );
}
