"use client";

/**
 * CustomCursor
 * ------------
 * A two-part cursor: a small solid dot that tracks the pointer 1:1, and a
 * larger ring that lags behind with spring physics + velocity-driven blur.
 * Grows over interactive elements ([data-cursor="hover"]).
 *
 * Renders nothing on touch / coarse-pointer devices (native touch stays).
 */

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setEnabled(fine);
    if (!fine) return;

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: pos.x, y: pos.y };
    let vx = 0;
    let vy = 0;
    let hovering = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      }
    };

    const onOver = (e: Event) => {
      const el = (e.target as HTMLElement).closest('[data-cursor="hover"]');
      hovering = !!el;
    };

    const loop = () => {
      // spring the ring toward the pointer
      const prevX = ring.x;
      const prevY = ring.y;
      ring.x += (pos.x - ring.x) * 0.18;
      ring.y += (pos.y - ring.y) * 0.18;
      vx = ring.x - prevX;
      vy = ring.y - prevY;

      const speed = Math.min(Math.hypot(vx, vy), 40);
      const scale = hovering ? 2.2 : 1 + speed * 0.012;
      const blur = speed * 0.15; // velocity blur

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%) scale(${scale})`;
        ringRef.current.style.filter = `blur(${blur}px)`;
        ringRef.current.style.opacity = hovering ? "1" : "0.6";
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 6,
          height: 6,
          borderRadius: "9999px",
          background: "var(--color-cyan)",
          pointerEvents: "none",
          zIndex: 9999,
          mixBlendMode: "screen",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 34,
          height: 34,
          borderRadius: "9999px",
          border: "1px solid var(--color-cyan)",
          pointerEvents: "none",
          zIndex: 9998,
          willChange: "transform, filter",
        }}
      />
    </>
  );
}
