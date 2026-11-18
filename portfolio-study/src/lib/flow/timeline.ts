/**
 * Flow Tab Bar: geometry and motion, as pure functions of time.
 *
 * Everything is in "stage" units: a fixed 380 x 84 drawing that is scaled to fit
 * the screen as a whole, so the shader, the hit areas and the icons always agree.
 * The engine samples `sample()` once per frame and hands the same state to the
 * shader (uniforms) and to the DOM (CSS variables), so nothing drifts apart.
 */

export const STAGE_W = 380;
export const STAGE_H = 84;

/** The glass bar: a pill inset from the stage edges (room for the shadow). */
export const BAR = { x0: 6, y0: 10, x1: 374, y1: 74, r: 32 } as const;

/** The resting bead: a capsule of liquid glass centred in its tab. */
export const BEAD = { hw: 30, hh: 25, y: 42 } as const;

const PAD = 10;

export const slotWidth = (n: number) => (BAR.x1 - BAR.x0 - PAD * 2) / n;
export const slotX = (i: number, n: number) => BAR.x0 + PAD + slotWidth(n) * (i + 0.5);

/** One move of the bead from one tab to another. Times in seconds. */
export interface Hop {
  readonly from: number;
  readonly to: number;
  readonly t0: number;
  readonly dur: number;
}

/** Everything a frame needs. Shared verbatim by the shader and the overlay. */
export interface FrameState {
  /** bead centre and half-size (stage px) */
  bx: number;
  by: number;
  hw: number;
  hh: number;
  /** 0 = surfaced lens, 1 = sunk under the glass */
  depth: number;
  /** amplitude of the travelling surface wave while sunk */
  wave: number;
  /** colour blend: tab `colFrom` → tab `colTo` by `mix` */
  colFrom: number;
  colTo: number;
  mix: number;
  /** landing ripple: radius (stage px) and strength */
  rippleR: number;
  rippleA: number;
  rippleX: number;
  /** light sweep: band x (stage px) and strength */
  sweepX: number;
  sweepA: number;
  /** per tab: how "lit" it is (icon lift, label) and how much of its stroke is erased */
  act: number[];
  erase: number[];
  /** true while anything is still moving */
  moving: boolean;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** 0 → 1 → 0 over [a, b] */
const bump = (u: number, a: number, b: number) => Math.sin(Math.PI * clamp01((u - a) / (b - a)));

/** Longer hops take a little longer, but not proportionally (it should feel like one gesture). */
export const hopDuration = (from: number, to: number, z: number) => (0.66 + 0.1 * Math.abs(to - from)) * z;

/** How long the landing (bounce, ripple, sweep) keeps the frame loop alive. */
export const tailDuration = (z: number) => 1.15 * z;

const TRAVEL_A = 0.14; // x starts moving once the bead has mostly sunk…
const TRAVEL_B = 0.82; // …and arrives just as it starts to rise

/** Where the bead is along the hop (0 → 1), eased. */
const travel = (u: number) => easeInOutCubic(clamp01((u - TRAVEL_A) / (TRAVEL_B - TRAVEL_A)));

/**
 * Sample the bar at time `t`.
 * `hop` is the move in progress (or the last one, for its landing tail); `rest` is the
 * tab the bead sits on when nothing is happening. `z` scales time (test/slow-mo param).
 */
export function sample(t: number, n: number, rest: number, hop: Hop | null, z: number): FrameState {
  const act = new Array<number>(n).fill(0);
  const erase = new Array<number>(n).fill(0);
  const sw = slotWidth(n);

  let bx = slotX(rest, n);
  let by: number = BEAD.y;
  let hw: number = BEAD.hw;
  let hh: number = BEAD.hh;
  let depth = 0;
  let wave = 0;
  let colFrom = rest;
  let colTo = rest;
  let mix = 0;
  let rippleR = 0;
  let rippleA = 0;
  let rippleX = bx;
  let sweepX = -200;
  let sweepA = 0;
  let moving = false;

  if (hop) {
    const xa = slotX(hop.from, n);
    const xb = slotX(hop.to, n);
    const u = (t - hop.t0) / hop.dur;

    if (u < 1) {
      moving = true;
      // sink, travel under the glass, resurface
      const sink = smooth(0, 0.24, u);
      const rise = 1 - smooth(0.7, 1, u);
      depth = Math.min(sink, rise);

      const m = travel(u);
      bx = xa + (xb - xa) * m;

      // stretch along the direction of travel, from the bead's speed
      const eps = 0.004;
      const v = (travel(u + eps) - travel(u - eps)) / (2 * eps); // d(progress)/du
      const span = Math.abs(xb - xa) / sw; // in tabs
      const stretch = 1 + Math.min(1.1, 0.32 * v * span) * depth;
      hw = BEAD.hw * stretch;
      hh = BEAD.hh * (1 - 0.42 * depth) / Math.sqrt(stretch); // keeps roughly the same volume
      by = BEAD.y + 7 * depth;
      // a little anticipation before it goes under
      const ant = bump(u, 0, 0.16);
      hh *= 1 + 0.07 * ant;
      by -= 2.5 * ant;

      wave = depth * Math.min(1, 0.35 + 0.65 * v * 0.5);
      colFrom = hop.from;
      colTo = hop.to;
      mix = m;

      erase[hop.from] = bump(u, 0, 0.42);
      erase[hop.to] = Math.max(erase[hop.to] ?? 0, bump(u, 0.58, 1));
    } else {
      // landed: damped bounce, ripple and a sweep of light
      const tau = (t - (hop.t0 + hop.dur)) / z;
      bx = xb;
      colFrom = hop.to;
      colTo = hop.to;
      const d = Math.exp(-5.2 * tau);
      const osc = Math.sin(15 * tau);
      by = BEAD.y - 5 * d * osc;
      hh = BEAD.hh * (1 + 0.09 * d * osc);
      hw = BEAD.hw * (1 - 0.06 * d * osc);
      rippleX = xb;
      rippleR = 20 + 170 * (1 - Math.exp(-2.6 * tau));
      rippleA = tau < 1.1 ? Math.exp(-3.2 * tau) * smooth(0, 0.04, tau) : 0;
      const sp = tau / 0.95;
      sweepX = BAR.x0 - 70 + (BAR.x1 - BAR.x0 + 140) * sp;
      sweepA = sp >= 0 && sp <= 1 ? Math.sin(Math.PI * sp) : 0;
      moving = tau < tailDuration(1);
    }
  }

  // a tab is "lit" when the surfaced bead sits on it
  for (let i = 0; i < n; i++) {
    const d = Math.abs(bx - slotX(i, n)) / (sw * 0.55);
    act[i] = (1 - depth) * clamp01(1 - d);
  }

  return { bx, by, hw, hh, depth, wave, colFrom, colTo, mix, rippleR, rippleA, rippleX, sweepX, sweepA, act, erase, moving };
}

/**
 * The 8-second demo that plays once on load: five hops that end where they began,
 * so it loops seamlessly if it's ever run again. Times are offsets from the start.
 */
export const DEMO_LEN = 8;
export const DEMO: readonly { readonly at: number; readonly to: number }[] = [
  { at: 0.5, to: 2 },
  { at: 2.0, to: 4 },
  { at: 3.55, to: 1 },
  { at: 5.1, to: 3 },
  { at: 6.6, to: 0 },
];
