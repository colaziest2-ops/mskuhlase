import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { PROJECTS } from "../content";
import { WorkStack } from "./WorkStack";
import styles from "./WorkGate.module.css";

const OPEN_MS = 520;

/**
 * The Work section opens like a desktop: a closed "projects" window with the seven
 * platforms as icons and one clear button. Pressing it opens the window (it swells and
 * dissolves, the icons are pulled into the middle), and the interactive card stack
 * is dealt out where it was. After that it stays open.
 */
export function WorkGate({ active, reduced }: { readonly active: boolean; readonly reduced: boolean }) {
  const [phase, setPhase] = useState<"closed" | "opening" | "open">(reduced ? "open" : "closed");
  const timer = useRef(0);

  const open = useCallback(() => {
    if (phase !== "closed") return;
    if (reduced) {
      setPhase("open");
      return;
    }
    setPhase("opening");
    timer.current = window.setTimeout(() => setPhase("open"), OPEN_MS);
  }, [phase, reduced]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // `E` (relayed from App) opens the window too, so the keyboard shortcut still means "show me the work".
  useEffect(() => {
    if (!active || phase !== "closed") return;
    const onExpand = () => open();
    window.addEventListener("study:expand", onExpand);
    return () => window.removeEventListener("study:expand", onExpand);
  }, [active, phase, open]);

  if (phase === "open") return <WorkStack active={active} reduced={reduced} />;

  return (
    <div className={styles.gate} data-phase={phase}>
      <div className={styles.window} role="group" aria-label="Projects">
        <div className={styles.titlebar}>
          <span className={styles.lights} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className={styles.wtitle}>Projects · {PROJECTS.length} items</span>
          <span className={styles.live}>
            <i /> all live
          </span>
        </div>

        <ul className={styles.icons}>
          {PROJECTS.map((p, i) => (
            <li key={p.id} style={{ "--ac": p.ac, "--i": i } as CSSProperties}>
              <span className={styles.icon} aria-hidden="true">
                {p.name.charAt(0)}
              </span>
              <span className={styles.iname}>{p.name}</span>
            </li>
          ))}
        </ul>

        <div className={styles.foot}>
          <button type="button" className={styles.open} onClick={open} disabled={phase !== "closed"}>
            <span>Open the projects</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <p className={styles.hint}>Seven live platforms. Pull them forward, peel them, open them.</p>
        </div>
      </div>
    </div>
  );
}
