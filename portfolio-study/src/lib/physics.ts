/**
 * Hand-rolled motion: velocity + damping springs, a keyed bag of them with
 * delayed targets (for cascades), and the custom scroller.
 *
 * Damping ratio ζ = c / (2√k). ζ≈0.78 overshoots ~2% before settling,
 * ζ=1 glides with no overshoot, ζ≈0.63 is loose and playful.
 */

export interface SpringConfig {
  readonly k: number;
  readonly c: number;
}

export const SETTLE: SpringConfig = { k: 140, c: 18.5 }; // ζ≈0.78 — jumps: soft overshoot, soft settle
export const CARD: SpringConfig = { k: 190, c: 22 }; // ζ≈0.80 — paper has mass and friction
export const LOOSE: SpringConfig = { k: 90, c: 12 }; // ζ≈0.63
export const GLIDE: SpringConfig = { k: 120, c: 22 }; // ζ≈1.0 — wheel inertia, no overshoot

const EPS = 0.01;

export class Spring {
  x: number;
  v = 0;
  target: number;
  cfg: SpringConfig;
  /** Rest threshold, in the spring's own units (px, deg, 0–1). */
  eps = EPS;

  constructor(x: number, cfg: SpringConfig) {
    this.x = x;
    this.target = x;
    this.cfg = cfg;
  }

  step(dt: number): void {
    const n = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -this.cfg.k * (this.x - this.target) - this.cfg.c * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
  }

  get moving(): boolean {
    return Math.abs(this.v) > this.eps || Math.abs(this.x - this.target) > this.eps;
  }

  snap(): void {
    this.x = this.target;
    this.v = 0;
  }
}

interface Pending<K extends string> {
  readonly key: K;
  readonly at: number;
  readonly value: number;
}

/** A set of named springs that share one config. `instant` collapses motion to a jump. */
export class SpringBag<K extends string> {
  private readonly springs: Record<K, Spring>;
  private pending: Pending<K>[] = [];
  instant = false;

  constructor(init: Record<K, number>, cfg: SpringConfig) {
    const springs = {} as Record<K, Spring>;
    for (const key of Object.keys(init) as K[]) springs[key] = new Spring(init[key], cfg);
    this.springs = springs;
  }

  get(key: K): number {
    return this.springs[key].x;
  }

  /** Aim a spring at `value`, optionally after `delayMs` (cascades). */
  set(key: K, value: number, delayMs = 0, now: number = performance.now()): void {
    this.pending = this.pending.filter((p) => p.key !== key);
    const s = this.springs[key];
    if (this.instant) {
      s.target = value;
      s.snap();
      return;
    }
    if (delayMs > 0) {
      this.pending.push({ key, at: now + delayMs, value });
      return;
    }
    s.target = value;
  }

  /** Teleport — used for first layout, never for user-visible motion. */
  jump(key: K, value: number): void {
    this.pending = this.pending.filter((p) => p.key !== key);
    const s = this.springs[key];
    s.target = value;
    s.snap();
  }

  /** Advance by dt seconds. Returns true while anything is still moving or waiting. */
  step(dt: number, now: number): boolean {
    if (this.pending.length) {
      const due = this.pending.filter((p) => p.at <= now);
      if (due.length) {
        this.pending = this.pending.filter((p) => p.at > now);
        for (const p of due) this.springs[p.key].target = p.value;
      }
    }
    let moving = this.pending.length > 0;
    for (const key of Object.keys(this.springs) as K[]) {
      const s = this.springs[key];
      if (!s.moving) continue;
      s.step(dt);
      if (s.moving) moving = true;
      else s.snap();
    }
    return moving;
  }
}

/* ---------------------------------------------------------------------------
   Scroller
   Native scrolling stays in charge (touch, trackpads, keyboard, find-in-page).
   Two things are layered on top:
   - jumps (rail, arrow keys) run on an underdamped spring: they overshoot a
     hair and settle;
   - notched mouse-wheel input is smoothed with a critically-damped glide.
   Trackpad / touch input is left alone — those already carry real inertia.
   ------------------------------------------------------------------------ */

export interface ScrollerOptions {
  readonly isReduced: () => boolean;
  readonly z: number;
}

export interface Scroller {
  to(y: number): void;
  destroy(): void;
}

/** True if something under the pointer can still scroll in this direction. */
function innerCanScroll(target: EventTarget | null, root: HTMLElement, dy: number): boolean {
  let n: Element | null = target instanceof Element ? target : null;
  while (n && n !== root) {
    if (n instanceof HTMLElement && n.dataset.scrollInner !== undefined && n.scrollHeight > n.clientHeight) {
      const canDown = n.scrollTop + n.clientHeight < n.scrollHeight - 1;
      const canUp = n.scrollTop > 0;
      if (dy > 0 ? canDown : canUp) return true;
    }
    n = n.parentElement;
  }
  return false;
}

export function createScroller(el: HTMLElement, opts: ScrollerOptions): Scroller {
  const spring = new Spring(el.scrollTop, SETTLE);
  spring.eps = 0.4; // scrolling can't show less than a pixel — don't ring on for a second after it looks done
  let raf = 0;
  let last = 0;
  let driving = false;

  const max = () => Math.max(0, el.scrollHeight - el.clientHeight);
  const clamp = (y: number) => Math.min(max(), Math.max(0, y));

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    driving = false;
  };

  const frame = (t: number) => {
    const dt = Math.min(0.034, (t - last) / 1000) / opts.z;
    last = t;
    spring.step(dt);
    el.scrollTop = spring.x;
    if (spring.moving) {
      raf = requestAnimationFrame(frame);
    } else {
      el.scrollTop = spring.target;
      raf = 0;
      driving = false;
    }
  };

  const start = () => {
    if (raf) return;
    driving = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const adopt = () => {
    spring.x = el.scrollTop;
    spring.v = 0;
    spring.target = spring.x;
  };

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || opts.isReduced()) return; // pinch-zoom / reduced motion: native
    const notched =
      e.deltaMode === 1 ||
      (e.deltaMode === 0 && e.deltaX === 0 && Math.abs(e.deltaY) >= 100 && Math.abs(e.deltaY) % 100 === 0);
    if (!notched) {
      if (driving) stop(); // a trackpad took over — don't fight it
      return;
    }
    if (innerCanScroll(e.target, el, e.deltaY)) return;
    e.preventDefault();
    if (!driving) adopt();
    spring.cfg = GLIDE;
    spring.target = clamp(spring.target + e.deltaY * (e.deltaMode === 1 ? 40 : 1));
    start();
  };

  const onScroll = () => {
    if (!driving) adopt();
  };

  const onTouch = () => stop();

  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("scroll", onScroll, { passive: true });
  el.addEventListener("touchstart", onTouch, { passive: true });

  return {
    to(y: number) {
      const target = clamp(y);
      if (opts.isReduced()) {
        stop();
        el.scrollTop = target;
        adopt();
        return;
      }
      if (!driving) adopt();
      spring.cfg = SETTLE;
      spring.target = target;
      start();
    },
    destroy() {
      stop();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("touchstart", onTouch);
    },
  };
}
