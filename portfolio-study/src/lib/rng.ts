export type Rng = () => number;

/** Small, fast, seedable PRNG (mulberry32). Returns floats in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a — turns a label into a stable 32-bit number. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** An independent stream per concern, so adding a new consumer never shifts the others. */
export function rngFor(seed: number, label: string): Rng {
  return mulberry32((seed ^ hashString(label)) >>> 0);
}

export function between(r: Rng, min: number, max: number): number {
  return min + (max - min) * r();
}
