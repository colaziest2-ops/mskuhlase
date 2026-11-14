import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { SECTIONS } from "../content";
import { subscribeScroll } from "../lib/scroll";
import { Clock } from "./Clock";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Nav.module.css";

interface NavProps {
  readonly active: number;
  readonly onGo: (index: number) => void;
  readonly reduced: boolean;
}

const tint = (i: number) => ({ "--lc": `var(--c-${SECTIONS[i]?.color ?? "amber"})` }) as CSSProperties;

/**
 * The top bar: brand, section links (each lit in its own colour), the Durban
 * clock, the theme toggle, and on phones a menu that unfolds beneath it. A
 * rainbow hairline along its edge fills as you scroll.
 */
export function Nav({ active, onGo, reduced }: NavProps) {
  const [open, setOpen] = useState(false);
  const progress = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLElement>(null);

  useEffect(
    () =>
      subscribeScroll((s) => {
        progress.current?.style.setProperty("--p", s.p.toFixed(4));
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (wrap.current && e.target instanceof Node && !wrap.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const go = (i: number) => {
    setOpen(false);
    onGo(i);
  };

  return (
    <header ref={wrap} className={styles.wrap} data-open={open}>
      <nav className={styles.bar} aria-label="Primary">
        <button type="button" className={styles.brand} onClick={() => go(0)} aria-label="Siyabonga Kuhlase — back to top">
          SK<i />
        </button>

        <ul className={styles.links}>
          {SECTIONS.map((s, i) =>
            i === 0 ? null : (
              <li key={s.id}>
                <button
                  type="button"
                  className={styles.link}
                  style={tint(i)}
                  data-active={i === active}
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => go(i)}
                >
                  {s.label}
                </button>
              </li>
            ),
          )}
        </ul>

        <div className={styles.tools}>
          <div className={styles.clock}>
            <Clock reduced={reduced} />
          </div>
          <ThemeToggle />
          <button
            type="button"
            className={styles.burger}
            aria-expanded={open}
            aria-controls="nav-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>

        <span ref={progress} className={styles.progress} aria-hidden="true" />
      </nav>

      <div id="nav-menu" className={styles.menu} data-open={open} inert={!open}>
        <ul>
          {SECTIONS.map((s, i) => (
            <li key={s.id} style={{ ...tint(i), "--n": i } as CSSProperties}>
              <button type="button" className={styles.item} data-active={i === active} onClick={() => go(i)}>
                <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.name}>{s.label}</span>
                <span className={styles.what}>{s.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
