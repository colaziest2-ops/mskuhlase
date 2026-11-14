import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * Shared scroll state. The Stage owns the scrolling surface and publishes into
 * this store; everything that reacts to scroll (progress bar, parallax, the
 * ticker bands, the colour orbs) subscribes — so nothing needs a document-wide
 * CSS variable that would invalidate the whole style tree on every scroll frame.
 */
export interface ScrollState {
  y: number;
  max: number;
  /** 0 → 1 through the whole page */
  p: number;
  /** px / second, smoothed */
  v: number;
  /** timestamp of the last scroll event */
  moved: number;
}

export const scrollState: ScrollState = { y: 0, max: 1, p: 0, v: 0, moved: 0 };

type Listener = (s: Readonly<ScrollState>) => void;
const listeners = new Set<Listener>();

export function subscribeScroll(fn: Listener): () => void {
  listeners.add(fn);
  fn(scrollState);
  return () => {
    listeners.delete(fn);
  };
}

export function publishScroll(y: number, max: number, now: number): void {
  const dt = Math.max(1, now - scrollState.moved);
  const instant = ((y - scrollState.y) / dt) * 1000;
  scrollState.v = scrollState.v * 0.7 + instant * 0.3;
  scrollState.y = y;
  scrollState.max = max;
  scrollState.p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
  scrollState.moved = now;
  listeners.forEach((fn) => fn(scrollState));
}

/** Velocity that has decayed since the last scroll event — so it falls to 0 when you stop. */
export function scrollVelocity(now: number): number {
  return scrollState.v * Math.exp(-(now - scrollState.moved) / 160);
}

export interface InViewOptions {
  readonly threshold?: number;
  readonly rootMargin?: string;
  /** Stay true once seen (default). */
  readonly once?: boolean;
}

/**
 * True once the element has scrolled into view. The page scrolls inside a fixed
 * container, but IntersectionObserver accounts for ancestor clipping, so the
 * default root works.
 */
export function useInView<T extends Element>(opts: InViewOptions = {}): [RefObject<T | null>, boolean] {
  const { threshold = 0.18, rootMargin = "0px 0px -8% 0px", once = true } = opts;
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setSeen(true);
          if (once) io.disconnect();
        } else if (!once) {
          setSeen(false);
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, seen];
}
