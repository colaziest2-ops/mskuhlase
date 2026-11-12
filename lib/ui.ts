"use client";

/**
 * Small shared client helpers: the card spotlight tracker, clipboard copy,
 * a live clock, and scroll locking that cooperates with Lenis.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type Lenis from "lenis";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Writes the pointer position into --mx/--my so `.card` can light itself
 * with pure CSS — no React re-render per mouse move. */
export function trackSpotlight(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/** Copy-to-clipboard with a self-resetting "copied" flag. */
export function useCopy(resetMs = 1800) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Older browsers / non-secure contexts
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetMs);
    },
    [resetMs]
  );

  return [copied, copy] as const;
}

/** HH:MM in the given IANA timezone; placeholder until mounted (no hydration mismatch). */
export function useClock(timeZone: string, withSeconds = false) {
  const [time, setTime] = useState(withSeconds ? "--:--:--" : "--:--");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      ...(withSeconds ? { second: "2-digit" } : {}),
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeZone, withSeconds]);
  return time;
}

/* ---- Scroll lock --------------------------------------------------------- */
let lenis: Lenis | null = null;

export function registerLenis(instance: Lenis | null) {
  lenis = instance;
}

/** Freeze page scroll while a drawer is open. */
export function lockScroll() {
  if (lenis) lenis.stop();
  else document.documentElement.style.overflow = "hidden";
}

export function unlockScroll() {
  if (lenis) lenis.start();
  else document.documentElement.style.overflow = "";
}
