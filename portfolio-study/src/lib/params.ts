import { useEffect, useState } from "react";

/**
 * URL parameters:
 *   ?seed=123    fixes every seeded micro-variation (card rotations, grain,
 *                arrival jitter, crease layout) so a given look is reproducible
 *   ?z=3         time dilation — every spring, settle and crumple runs 3× slower
 *                (handy for inspecting motion). 0.25–6, default 1
 *   ?reduced=1   force reduced motion on (0 forces it off); default follows the OS
 */
export interface Params {
  readonly seed: number;
  readonly z: number;
  readonly reduced: boolean | null;
}

function read(): Params {
  const q = new URLSearchParams(window.location.search);

  const seedRaw = q.get("seed");
  const seedNum = seedRaw === null || seedRaw.trim() === "" ? Number.NaN : Number(seedRaw);
  const seed = Number.isFinite(seedNum) ? Math.trunc(seedNum) : Math.floor(Math.random() * 1_000_000_000);

  const zRaw = Number(q.get("z"));
  const z = Number.isFinite(zRaw) && zRaw > 0 ? Math.min(6, Math.max(0.25, zRaw)) : 1;

  const r = q.get("reduced");
  const reduced = r === "1" || r === "true" ? true : r === "0" || r === "false" ? false : null;

  return { seed, z, reduced };
}

export const PARAMS: Params = read();

const MQ = "(prefers-reduced-motion: reduce)";

/** Live read for non-React code (scrollers, crumple). */
export function isReduced(): boolean {
  return PARAMS.reduced ?? window.matchMedia(MQ).matches;
}

/** Reactive reduced-motion flag. Pointer interactions stay; autonomous settles, cascades and the crumple collapse. */
export function useReduced(): boolean {
  const [reduced, setReduced] = useState<boolean>(isReduced);

  useEffect(() => {
    if (PARAMS.reduced !== null) return;
    const mq = window.matchMedia(MQ);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
