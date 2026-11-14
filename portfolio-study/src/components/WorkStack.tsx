import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { PROJECTS } from "../content";
import { CARD, SpringBag } from "../lib/physics";
import { PARAMS } from "../lib/params";
import { between, rngFor } from "../lib/rng";
import styles from "./WorkStack.module.css";

type Key = "x" | "y" | "rot" | "scale" | "lift" | "peel" | "op" | "rx" | "ry";

interface Rig {
  readonly bag: SpringBag<Key>;
  wrap: HTMLDivElement | null;
  /** Tilts about its top edge, so the tabs of the cards behind never get covered. */
  tilt: HTMLDivElement | null;
  /** The sheet itself — peels sideways. */
  paper: HTMLDivElement | null;
  strip: HTMLDivElement | null;
  /** Resting micro-rotation / offset / edge thickness — seeded, so ?seed= reproduces them. */
  readonly rot: number;
  readonly jx: number;
  readonly jy: number;
  readonly thick: number;
  dir: 1 | -1;
  latched: boolean;
}

interface Metrics {
  cardW: number;
  peel: number;
  stepX: number;
  stepY: number;
}

interface Drag {
  readonly pi: number;
  readonly sx: number;
  moved: boolean;
}

const START: Metrics = { cardW: 560, peel: 220, stepX: 12, stepY: -30 };
const N = PROJECTS.length;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Paper fibre. Seeded so a given ?seed= always grows the same grain. */
function grainUrl(seed: number): string {
  const s = (seed % 997) + 1;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>` +
    `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' seed='${s}' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .22  0 0 0 .55 0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(%23g)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${svg}")`;
}

function edgeShadow(thick: number, lift: number): string {
  const edges: string[] = [];
  for (let t = 1; t <= thick; t++) edges.push(`0 ${t}px 0 ${t % 2 ? "var(--paper-edge)" : "#c9c2b2"}`);
  const rim = `0 0 0 1px rgb(232 160 96 / ${(Math.max(0, lift - 0.12) * 0.32).toFixed(3)})`;
  const drop = `0 ${(2 + lift * 16).toFixed(1)}px ${(10 + lift * 34).toFixed(1)}px rgb(0 0 0 / ${(0.32 + lift * 0.22).toFixed(2)})`;
  return [...edges, rim, drop].join(", ");
}

export function WorkStack({ active, reduced }: { active: boolean; reduced: boolean }) {
  const rigs = useMemo<Rig[]>(() => {
    const r = rngFor(PARAMS.seed, "stack");
    return PROJECTS.map((_p, i) => {
      const rot = between(r, -1.5, 1.5);
      const jx = between(r, -4, 4);
      const jy = between(r, -3, 3);
      const thick = 1 + Math.floor(r() * 3);
      const bag = new SpringBag<Key>(
        { x: i * START.stepX + jx, y: i * START.stepY + jy, rot, scale: 1 - i * 0.01, lift: i === 0 ? 0.12 : 0, peel: 0, op: 1, rx: 0, ry: 0 },
        CARD,
      );
      return { bag, wrap: null, tilt: null, paper: null, strip: null, rot, jx, jy, thick, dir: 1, latched: false };
    });
  }, []);

  const grain = useMemo(() => grainUrl(PARAMS.seed), []);

  const [order, setOrder] = useState<number[]>(() => PROJECTS.map((_p, i) => i));
  const [expanded, setExpanded] = useState<number | null>(null);

  const orderRef = useRef(order);
  const expandedRef = useRef<number | null>(null);
  const pulledRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const metrics = useRef<Metrics>(START);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const last = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const commitOrder = useCallback((o: number[]) => {
    orderRef.current = o;
    setOrder(o);
  }, []);

  const commitExpanded = useCallback((v: number | null) => {
    expandedRef.current = v;
    setExpanded(v);
  }, []);

  /* ---- frame loop: runs only while something is moving --------------------- */

  const paint = useCallback(() => {
    const o = orderRef.current;
    const m = metrics.current;
    rigs.forEach((c, pi) => {
      const { bag, wrap, tilt, paper, strip } = c;
      if (!wrap || !tilt || !paper) return;
      const depth = o.indexOf(pi);
      const lift = bag.get("lift");
      const peel = bag.get("peel");
      wrap.style.transform = `translate3d(${bag.get("x").toFixed(2)}px, ${bag.get("y").toFixed(2)}px, 0) rotate(${bag.get("rot").toFixed(3)}deg) scale(${bag.get("scale").toFixed(4)})`;
      wrap.style.opacity = String(clamp(bag.get("op"), 0, 1));
      wrap.style.zIndex = String(pulledRef.current === pi || expandedRef.current === pi ? 200 : 100 - depth);
      tilt.style.transform = `perspective(1000px) rotateX(${bag.get("rx").toFixed(3)}deg) rotateY(${bag.get("ry").toFixed(3)}deg)`;
      paper.style.transform = `translateX(${(peel * c.dir * m.peel).toFixed(2)}px) rotate(${(peel * c.dir * 2.2).toFixed(3)}deg)`;
      paper.style.boxShadow = edgeShadow(c.thick, lift);
      if (strip) strip.style.opacity = String(Math.min(1, Math.abs(peel) * 1.8));
    });
  }, [rigs]);

  const frame = useCallback(
    (t: number) => {
      const dt = Math.min(0.034, (t - last.current) / 1000) / PARAMS.z;
      last.current = t;
      let moving = false;
      for (const c of rigs) if (c.bag.step(dt, t)) moving = true;
      paint();
      raf.current = moving ? requestAnimationFrame(frame) : 0;
    },
    [rigs, paint],
  );

  const kick = useCallback(() => {
    if (raf.current) return;
    last.current = performance.now();
    raf.current = requestAnimationFrame(frame);
  }, [frame]);

  /* ---- where every card wants to be ---------------------------------------- */

  const applyTargets = useCallback(
    (snap = false) => {
      const o = orderRef.current;
      const ex = expandedRef.current;
      const m = metrics.current;
      const now = performance.now();

      o.forEach((pi, depth) => {
        const c = rigs[pi];
        if (!c || pulledRef.current === pi) return;
        const put = (key: Key, value: number, delay = 0) =>
          snap ? c.bag.jump(key, value) : c.bag.set(key, value, delay * PARAMS.z, now);

        // Everything not at the front sheds tilt, peel and lift.
        if (depth !== 0 || ex !== null) {
          put("rx", 0);
          put("ry", 0);
          put("peel", 0);
          c.latched = false;
        }

        if (ex === null) {
          put("x", depth * m.stepX + c.jx);
          put("y", depth * m.stepY + c.jy);
          put("rot", c.rot);
          put("scale", 1 - depth * 0.01);
          put("op", 1);
          put("lift", depth === 0 ? 0.12 : 0);
        } else if (pi === ex) {
          put("x", 0);
          put("y", 0);
          put("rot", 0);
          put("scale", 1.045);
          put("op", 1);
          put("lift", 1);
        } else {
          // The rest of the stack cascades aside, alternating sides, each a beat later.
          const side = depth % 2 === 1 ? 1 : -1;
          const delay = depth * 55;
          put("x", side * (m.cardW * 0.62 + depth * 22), delay);
          put("y", 46 + depth * 8, delay);
          put("rot", side * (5 + depth * 1.3), delay);
          put("scale", 0.92, delay);
          put("op", 0.15, delay);
          put("lift", 0, delay);
        }
      });

      kick();
    },
    [rigs, kick],
  );

  /* ---- measure, and keep measuring ------------------------------------------ */

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const measure = (first: boolean) => {
      const cardW = rigs[0]?.wrap?.offsetWidth ?? START.cardW;
      const narrow = box.clientWidth < 640;
      metrics.current = {
        cardW,
        peel: Math.round(clamp(cardW * 0.4, 140, 230)),
        stepX: narrow ? 7 : 12,
        stepY: narrow ? -26 : -30,
      };
      box.style.setProperty("--peel", `${metrics.current.peel}px`);
      applyTargets(first);
      paint();
    };

    measure(true);
    const ro = new ResizeObserver(() => measure(false));
    ro.observe(box);
    return () => ro.disconnect();
  }, [rigs, applyTargets, paint]);

  useEffect(() => {
    for (const c of rigs) c.bag.instant = reduced;
  }, [rigs, reduced]);

  useEffect(() => {
    applyTargets();
  }, [order, expanded, applyTargets]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  /* ---- actions -------------------------------------------------------------- */

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const pull = useCallback(
    (pi: number) => {
      if (pullingRef.current || expandedRef.current !== null || orderRef.current[0] === pi) return;
      const c = rigs[pi];
      if (!c) return;
      pullingRef.current = true;
      pulledRef.current = pi;

      // Slide it out sideways and lift it, re-slot it at the front, let it settle.
      c.bag.set("x", c.bag.get("x") + metrics.current.cardW * 0.52);
      c.bag.set("y", c.bag.get("y") + 24);
      c.bag.set("rot", 3.5);
      c.bag.set("lift", 1);
      kick();

      later(() => {
        pulledRef.current = null;
        commitOrder([pi, ...orderRef.current.filter((i) => i !== pi)]);
      }, reduced ? 0 : 260 * PARAMS.z);
      later(() => {
        pullingRef.current = false;
      }, reduced ? 0 : 560 * PARAMS.z);
    },
    [rigs, kick, later, commitOrder, reduced],
  );

  const collapse = useCallback(() => {
    if (expandedRef.current === null) return;
    commitExpanded(null);
    returnFocus.current?.focus({ preventScroll: true });
    returnFocus.current = null;
  }, [commitExpanded]);

  const openFront = useCallback(() => {
    if (expandedRef.current !== null || pullingRef.current) return;
    const front = orderRef.current[0];
    if (front === undefined) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    commitExpanded(front);
  }, [commitExpanded]);

  // `E` (relayed from App) toggles the front card while this section is on screen.
  useEffect(() => {
    const onExpand = () => {
      if (!active) return;
      if (expandedRef.current !== null) collapse();
      else openFront();
    };
    window.addEventListener("study:expand", onExpand);
    return () => window.removeEventListener("study:expand", onExpand);
  }, [active, collapse, openFront]);

  useEffect(() => {
    if (expanded === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapse();
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [expanded, collapse]);

  // Scrolled away? Put the stack back together.
  useEffect(() => {
    if (!active) collapse();
  }, [active, collapse]);

  /* ---- pointer: tilt the top card, peel it, pull the others ------------------ */

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, pi: number) => {
    if (e.button !== 0 || orderRef.current[0] !== pi || expandedRef.current !== null) return;
    if (e.target instanceof Element && e.target.closest("a, button")) return;
    drag.current = { pi, sx: e.clientX, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const m = metrics.current;
    const d = drag.current;

    if (d) {
      const c = rigs[d.pi];
      if (!c) return;
      const dx = e.clientX - d.sx;
      if (!d.moved && Math.abs(dx) > 5) {
        d.moved = true;
        c.dir = dx > 0 ? 1 : -1;
        c.latched = false;
        if (c.paper) c.paper.style.transformOrigin = c.dir > 0 ? "0% 100%" : "100% 100%";
        if (c.strip) c.strip.dataset.side = c.dir > 0 ? "left" : "right";
      }
      if (d.moved) {
        c.bag.set("peel", clamp((dx * c.dir) / (m.peel * 0.9), 0, 1));
        kick();
      }
      return;
    }

    if (e.pointerType === "touch" || expandedRef.current !== null || pullingRef.current) return;
    const front = orderRef.current[0];
    const c = front === undefined ? undefined : rigs[front];
    if (!c?.wrap) return;
    const r = c.wrap.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const inside = Math.abs(nx) <= 1 && Math.abs(ny) <= 1;
    // Only lean into the pointer while it's actually over the card; hovering a tab above it stays flat.
    c.bag.set("ry", inside ? nx * 5 : 0);
    c.bag.set("rx", inside ? -ny * 3.5 : 0);
    c.bag.set("lift", inside ? 0.5 : 0.12);
    kick();
  };

  const onPointerLeave = () => {
    if (drag.current || expandedRef.current !== null) return;
    const front = orderRef.current[0];
    const c = front === undefined ? undefined : rigs[front];
    if (!c) return;
    c.bag.set("rx", 0);
    c.bag.set("ry", 0);
    c.bag.set("lift", 0.12);
    kick();
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, pi: number) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.pi !== pi) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const c = rigs[pi];
    if (!c) return;
    if (d.moved) {
      suppressClick.current = true;
      if (c.bag.get("peel") > 0.5) {
        c.latched = true;
        c.bag.set("peel", 0.85); // held open until you touch it again
      } else {
        c.latched = false;
        c.bag.set("peel", 0);
      }
    } else if (c.latched) {
      c.latched = false;
      c.bag.set("peel", 0);
    }
    kick();
  };

  const onCardClick = (pi: number) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (expandedRef.current !== null) {
      if (expandedRef.current !== pi) collapse();
      return;
    }
    if (orderRef.current[0] !== pi) pull(pi);
  };

  const front = order[0] ?? 0;
  const frontProject = PROJECTS[front];

  return (
    <div className={styles.shell}>
      <div
        ref={boxRef}
        className={styles.stack}
        style={{ "--grain": grain } as CSSProperties}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <div className={styles.scrim} data-on={expanded !== null} onClick={collapse} aria-hidden="true" />

        {PROJECTS.map((p, pi) => {
          const depth = order.indexOf(pi);
          const isFront = depth === 0;
          const isExp = expanded === pi;
          const rig = rigs[pi];
          const n = String(pi + 1).padStart(2, "0");

          return (
            <div
              key={p.id}
              ref={(el) => {
                if (rig) rig.wrap = el;
              }}
              className={styles.card}
              role="group"
              aria-label={`${p.name}, card ${depth + 1} of ${N} in the stack`}
              data-front={isFront}
              data-expanded={isExp}
              data-dimmed={expanded !== null && !isExp}
              onPointerDown={(e) => onPointerDown(e, pi)}
              onPointerUp={(e) => endDrag(e, pi)}
              onPointerCancel={(e) => endDrag(e, pi)}
              onClick={() => onCardClick(pi)}
              onDoubleClick={() => {
                if (isFront && expandedRef.current === null) openFront();
              }}
            >
              {/* what's under the paper: revealed by peeling */}
              <div
                ref={(el) => {
                  if (rig) rig.strip = el;
                }}
                className={styles.strip}
                data-side="left"
                aria-hidden="true"
              >
                <p className={styles.stripLabel}>stack</p>
                <ul className={styles.stripTags}>
                  {p.stack.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p className={styles.live}>
                  <i /> live · {p.domain}
                </p>
                {p.year && <p className={styles.stripRow}>year {p.year}</p>}
                <p className={styles.stripNote}>{p.note}</p>
              </div>

              <div
                ref={(el) => {
                  if (rig) rig.tilt = el;
                }}
                className={styles.tilt}
              >
              <div
                ref={(el) => {
                  if (rig) rig.paper = el;
                }}
                className={styles.paper}
                data-paper=""
              >
                {isFront ? (
                  <div className={styles.tab}>
                    <span className={styles.idx}>{n}</span>
                    <span className={styles.tabName}>{p.name}</span>
                    <span className={styles.tabCat}>{p.category}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.tab}
                    aria-label={`Bring ${p.name} to the front`}
                    onClick={(e) => {
                      e.stopPropagation(); // the card's own click would pull a second time
                      onCardClick(pi);
                    }}
                  >
                    <span className={styles.idx}>{n}</span>
                    <span className={styles.tabName}>{p.name}</span>
                    <span className={styles.tabCat}>{p.category}</span>
                  </button>
                )}

                <div className={styles.body} inert={!isFront}>
                  <div className={styles.compact} data-hidden={isExp}>
                    <p className={styles.sector}>{p.sector}</p>
                    <h3 className={styles.title}>{p.name}</h3>
                    <p className={styles.tagline}>{p.tagline}</p>
                    <ul className={styles.tags}>
                      {p.stack.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                    <div className={styles.foot}>
                      <span className={styles.domain}>{p.domain}</span>
                      <span className={styles.actions}>
                        <button type="button" onClick={openFront}>
                          Open <kbd>E</kbd>
                        </button>
                        <a href={p.url} target="_blank" rel="noopener noreferrer">
                          Visit ↗
                        </a>
                      </span>
                    </div>
                  </div>

                  <div className={styles.full} data-on={isExp} data-scroll-inner="" inert={!isExp}>
                    <div className={styles.fullTop}>
                      <p className={styles.sector}>{p.category}</p>
                      <button ref={isExp ? closeRef : undefined} type="button" className={styles.close} onClick={collapse}>
                        Close <kbd>Esc</kbd>
                      </button>
                    </div>
                    <h3 className={styles.title}>{p.name}</h3>
                    <p className={styles.summary}>{p.summary}</p>
                    <p className={styles.noteBlock}>
                      <span>operational note</span>
                      {p.note}
                    </p>
                    <ul className={styles.highlights}>
                      {p.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                    <ul className={styles.tags}>
                      {p.stack.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                    <a className={styles.visit} href={p.url} target="_blank" rel="noopener noreferrer">
                      Visit live site ↗
                    </a>
                  </div>
                </div>
              </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className={styles.hint} aria-live="polite">
        <span>
          {String(front + 1).padStart(2, "0")}/{String(N).padStart(2, "0")} · {frontProject?.name}
        </span>
        <span>click a tab to pull it forward · drag the top card sideways to peel · double-click or E to open</span>
      </p>
    </div>
  );
}
