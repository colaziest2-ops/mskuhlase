/**
 * Liquid theme pour.
 *
 * The new theme is poured over the old one from the toggle icon. It rides on
 * the View Transitions API: the browser snapshots the page before and after
 * the theme flips, and we reveal the "after" snapshot through a clip-path that
 * we rebuild every frame as an organic, wobbling, dripping blob that spreads
 * out from the icon (see the ::view-transition rules in app/globals.css).
 *
 * A canvas with its own view-transition-name is captured live alongside it and
 * draws the liquid's meniscus — a thin lit edge and a soft glow — so the
 * pour reads as a fluid, not as a mask.
 *
 * No View Transitions support, or reduced motion: the theme just switches.
 */

export type Theme = "dark" | "light";

export interface Origin {
  readonly x: number;
  readonly y: number;
}

const TAU = Math.PI * 2;
const POINTS = 360; // enough that the edge stays round even at full-screen radius
const DEFAULT_MS = 1700;
const RIM_NAME = "pour-rim";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

interface Drip {
  readonly angle: number; // mostly downward — it's poured, gravity wins
  readonly sigma: number;
  readonly length: number; // px beyond the main body
  readonly delay: number;
}

interface Pour {
  readonly phase: readonly [number, number, number];
  readonly drips: readonly Drip[];
}

function makePour(): Pour {
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const drips: Drip[] = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    drips.push({
      angle: Math.PI / 2 + ((i - (count - 1) / 2) / count) * 2.2 + rand(-0.12, 0.12),
      sigma: rand(0.035, 0.085),
      length: rand(0.14, 0.34) * window.innerHeight,
      delay: rand(0, 0.1), // they start running almost immediately
    });
  }
  return { phase: [rand(0, TAU), rand(0, TAU), rand(0, TAU)], drips };
}

/** Angle difference wrapped to [-π, π]. */
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** The liquid's outline at progress t (0→1), centred on `o`. */
function outline(t: number, o: Origin, reach: number, pour: Pour): [number, number][] {
  // Gathers at the icon and runs down first, then floods outward, then slows as it fills the page.
  const spread = 0.75 * smooth(0, 1, t) + 0.25 * (1 - Math.pow(1 - t, 2.4));
  const base = reach * 1.12 * spread;
  const life = Math.sin(Math.PI * t); // 0 → 1 → 0: the wobble and the gravity bias fade out so it ends as a clean cover
  const amp = 0.075 * Math.pow(life, 0.8);
  const [p1, p2, p3] = pour.phase;

  const pts: [number, number][] = [];
  for (let i = 0; i < POINTS; i++) {
    const a = (i / POINTS) * TAU;
    const wobble =
      1 +
      amp *
        (0.5 * Math.sin(5 * a + 7 * t + p1) +
          0.32 * Math.sin(8 * a - 9 * t + p2) +
          0.18 * Math.sin(13 * a + 13 * t + p3));
    const gravity = 1 + 0.3 * Math.pow(Math.max(0, Math.sin(a)), 1.6) * life;

    let drip = 0;
    for (const d of pour.drips) {
      const k = wrap(a - d.angle) / d.sigma;
      drip += d.length * smooth(d.delay, d.delay + 0.5, t) * Math.exp(-k * k);
    }

    const r = Math.max(0, base * wobble * gravity + drip);
    pts.push([o.x + r * Math.cos(a), o.y + r * Math.sin(a)]);
  }
  return pts;
}

const toPolygon = (pts: readonly [number, number][]) =>
  `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;

function makeRim(): HTMLCanvasElement {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const c = document.createElement("canvas");
  c.width = Math.round(window.innerWidth * dpr);
  c.height = Math.round(window.innerHeight * dpr);
  c.setAttribute("aria-hidden", "true");
  c.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none;view-transition-name:${RIM_NAME};`;
  return c;
}

function drawRim(canvas: HTMLCanvasElement, pts: readonly [number, number][], theme: Theme, t: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = canvas.width / window.innerWidth;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const path = new Path2D();
  pts.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
  path.closePath();

  // Dark liquid: a cool highlight on its lip. Light liquid: a soft shadow line.
  const edge = theme === "dark" ? "rgba(255,255,255,0.22)" : "rgba(30,24,14,0.2)";
  const glow = theme === "dark" ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.55)";
  const fade = 1 - smooth(0.82, 1, t); // the rim melts away as the page fills

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.lineJoin = "round";
  ctx.shadowColor = glow;
  ctx.shadowBlur = 26;
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge;
  ctx.stroke(path);
  ctx.restore();
}

declare global {
  interface Window {
    /** Test hook: stretches the pour so it can be inspected frame by frame. */
    __POUR_MS__?: number;
  }
}

/**
 * Runs `apply` (which must flip the theme synchronously) under a liquid pour
 * originating at `origin`. Resolves when the pour has finished.
 */
export function transitionTheme(origin: Origin, theme: Theme, apply: () => void): Promise<void> {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof document.startViewTransition !== "function" || reduced) {
    apply();
    return Promise.resolve();
  }

  const ms = window.__POUR_MS__ ?? DEFAULT_MS;
  const reach = Math.max(
    Math.hypot(origin.x, origin.y),
    Math.hypot(window.innerWidth - origin.x, origin.y),
    Math.hypot(origin.x, window.innerHeight - origin.y),
    Math.hypot(window.innerWidth - origin.x, window.innerHeight - origin.y),
  );
  const pour = makePour();
  const rim = makeRim();

  root.style.setProperty("--pour-ms", `${ms}ms`);
  root.style.setProperty("--liquid-clip", `circle(0px at ${origin.x}px ${origin.y}px)`);
  root.classList.add("theme-pour");
  document.body.appendChild(rim); // must exist before the snapshot so it's captured in both states

  let raf = 0;
  const cleanup = () => {
    cancelAnimationFrame(raf);
    root.classList.remove("theme-pour");
    root.style.removeProperty("--liquid-clip");
    root.style.removeProperty("--pour-ms");
    rim.remove();
  };

  const transition = document.startViewTransition(apply);

  transition.ready
    .then(() => {
      const t0 = performance.now();
      const frame = (now: number) => {
        const t = clamp((now - t0) / ms, 0, 1);
        const pts = outline(t, origin, reach, pour);
        root.style.setProperty("--liquid-clip", toPolygon(pts));
        drawRim(rim, pts, theme, t);
        if (t < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    })
    .catch(() => {
      /* transition was skipped (tab hidden, etc.) — `finished` still resolves and cleans up */
    });

  return transition.finished.then(cleanup, cleanup);
}
