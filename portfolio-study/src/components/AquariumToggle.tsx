import { useEffect, useRef } from "react";
import { createEngine, type Parts } from "../lib/aquarium/engine";
import { SWITCH_LABEL } from "../lib/aquarium/content";
import { transitionTheme, type Theme } from "../lib/liquid";
import styles from "./AquariumToggle.module.css";

const KEY = "study.theme";

/**
 * The site's theme switch: a glass pill holding a tiny pixel aquarium (lib/aquarium, ported from the reference).
 * Click or drag the bubble: by day the lamp is on, at night the moon LEDs come on, the snail comes out and the
 * plankton glows. Each committed switch changes the site's theme, poured over the page from the bubble
 * (lib/liquid). `T` toggles it from the keyboard.
 */
export function AquariumToggle() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const hit = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const tank = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const cursor = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const [cv, ht, st, tk, wr, cu] = [canvas.current, hit.current, status.current, tank.current, wrap.current, cursor.current];
    if (!cv || !ht || !st || !tk || !wr || !cu) return;
    const parts: Parts = { canvas: cv, hit: ht, status: st, tank: tk, wrap: wr, cursor: cu };
    const root = document.documentElement;

    // theme changes are poured one at a time; a switch made mid-pour waits, and only the latest wish counts
    let current: Theme = root.dataset.theme === "light" ? "light" : "dark";
    let want: Theme = current;
    let pouring = false;
    const pour = async () => {
      if (pouring) return;
      pouring = true;
      try {
        while (current !== want) {
          const next = want;
          try {
            localStorage.setItem(KEY, next);
          } catch {
            /* storage blocked: this visit only */
          }
          await transitionTheme(engine.bubbleCenter(), next, () => {
            root.dataset.theme = next;
            document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#efeadf" : "#0a0908");
          });
          current = next;
        }
      } finally {
        pouring = false;
      }
    };

    const engine = createEngine(parts, {
      demo: false,
      startNight: current === "dark",
      onCommit: (lightOn) => {
        want = lightOn ? "light" : "dark";
        void pour();
      },
    });
    engine.start();

    // the nav changes width at the phone breakpoint: lay the pill out again when its column does
    const ro = new ResizeObserver(() => engine.layout());
    ro.observe(wr);
    const onKey = () => engine.toggle();
    window.addEventListener("study:theme", onKey);

    return () => {
      ro.disconnect();
      window.removeEventListener("study:theme", onKey);
      engine.dispose();
    };
  }, []);

  return (
    <div ref={wrap} className={styles.wrap}>
      <div ref={tank} className={styles.tank}>
        <canvas ref={canvas} aria-hidden="true" />
        <button
          ref={hit}
          className={styles.hit}
          type="button"
          role="switch"
          aria-checked="false"
          aria-label={SWITCH_LABEL}
          title="Theme (T): click or drag the bubble"
        />
        <span ref={status} className={styles.vh} role="status" aria-live="polite" />
      </div>
      {/* the reference's demo pointer; the demo is off here, so it never shows */}
      <svg ref={cursor} className={styles.cursor} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 2 L3 19.2 L7.4 15 L10.5 21.8 L13.6 20.4 L10.6 13.8 L16.9 13.6 Z" fill="#15161a" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
