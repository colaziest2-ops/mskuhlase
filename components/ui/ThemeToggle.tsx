"use client";

/**
 * ThemeToggle
 * -----------
 * Switches the whole site between the default dark "Signal Room" theme and a
 * light variant, by setting `data-theme="light"` on <html> — every color
 * token in globals.css is redefined under that selector, so this one
 * attribute flip re-themes the entire site with no per-component changes.
 *
 * The flip is not instant: the new theme is poured over the old one from this
 * button as a liquid (see lib/liquid.ts). Choice persists in localStorage.
 */

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Sun, Moon } from "lucide-react";
import { transitionTheme, type Theme } from "@/lib/liquid";

const STORAGE_KEY = "theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pouring = useRef(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage blocked — default theme */
    }
    const initial: Theme = saved === "light" ? "light" : "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  const toggle = async () => {
    if (pouring.current) return; // one pour at a time
    const next: Theme = theme === "dark" ? "light" : "dark";

    const rect = button.current?.getBoundingClientRect();
    const origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth - 40, y: 40 };

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage blocked — the toggle still works for this visit */
    }

    pouring.current = true;
    try {
      await transitionTheme(origin, next, () => {
        // Must land synchronously: the browser snapshots the "after" state right after this returns.
        flushSync(() => setTheme(next));
        document.documentElement.setAttribute("data-theme", next);
      });
    } finally {
      pouring.current = false;
    }
  };

  // Avoid a flash of the wrong icon before we've read localStorage.
  if (!mounted) {
    return <div className="h-11 w-11" aria-hidden />;
  }

  return (
    <button
      ref={button}
      onClick={() => void toggle()}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:text-accent"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
