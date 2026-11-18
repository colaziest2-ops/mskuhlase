import { useEffect, useRef } from "react";
import { subscribeScroll } from "../lib/scroll";
import { Clock } from "./Clock";
import { AquariumToggle } from "./AquariumToggle";
import styles from "./Nav.module.css";

interface NavProps {
  readonly onGo: (index: number) => void;
  readonly reduced: boolean;
  /** Phones have no `C` key and no room for the floating button, so the crumple sits up here. */
  readonly onCrumple?: () => void;
}

/**
 * The top bar: brand, the Durban clock pill with the theme toggle, and (on
 * phones) the crumple button. Section navigation lives in the Flow Tab Bar at
 * the bottom. A rainbow hairline along the bar's edge fills as you scroll.
 */
export function Nav({ onGo, reduced, onCrumple }: NavProps) {
  const progress = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      subscribeScroll((s) => {
        progress.current?.style.setProperty("--p", s.p.toFixed(4));
      }),
    [],
  );

  return (
    <header className={styles.wrap}>
      <div className={styles.bar}>
        <button type="button" className={styles.brand} onClick={() => onGo(0)} aria-label="Siyabonga Kuhlase — back to top">
          SK<i />
        </button>

        <div className={styles.tools}>
          <div className={styles.pill}>
            <div className={styles.clock}>
              <Clock reduced={reduced} />
            </div>
            <AquariumToggle />
          </div>
          {onCrumple && (
            <button type="button" className={styles.crumple} onClick={onCrumple} aria-label="Crumple the page" title="Crumple the page">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M2 11 5.5 4 8 10 10.5 3 14 12" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <span ref={progress} className={styles.progress} aria-hidden="true" />
      </div>
    </header>
  );
}
