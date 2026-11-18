import { easeIO } from "./math";
import { H, W } from "./world";

// The scripted demo (?demo=1): a pointer clicks the bubble from day to night, then drags it back to day. It drives the
// same handlers a real pointer does, one frame at a time. The real pointer takes over the moment it moves.

/** One pass of the demo, in seconds; it repeats. */
export const LOOP = 12;

/** Where the bubble rests by day (left) and at night (right), as a fraction of the pill's width. */
const DAY_U = H / W / 2;
const NIGHT_U = 1 - DAY_U;
/** Where the pointer waits: below the pill, to the right. */
const REST: [number, number] = [0.9, 1.42];

/** The pointer's path: [time s, x, y], x and y as fractions of the pill's width and height; eased between keys. */
const PATH: [number, number, number][] = [
  [0, ...REST],
  [0.35, ...REST],
  [1.35, DAY_U + 0.01, 0.56],   // onto the bubble…
  [2.2, DAY_U + 0.01, 0.56],    // …clicks it, and stays while it slides to night
  [3.3, 0.46, 1.3],             // steps back below the pill to watch the night
  [4.9, 0.5, 1.32],
  [5.7, NIGHT_U - 0.01, 0.55],  // onto the bubble again
  [5.95, NIGHT_U - 0.01, 0.55], // presses…
  [7.25, DAY_U + 0.02, 0.55],   // …drags it back to day
  [7.55, DAY_U + 0.02, 0.55],
  [9.6, ...REST],
  [LOOP, ...REST],
];
/** When the button is held: [down s, up s]. The first is a click, the second a drag. */
const PRESSES: [number, number][] = [
  [1.55, 1.68],
  [5.85, 7.4],
];

export type DemoPointer = { u: number; v: number; down: boolean };

/** The demo pointer at time t (seconds into the pass). */
export function demoAt(t: number): DemoPointer {
  let i = 0;
  while (i < PATH.length - 2 && t >= PATH[i + 1][0]) i++;
  const [t0, u0, v0] = PATH[i], [t1, u1, v1] = PATH[i + 1];
  const e = easeIO(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
  const down = PRESSES.some(([a, b]) => t >= a && t < b);
  return { u: u0 + (u1 - u0) * e, v: v0 + (v1 - v0) * e, down };
}
