import { useEffect, useRef } from "react";
import styles from "./Cursor.module.css";

/**
 * A soft ring that trails the pointer. Over interactive paper surfaces it
 * shrinks and warms. It sits beside the native cursor, never replaces it, and
 * only exists on fine-pointer devices. The loop runs only while it's catching up.
 */
export function Cursor({ reduced }: { reduced: boolean }) {
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const el = ring.current;
    if (!el) return;

    const pointer = { x: -100, y: -100 };
    const at = { x: -100, y: -100 };
    let warm = 0;
    let warmTarget = 0;
    let raf = 0;
    let visible = false;
    const follow = reduced ? 1 : 0.22;

    const paint = () => {
      el.style.transform = `translate3d(${at.x}px, ${at.y}px, 0) translate(-50%, -50%) scale(${(1 - 0.42 * warm).toFixed(3)})`;
      el.style.setProperty("--warm", warm.toFixed(3));
    };

    const loop = () => {
      at.x += (pointer.x - at.x) * follow;
      at.y += (pointer.y - at.y) * follow;
      warm += (warmTarget - warm) * 0.2;
      paint();
      const settled =
        Math.abs(pointer.x - at.x) < 0.1 && Math.abs(pointer.y - at.y) < 0.1 && Math.abs(warmTarget - warm) < 0.01;
      raf = settled ? 0 : requestAnimationFrame(loop);
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!visible) {
        visible = true;
        at.x = pointer.x;
        at.y = pointer.y;
        el.style.opacity = "1";
      }
      const t = e.target;
      warmTarget =
        t instanceof Element && t.closest("[data-paper], a, button, input, textarea, [role='button']") ? 1 : 0;
      kick();
    };

    const onLeave = () => {
      visible = false;
      el.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return <div ref={ring} className={styles.ring} aria-hidden="true" />;
}
