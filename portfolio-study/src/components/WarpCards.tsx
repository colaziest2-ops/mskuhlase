import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { PROJECTS } from "../content";
import { TechTag } from "./TechTags";
import { DetailSheet } from "./DetailSheet";
import { Spring } from "../lib/physics";
import type { SpringConfig } from "../lib/physics";
import { PARAMS } from "../lib/params";
import styles from "./WarpCards.module.css";

const N = PROJECTS.length;
const LAST = N - 1;
/** ζ≈0.92: the track glides into a card with the faintest settle. */
const TRACK: SpringConfig = { k: 150, c: 22.5 };
/** The fan-out when the track first appears. */
const SPREAD: SpringConfig = { k: 95, c: 15 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pad = (n: number) => String(n).padStart(2, "0");

/** Paper fibre. Seeded so a given ?seed= always grows the same grain (shared with DetailSheet). */
function grainUrl(seed: number): string {
  const s = (seed % 997) + 1;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>` +
    `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' seed='${s}' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .22  0 0 0 .55 0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(%23g)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${svg}")`;
}

interface Drag {
  readonly id: number;
  readonly x0: number;
  readonly y0: number;
  readonly pos0: number;
  mode: "pending" | "drag" | "scroll";
  lastX: number;
  lastT: number;
  /** cards per second, smoothed */
  v: number;
}

interface Tap {
  readonly i: number;
  readonly x: number;
  readonly y: number;
  readonly k: number;
  readonly miss: boolean;
}

/**
 * Warp Cards: the seven projects on a bent track. The centred card is sharp; its
 * neighbours curl outward, stretch toward the edges and sink back, picking up a
 * red/cyan smear and a soft blur as if seen through the edge of a lens. The smear
 * swells on every card while the track moves fast.
 *
 * One float `pos` on a spring drives everything; each card's look is a pure
 * function of its offset `o = i - pos`, written to style every frame. The loop
 * only runs while something moves, so at rest the track costs nothing.
 */
export function WarpCards({ active, reduced }: { readonly active: boolean; readonly reduced: boolean }) {
  const [pos] = useState(() => {
    const s = new Spring(0, TRACK);
    s.eps = 0.0015;
    return s;
  });
  // the track fans out from a tight bundle the first time it appears
  const [spread] = useState(() => {
    const s = new Spring(reduced ? 1 : 0.18, SPREAD);
    s.target = 1;
    s.eps = 0.002;
    return s;
  });

  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const papers = useRef<(HTMLDivElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const metrics = useRef({ spacing: 220, depth: 180 });
  const drag = useRef<Drag | null>(null);
  const dragVel = useRef(0);
  const smear = useRef(0);
  const suppressClick = useRef(false);
  const raf = useRef(0);
  const last = useRef(0);
  const reducedRef = useRef(reduced);
  const returnFocus = useRef<HTMLElement | null>(null);

  const [centre, setCentre] = useState(0);
  const centreRef = useRef(0);
  const [touched, setTouched] = useState(false);
  const [sheet, setSheet] = useState<number | null>(null);
  const sheetRef = useRef<number | null>(null);
  const grain = useMemo(() => grainUrl(PARAMS.seed), []);
  const coarse = useMemo(() => window.matchMedia("(pointer: coarse)").matches, []);
  const [tap, setTap] = useState<Tap | null>(null);
  const tapTimer = useRef(0);
  /** 0: point at Open · 1: they've opened one, now point at Visit */
  const [guide, setGuide] = useState(0);

  /* ---- paint: every card from its offset ---------------------------------------- */

  const paint = useCallback(() => {
    const p = pos.x;
    const { spacing, depth } = metrics.current;
    const sp = spread.x;
    const red = reducedRef.current;
    // speed smear, in px: grows with how fast the track is travelling (cards/s)
    const rush = red ? 0 : Math.min(12, smear.current * 3.2);

    for (let i = 0; i < N; i++) {
      const el = cards.current[i];
      if (!el) continue;
      const o = i - p;
      const a = Math.abs(o);
      const s = Math.sign(o);
      const x = o * spacing * sp * (1 + 0.08 * a);
      const z = -a * depth;
      const ry = -s * Math.min(a, 2.4) * 34;
      const sx = 1 + Math.min(a, 2) * 0.14;
      const blur = Math.min(a, 3) * 1.1;
      const op = a <= 3 ? 1 : Math.max(0, 1 - (a - 3) / 0.8);

      el.style.transform =
        `translate3d(${x.toFixed(2)}px, 0, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scaleX(${sx.toFixed(4)})`;
      el.style.opacity = op.toFixed(3);
      el.style.visibility = op <= 0.001 ? "hidden" : "";
      el.style.zIndex = String(100 - Math.round(a * 10));

      const d = red ? 0 : Math.min(a, 1.5) * 3 + rush;
      const parts: string[] = [];
      if (blur > 0.05) parts.push(`blur(${blur.toFixed(2)}px)`);
      if (d > 0.1) {
        const dd = d.toFixed(2);
        parts.push(`drop-shadow(${dd}px 0 0 rgba(255,40,90,.35))`, `drop-shadow(-${dd}px 0 0 rgba(0,190,255,.35))`);
      }
      el.style.filter = parts.length ? parts.join(" ") : "none";
    }

    const c = clamp(Math.round(p), 0, LAST);
    if (c !== centreRef.current) {
      centreRef.current = c;
      setCentre(c);
    }
  }, [pos, spread]);

  const frame = useCallback(
    (t: number) => {
      const dt = Math.min(0.034, (t - last.current) / 1000) / PARAMS.z;
      last.current = t;
      const dragging = drag.current?.mode === "drag";
      if (!dragging && pos.moving) pos.step(dt);
      if (spread.moving) spread.step(dt);
      if (!pos.moving && !dragging) pos.snap();
      if (!spread.moving) spread.snap();

      // the smear follows the track's speed: up fast, down a little slower
      const speed = Math.abs(dragging ? dragVel.current : pos.v);
      const k = speed > smear.current ? 14 : 6;
      smear.current += (speed - smear.current) * Math.min(1, dt * k);
      if (!dragging && !pos.moving && smear.current < 0.02) smear.current = 0;

      paint();
      const moving = dragging || pos.moving || spread.moving || smear.current > 0;
      raf.current = moving ? requestAnimationFrame(frame) : 0;
    },
    [pos, spread, paint],
  );

  const kick = useCallback(() => {
    if (raf.current) return;
    last.current = performance.now();
    raf.current = requestAnimationFrame(frame);
  }, [frame]);

  /* ---- measure, and keep measuring --------------------------------------------- */

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const cardW = cards.current[0]?.offsetWidth ?? 360;
      const narrow = stage.clientWidth < 560;
      metrics.current = {
        spacing: cardW * (narrow ? 0.74 : 0.62),
        depth: cardW * (narrow ? 0.42 : 0.5),
      };
      paint();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [paint]);

  useEffect(() => {
    reducedRef.current = reduced;
    if (reduced) {
      pos.snap();
      spread.x = 1;
      spread.snap();
      smear.current = 0;
      paint();
    } else {
      kick(); // fan the track out
    }
  }, [reduced, pos, spread, paint, kick]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
    },
    [],
  );

  /* ---- moving the track -------------------------------------------------------- */

  const go = useCallback(
    (i: number, v?: number) => {
      const target = clamp(Math.round(i), 0, LAST);
      setTouched(true);
      pos.target = target;
      if (v !== undefined) pos.v = v;
      if (reducedRef.current) {
        pos.snap();
        smear.current = 0;
        paint();
        return;
      }
      kick();
    },
    [pos, paint, kick],
  );

  const step = useCallback((dir: 1 | -1) => go(Math.round(pos.target) + dir), [go, pos]);

  // A card that slides away from the centre goes inert; don't strand keyboard focus on it.
  useEffect(() => {
    const region = regionRef.current;
    const a = document.activeElement;
    if (!region || !(a instanceof HTMLElement) || !region.contains(a)) return;
    const card = a.closest<HTMLElement>("[data-card]");
    if (card && card.dataset.card !== String(centre)) region.focus({ preventScroll: true });
  }, [centre]);

  /* ---- opening a card ---------------------------------------------------------- */

  const open = useCallback((i: number) => {
    if (sheetRef.current !== null) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheetRef.current = i;
    setSheet(i);
    setGuide(1);
  }, []);

  const close = useCallback(() => {
    sheetRef.current = null;
    setSheet(null);
    // the sheet keeps #root inert until it unmounts; hand focus back once it has
    const back = returnFocus.current;
    returnFocus.current = null;
    window.setTimeout(() => {
      const target = back?.isConnected && !back.closest("[inert]") ? back : regionRef.current;
      target?.focus({ preventScroll: true });
    }, 30);
  }, []);

  // `E` (relayed from App) opens the centred card while this section is on screen.
  useEffect(() => {
    const onExpand = () => {
      if (!active || sheetRef.current !== null) return;
      open(centreRef.current);
    };
    window.addEventListener("study:expand", onExpand);
    return () => window.removeEventListener("study:expand", onExpand);
  }, [active, open]);

  /* ---- pointer: drag / swipe with momentum ---------------------------------------- */

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || drag.current) return;
    suppressClick.current = false;
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      pos0: pos.x,
      mode: "pending",
      lastX: e.clientX,
      lastT: performance.now(),
      v: 0,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;

    if (d.mode === "pending") {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        d.mode = "drag";
        d.lastX = e.clientX;
        d.lastT = performance.now();
        dragVel.current = 0;
        setTouched(true);
        setTap(null);
        e.currentTarget.setPointerCapture(e.pointerId);
        stageRef.current?.setAttribute("data-dragging", "true");
        kick();
      } else if (Math.abs(dy) > 8) {
        d.mode = "scroll"; // the page is scrolling; leave it alone
      }
      return;
    }
    if (d.mode !== "drag") return;

    const { spacing } = metrics.current;
    let p = d.pos0 - dx / spacing;
    // rubber band past either end
    if (p < 0) p *= 0.3;
    else if (p > LAST) p = LAST + (p - LAST) * 0.3;
    pos.x = p;
    pos.target = p;
    pos.v = 0;

    const now = performance.now();
    const dt = (now - d.lastT) / 1000;
    if (dt > 0.004) {
      const v = -(e.clientX - d.lastX) / spacing / dt;
      d.v = d.v * 0.55 + v * 0.45;
      d.lastX = e.clientX;
      d.lastT = now;
    }
    dragVel.current = d.v;
    kick();
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.mode !== "drag") return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    stageRef.current?.removeAttribute("data-dragging");
    suppressClick.current = true;

    // a finger that stopped before lifting carries no momentum
    const v = cancelled || performance.now() - d.lastT > 90 ? 0 : clamp(d.v, -14, 14);
    let target = Math.round(pos.x + v * 0.2);
    const from = Math.round(d.pos0);
    // a quick flick always moves at least one card
    if (target === from && Math.abs(v) > 1.2) target = from + Math.sign(v);
    go(target, v);
  };

  /* ---- taps: centre a side card, or say "missed me" on the centred one ------------ */

  const tapAt = (i: number, clientX: number, clientY: number, miss: boolean) => {
    const paper = papers.current[i];
    if (!paper) return;
    const r = paper.getBoundingClientRect();
    setTap((t) => ({ i, x: clientX - r.left, y: clientY - r.top, k: (t?.k ?? 0) + 1, miss }));
    window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => setTap(null), (miss ? 1700 : 700) * PARAMS.z);
  };

  useEffect(() => () => window.clearTimeout(tapTimer.current), []);

  const onCardClick = (i: number, e: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (i !== centreRef.current || Math.round(pos.target) !== i) {
      go(i);
      return;
    }
    if (e.target instanceof Element && e.target.closest("a, button")) return;
    tapAt(i, e.clientX, e.clientY, true);
  };

  /* ---- keyboard ------------------------------------------------------------------ */

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    let handled = true;
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(LAST);
    else handled = false;
    if (handled) {
      // App's window-level ←/→ moves between sections; it skips prevented events
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const centred = PROJECTS[centre];
  const idle = !touched && !reduced;

  return (
    <div className={styles.shell} style={{ "--grain": grain } as CSSProperties}>
      <div
        ref={regionRef}
        className={styles.region}
        role="region"
        aria-roledescription="carousel"
        aria-label="Projects"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className={styles.viewport}>
          <div
            ref={stageRef}
            className={styles.stage}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => endDrag(e, false)}
            onPointerCancel={(e) => endDrag(e, true)}
          >
            {PROJECTS.map((p, i) => {
              const isC = i === centre;
              return (
                <div
                  key={p.id}
                  ref={(el) => {
                    cards.current[i] = el;
                  }}
                  className={styles.card}
                  style={{ "--ac": p.ac } as CSSProperties}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${N}`}
                  data-card={i}
                  data-centre={isC}
                  onPointerDown={(e) => {
                    // a small ripple where the finger (or click) lands: you always see the touch register
                    if (isC && e.button === 0) tapAt(i, e.clientX, e.clientY, false);
                  }}
                  onPointerMove={(e) => {
                    if (!isC || e.pointerType === "touch") return;
                    const r = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--sx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
                    e.currentTarget.style.setProperty("--sy", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
                  }}
                  onClick={(e) => onCardClick(i, e)}
                >
                  <div
                    ref={(el) => {
                      papers.current[i] = el;
                    }}
                    className={styles.paper}
                    data-miss={tap?.i === i && tap.miss ? (tap.k % 2 ? "a" : "b") : undefined}
                  >
                    <span className={styles.sheen} aria-hidden="true" />
                    {tap?.i === i && (
                      <span
                        key={tap.k}
                        className={styles.ripple}
                        data-miss={tap.miss}
                        style={{ "--mx": `${tap.x}px`, "--my": `${tap.y}px` } as CSSProperties}
                        aria-hidden="true"
                      />
                    )}
                    {tap?.i === i && tap.miss && (
                      <span key={`m${tap.k}`} className={styles.missed} role="status">
                        Missed me! Tap <b>Open</b> to read more
                      </span>
                    )}

                    <div className={styles.body} inert={!isC}>
                      <p className={styles.top}>
                        <span className={styles.idx}>{pad(i + 1)}</span>
                        <span className={styles.cat}>{p.category}</span>
                        <span className={styles.livechip}>
                          <i /> Live
                        </span>
                      </p>
                      <p className={styles.sector}>{p.sector}</p>
                      <h3 className={styles.title}>{p.name}</h3>
                      <p className={styles.tagline}>{p.tagline}</p>
                      <ul className={styles.tags}>
                        {p.stack.map((s) => (
                          <TechTag key={s} name={s} />
                        ))}
                      </ul>
                      <div className={styles.foot}>
                        <span className={styles.domain}>{p.domain}</span>
                        <span className={styles.actions}>
                          <button
                            type="button"
                            onClick={() => open(i)}
                            data-guide={isC && guide === 0}
                            data-nudge={tap?.i === i && tap.miss}
                          >
                            Open <kbd>E</kbd>
                          </button>
                          <a href={p.url} target="_blank" rel="noopener noreferrer" data-guide={isC && guide === 1}>
                            Visit ↗
                          </a>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className={styles.arrow}
          data-dir="prev"
          data-idle={idle}
          onClick={() => step(-1)}
          disabled={centre === 0}
          aria-label="Previous project"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.arrow}
          data-dir="next"
          data-idle={idle}
          onClick={() => step(1)}
          disabled={centre === LAST}
          aria-label="Next project"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className={styles.bar}>
          <div className={styles.dots}>
            {PROJECTS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={styles.dot}
                style={{ "--ac": p.ac } as CSSProperties}
                data-on={i === centre}
                aria-label={`Show ${p.name}`}
                aria-current={i === centre || undefined}
                onClick={() => go(i)}
              >
                <i />
              </button>
            ))}
          </div>
          <p className={styles.index} aria-hidden="true">
            <b>{pad(centre + 1)}</b> / {pad(N)} · {centred?.name}
          </p>
        </div>

        <p className={styles.sr} aria-live="polite" aria-atomic="true">
          {centred ? `${centred.name}, ${centre + 1} of ${N}` : ""}
        </p>
      </div>

      <p className={styles.hint}>
        {coarse
          ? "① swipe, or tap a side card · ② tap Open · ③ Visit the live site"
          : "① drag, click a side card, or use ← → · ② Open (or E) · ③ Visit the live site"}
      </p>

      {sheet !== null && PROJECTS[sheet] && (
        <DetailSheet project={PROJECTS[sheet]} index={sheet} total={N} grain={grain} onClose={close} />
      )}
    </div>
  );
}
