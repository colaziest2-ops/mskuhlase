import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { transitionTheme, type Theme } from "../lib/liquid";
import styles from "./ThemeToggle.module.css";

const KEY = "study.theme";

/**
 * Dark / light, poured over the page as a liquid from this button (lib/liquid.ts).
 * `T` triggers it from the keyboard. The saved choice is applied before first
 * paint by the inline script in index.html, so there's no flash.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );
  const button = useRef<HTMLButtonElement>(null);
  const pouring = useRef(false);

  const toggle = useCallback(async () => {
    if (pouring.current) return; // one pour at a time
    const next: Theme = theme === "dark" ? "light" : "dark";

    const r = button.current?.getBoundingClientRect();
    const origin = r
      ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      : { x: window.innerWidth - 40, y: 40 };

    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked — works for this visit only */
    }

    pouring.current = true;
    try {
      await transitionTheme(origin, next, () => {
        // Lands synchronously: the browser snapshots the "after" state as soon as this returns.
        flushSync(() => setTheme(next));
        document.documentElement.dataset.theme = next;
        document
          .querySelector('meta[name="theme-color"]')
          ?.setAttribute("content", next === "light" ? "#efeadf" : "#0a0908");
      });
    } finally {
      pouring.current = false;
    }
  }, [theme]);

  useEffect(() => {
    const onKey = () => void toggle();
    window.addEventListener("study:theme", onKey);
    return () => window.removeEventListener("study:theme", onKey);
  }, [toggle]);

  return (
    <button
      ref={button}
      type="button"
      className={styles.toggle}
      data-theme-now={theme}
      onClick={() => void toggle()}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title="Theme (T)"
    >
      <svg className={styles.sun} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
      </svg>
      <svg className={styles.moon} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z" />
      </svg>
    </button>
  );
}
