import { between, rngFor, type Rng } from "./rng";

/**
 * The crumple. The whole stage is folded for ~1.05 s and settles flat again.
 *
 * Two layers, both lightweight (no WebGL, no DOM rasterising):
 *  1. an SVG feDisplacementMap driven by feTurbulence of the *ridged* kind —
 *     its sharp valleys read as creases rather than soft warping — applied to
 *     the viewport element only for the duration of the effect;
 *  2. a canvas laid over the top that draws seeded crease lines (a dark
 *     groove plus a light lip) and a few faceted planes, so the folds catch
 *     light the way paper does.
 * Amount follows a fast fold-in and a damped, slightly ringing settle.
 */

export interface CrumpleRig {
  readonly surface: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly displacement: SVGFEDisplacementMapElement;
  readonly turbulence: SVGFETurbulenceElement;
  readonly seed: number;
}

export interface CrumpleOptions {
  readonly reduced: boolean;
  readonly z: number;
}

const DURATION = 1050;
const PEAK = 46;
const FOLD_IN = 0.26;

let running = false;

interface Crease {
  readonly pts: readonly (readonly [number, number])[];
  readonly weight: number;
}

interface Facet {
  readonly pts: readonly [number, number][];
  readonly light: boolean;
}

function makeCreases(seed: number, w: number, h: number): { creases: Crease[]; facets: Facet[] } {
  const r: Rng = rngFor(seed, "crease");
  const creases: Crease[] = [];
  for (let i = 0; i < 26; i++) {
    let x = r() * w;
    let y = r() * h;
    let angle = between(r, -0.7, 0.7) + (r() < 0.5 ? 0 : Math.PI / 2.3);
    const pts: [number, number][] = [[x, y]];
    const segments = 3 + Math.floor(r() * 3);
    for (let s = 0; s < segments; s++) {
      const len = between(r, 90, 300);
      angle += between(r, -0.5, 0.5);
      x += Math.cos(angle) * len;
      y += Math.sin(angle) * len;
      pts.push([x, y]);
    }
    creases.push({ pts, weight: between(r, 0.5, 1) });
  }
  const facets: Facet[] = [];
  for (let i = 0; i < 9; i++) {
    const cx = r() * w;
    const cy = r() * h;
    const rad = between(r, 160, 420);
    const a0 = r() * Math.PI * 2;
    const pts: [number, number][] = [0, 1, 2].map((k) => {
      const a = a0 + k * 2.1 + between(r, -0.4, 0.4);
      return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
    });
    facets.push({ pts, light: i % 2 === 0 });
  }
  return { creases, facets };
}

/** Fold in fast, then a damped settle that rings just a little. Continuous at the joint. */
function envelope(u: number): number {
  if (u < FOLD_IN) {
    const k = u / FOLD_IN;
    return 1 - Math.pow(1 - k, 3);
  }
  const s = (u - FOLD_IN) / (1 - FOLD_IN);
  return Math.exp(-5.2 * s) * (0.85 + 0.15 * Math.cos(10 * s));
}

function draw(
  ctx: CanvasRenderingContext2D,
  shapes: { creases: Crease[]; facets: Facet[] },
  a: number,
  w: number,
  h: number,
  dpr: number,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  for (const f of shapes.facets) {
    ctx.beginPath();
    f.pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.fillStyle = f.light ? `rgba(255, 236, 214, ${(0.05 * a).toFixed(3)})` : `rgba(0, 0, 0, ${(0.1 * a).toFixed(3)})`;
    ctx.fill();
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const c of shapes.creases) {
    const path = new Path2D();
    c.pts.forEach(([px, py], i) => (i === 0 ? path.moveTo(px, py) : path.lineTo(px, py)));

    ctx.lineWidth = 1.3;
    ctx.strokeStyle = `rgba(0, 0, 0, ${(0.5 * a * c.weight).toFixed(3)})`;
    ctx.stroke(path);

    ctx.save();
    ctx.translate(1.2, 1.2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255, 240, 220, ${(0.2 * a * c.weight).toFixed(3)})`;
    ctx.stroke(path);
    ctx.restore();
  }
}

export function crumple(rig: CrumpleRig, opts: CrumpleOptions): Promise<void> {
  if (running) return Promise.resolve();
  running = true;

  const { surface, canvas, displacement, turbulence } = rig;

  // Reduced motion: no folding, just a 0.4 s cross-fade through a dimmer state.
  if (opts.reduced) {
    return new Promise<void>((resolve) => {
      const anim = surface.animate([{ opacity: 1 }, { opacity: 0.5, offset: 0.5 }, { opacity: 1 }], {
        duration: 400 * opts.z,
        easing: "ease-in-out",
      });
      const done = () => {
        running = false;
        resolve();
      };
      anim.onfinish = done;
      anim.oncancel = done;
    });
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  const shapes = makeCreases(rig.seed, w, h);

  turbulence.setAttribute("seed", String((rig.seed % 997) + 1));
  surface.style.filter = "url(#crumple)";
  surface.style.willChange = "filter, transform";

  const total = DURATION * opts.z;
  const t0 = performance.now();

  return new Promise<void>((resolve) => {
    const finish = () => {
      surface.style.filter = "";
      surface.style.transform = "";
      surface.style.willChange = "";
      displacement.setAttribute("scale", "0");
      ctx?.setTransform(1, 0, 0, 1, 0, 0);
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      running = false;
      resolve();
    };

    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / total);
      const a = envelope(u);
      displacement.setAttribute("scale", (a * PEAK).toFixed(2));
      turbulence.setAttribute(
        "baseFrequency",
        `${(0.0019 + 0.0006 * a).toFixed(5)} ${(0.0031 + 0.0008 * a).toFixed(5)}`,
      );
      surface.style.transform = `scale(${(1 - 0.018 * a).toFixed(4)}) rotate(${(0.35 * a).toFixed(3)}deg)`;
      if (ctx) draw(ctx, shapes, a, w, h, dpr);
      if (u < 1) requestAnimationFrame(tick);
      else finish();
    };

    requestAnimationFrame(tick);
  });
}
