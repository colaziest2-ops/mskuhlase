"use client";

/**
 * SmoothScroll
 * ------------
 * Lenis momentum scrolling on its own rAF loop, plus eased in-page anchor
 * jumps. Skipped entirely for prefers-reduced-motion, where native scrolling
 * and anchors take over.
 */

import { useEffect } from "react";
import Lenis from "lenis";
import { registerLenis } from "@/lib/ui";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    registerLenis(lenis);

    let raf = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    });

    // Ease to #anchors instead of jumping.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const link = (e.target as HTMLElement).closest?.('a[href^="#"]');
      const hash = link?.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(hash === "#home" ? 0 : target, { offset: -72 });
      history.replaceState(null, "", hash);
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
      registerLenis(null);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
