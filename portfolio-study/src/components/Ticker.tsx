import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { ColorName } from "../content";
import { scrollVelocity } from "../lib/scroll";
import styles from "./Ticker.module.css";

export interface TickerItem {
  readonly label: string;
  readonly color: ColorName;
}

interface TickerProps {
  readonly items: readonly TickerItem[];
  /** 1 = drifts left, -1 = drifts right */
  readonly dir?: 1 | -1;
  /** px / second at rest */
  readonly speed?: number;
  readonly reduced: boolean;
}

/**
 * A band of words that drifts sideways. Scrolling speeds it up, and scrolling
 * back up reverses it — so the page physically pushes on it.
 */
export function Ticker({ items, dir = 1, speed = 44, reduced }: TickerProps) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || reduced) return;

    let raf = 0;
    let x = 0;
    let heading: number = dir;
    let half = el.scrollWidth / 2;
    let prev = performance.now();

    const ro = new ResizeObserver(() => {
      half = el.scrollWidth / 2;
    });
    ro.observe(el);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const v = scrollVelocity(now);

      // Scrolling up flips the band; it eases through zero rather than snapping.
      const wanted = v < -90 ? -dir : dir;
      heading += (wanted - heading) * Math.min(1, dt * 5);

      x -= heading * (speed + Math.abs(v) * 0.5) * dt;
      if (half > 0) {
        if (x <= -half) x += half;
        if (x > 0) x -= half;
      }
      el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [dir, speed, reduced]);

  const run = (copy: number) =>
    items.map((it, i) => (
      <span
        key={`${copy}-${i}`}
        className={styles.item}
        style={{ "--c": `var(--c-${it.color})` } as CSSProperties}
        aria-hidden={copy > 0}
      >
        <i className={styles.star} />
        {it.label}
      </span>
    ));

  return (
    <div ref={track} className={styles.track}>
      {run(0)}
      {run(1)}
    </div>
  );
}
