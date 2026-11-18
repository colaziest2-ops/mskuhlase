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

/** lucide icons (ISC), stroke-drawn; keyed by section id. The readout names the section on hover. */
const ICONS: Readonly<Record<string, readonly string[]>> = {
  home: ["M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  work: ["M3 7h18v13H3z", "M8 7V4h8v3", "M3 13h18"],
  stack: ["m12 3 9 5-9 5-9-5z", "m3 12.5 9 5 9-5", "m3 17 9 5 9-5"],
  play: ["M6 3.5v17L20 12z"],
  contact: ["M3 5h18v14H3z", "m3 6 9 7 9-7"],
};

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
      {/* keyed on the section so the distortion replays each time the readout changes */}
      <p
        key={shown}
        className={styles.readout}
        style={{ "--mc": `var(--c-${section?.color ?? "amber"})` } as CSSProperties}
        aria-hidden="true"
      >
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
              <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
                {(ICONS[s.id] ?? ICONS.home)?.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
