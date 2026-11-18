import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { SECTIONS, type ColorName } from "../content";
import { FlowEngine } from "../lib/flow/engine";
import { STAGE_W } from "../lib/flow/timeline";
import { PARAMS } from "../lib/params";
import styles from "./FlowTabBar.module.css";

/** The bar is dark glass in both themes, so the bead always uses the bright palette. */
const HEX: Readonly<Record<ColorName, string>> = {
  amber: "#f0a45d",
  teal: "#4fd6c1",
  sky: "#6aa9ff",
  violet: "#a98bff",
  rose: "#ff7a9c",
  lime: "#b6e35a",
};

const rgb = (hex: string): [number, number, number] => {
  const v = parseInt(hex.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

/** lucide-style icons (ISC), stroke-drawn so they can be erased and redrawn. */
const ICONS: Readonly<Record<string, readonly string[]>> = {
  home: ["M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  work: ["M3 7h18v13H3z", "M8 7V4h8v3", "M3 13h18"],
  stack: ["m12 3 9 5-9 5-9-5z", "m3 12.5 9 5 9-5", "m3 17 9 5 9-5"],
  play: ["M4 5h16v14H4z", "m8 10 3 2-3 2", "M13 15h3"],
  contact: ["M3 5h18v14H3z", "m3 6 9 7 9-7"],
};

const fitScale = () => Math.min(1.08, Math.max(0.8, (window.innerWidth - 20) / STAGE_W));

interface FlowTabBarProps {
  readonly active: number;
  readonly onGo: (i: number) => void;
  readonly reduced: boolean;
}

/**
 * The site's navigation: a dark glass bar whose active tab is a bead of liquid
 * glass. On a move the bead sinks, runs under the glass as a stretched wave,
 * and resurfaces on the new tab with a damped bounce, a ripple and a sweep of
 * light. The glass is one WebGL2 shader (lib/flow); the icons and labels are
 * real buttons laid over it, driven by the same per-frame state.
 */
export function FlowTabBar({ active, onGo, reduced }: FlowTabBarProps) {
  const wrap = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tabs = useRef<(HTMLLIElement | null)[]>([]);
  const engine = useRef<FlowEngine | null>(null);
  const activeRef = useRef(active);
  /** set on click: ignore the sections the page scrolls past on its way there */
  const pinned = useRef<number | null>(null);
  const pinTimer = useRef(0);

  useEffect(() => {
    const c = canvas.current;
    const w = wrap.current;
    if (!c || !w) return;

    const e = new FlowEngine(c, {
      tabs: SECTIONS.length,
      colors: SECTIONS.map((s) => rgb(HEX[s.color])),
      reduced,
      z: PARAMS.z,
      onFrame: (s) => {
        for (let i = 0; i < s.act.length; i++) {
          const el = tabs.current[i];
          if (!el) continue;
          el.style.setProperty("--a", (s.act[i] ?? 0).toFixed(3));
          el.style.setProperty("--e", (s.erase[i] ?? 0).toFixed(3));
        }
        // the CSS bead (used only without WebGL2) follows the same numbers
        w.style.setProperty("--bx", `${s.bx.toFixed(2)}px`);
        w.style.setProperty("--by", `${s.by.toFixed(2)}px`);
        w.style.setProperty("--hw", `${s.hw.toFixed(2)}px`);
        w.style.setProperty("--hh", `${s.hh.toFixed(2)}px`);
        w.style.setProperty("--depth", s.depth.toFixed(3));
        w.dataset.gl = engine.current?.glOk === false ? "off" : "on";
      },
    });
    engine.current = e;
    w.dataset.gl = e.glOk ? "on" : "off";

    const fit = () => {
      const s = fitScale();
      w.style.setProperty("--s", s.toFixed(4));
      e.resize(s);
    };
    fit();
    window.addEventListener("resize", fit);

    e.jump(activeRef.current);
    if (activeRef.current === 0) e.playDemo();

    return () => {
      window.removeEventListener("resize", fit);
      e.destroy();
      engine.current = null;
    };
  }, [reduced]);

  // follow the page: the section in view is the tab the bead heads for
  useEffect(() => {
    activeRef.current = active;
    const e = engine.current;
    if (!e) return;
    if (pinned.current !== null) {
      if (active !== pinned.current) return; // still scrolling past other sections
      pinned.current = null;
      window.clearTimeout(pinTimer.current);
      return;
    }
    if (e.demoRunning && active === 0) return; // still at the top: let the demo finish
    e.go(active);
  }, [active]);

  useEffect(() => () => window.clearTimeout(pinTimer.current), []);

  const choose = (i: number) => {
    const e = engine.current;
    if (i !== activeRef.current) {
      pinned.current = i;
      window.clearTimeout(pinTimer.current);
      // if the scroll gets interrupted, stop waiting for it
      pinTimer.current = window.setTimeout(() => {
        pinned.current = null;
        engine.current?.go(activeRef.current);
      }, 2600 * PARAMS.z);
    }
    e?.go(i);
    onGo(i);
  };

  return (
    <nav ref={wrap} className={styles.wrap} aria-label="Sections" onPointerDown={() => engine.current?.stopDemo()}>
      <div className={styles.stage}>
        <span className={styles.blur} aria-hidden="true" />
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <span className={styles.cssBead} aria-hidden="true" />
        <ul className={styles.tabs}>
          {SECTIONS.map((s, i) => (
            <li
              key={s.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              style={{ "--tc": HEX[s.color] } as CSSProperties}
            >
              <button
                type="button"
                className={styles.tab}
                aria-current={i === active ? "page" : undefined}
                onClick={() => choose(i)}
                onFocus={() => engine.current?.stopDemo()}
                title={s.title}
              >
                <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
                  {(ICONS[s.id] ?? ICONS.home ?? []).map((d) => (
                    <path key={d} d={d} pathLength={1} />
                  ))}
                </svg>
                <span className={styles.label}>{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
