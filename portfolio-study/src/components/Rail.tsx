import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { SECTIONS } from "../content";
import { PARAMS } from "../lib/params";
import styles from "./Rail.module.css";

interface RailProps {
  readonly active: number;
  readonly onGo: (index: number) => void;
  readonly reduced: boolean;
}

const DECAY_S = 1.2;

/**
 * The instrument rail. Hovering a marker lifts a line and previews the
 * section in the readout; the active marker carries "residual heat" that
 * fades over 1.2 s after you leave it (0.25 s under reduced motion).
 */
export function Rail({ active, onGo, reduced }: RailProps) {
  const [hover, setHover] = useState<number | null>(null);
  const marks = useRef<(HTMLButtonElement | null)[]>([]);
  const heat = useRef<number[]>(SECTIONS.map((_s, i) => (i === 0 ? 1 : 0)));

  useEffect(() => {
    const decay = reduced ? 0.25 : DECAY_S;
    let id = 0;
    let prev = performance.now();

    const frame = (t: number) => {
      const dt = (t - prev) / 1000 / PARAMS.z;
      prev = t;
      let moving = false;
      heat.current = heat.current.map((h, i) => {
        if (i === active) return 1;
        const next = Math.max(0, h - dt / decay);
        if (next > 0) moving = true;
        return next;
      });
      heat.current.forEach((h, i) => marks.current[i]?.style.setProperty("--level", h.toFixed(3)));
      id = moving ? requestAnimationFrame(frame) : 0;
    };

    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [active, reduced]);

  const shown = hover ?? active;
  const section = SECTIONS[shown];

  return (
    <nav className={styles.rail} aria-label="Sections">
      <p className={styles.readout} aria-hidden="true">
        <span>{String(shown + 1).padStart(2, "0")}</span>
        {section?.title}
      </p>
      <ul className={styles.marks}>
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <button
              ref={(el) => {
                marks.current[i] = el;
              }}
              type="button"
              className={styles.mark}
              style={{ "--mc": `var(--c-${s.color})` } as CSSProperties}
              aria-current={i === active ? "true" : undefined}
              aria-label={`${s.label} — ${s.title}`}
              onClick={() => onGo(i)}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover((h) => (h === i ? null : h))}
              onFocus={() => setHover(i)}
              onBlur={() => setHover((h) => (h === i ? null : h))}
            >
              <span className={styles.label}>{s.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
