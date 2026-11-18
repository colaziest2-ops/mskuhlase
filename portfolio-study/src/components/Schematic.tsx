import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { SKILLS, type ColorName } from "../content";
import { useInView } from "../lib/scroll";
import { Logo } from "./Logo";
import { PARAMS } from "../lib/params";
import styles from "./Schematic.module.css";

const ROW = 150; // px per stratum
const DOT_Y = 58; // px from the stratum's top to its node line
const DECAY_S = 1.2;
/** Seconds for one packet to cross from a node to the layer below. */
const PACKET_S = 1.5;
/** Nodes sit between these two percentages of the width. The right margin leaves room for the last label. */
const X0 = 2.5;
const X1 = 85;
/** The chip layout (CSS) takes over at this width and below, and the lines are hidden there. */
const WIDE = "(min-width: 1101px)";

interface Edge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly color: ColorName;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly d: string;
}

const xPct = (i: number, n: number) => (n === 1 ? 50 : X0 + (i * (X1 - X0)) / (n - 1));
/** Horizontal room a node's label may take: up to the next node, or to the right edge for the last one. */
const roomPct = (i: number, n: number) => Math.min(n === 1 ? 100 : (X1 - X0) / (n - 1), 100 - xPct(i, n));

/**
 * Connections are structural, not claims: each node reaches for its two
 * nearest neighbours in the layer below, so the diagram reads as a stack
 * resting on a stack. Built in real pixels so the packets stay round.
 */
function buildEdges(width: number): Edge[] {
  const edges: Edge[] = [];
  for (let l = 0; l < SKILLS.length - 1; l++) {
    const up = SKILLS[l];
    const down = SKILLS[l + 1];
    if (!up || !down) continue;
    up.nodes.forEach((a, i) => {
      const ax = xPct(i, up.nodes.length);
      const nearest = down.nodes
        .map((b, j) => ({ b, bx: xPct(j, down.nodes.length) }))
        .sort((p, q) => Math.abs(p.bx - ax) - Math.abs(q.bx - ax))
        .slice(0, 2);
      for (const { b, bx } of nearest) {
        const y1 = l * ROW + DOT_Y;
        const y2 = (l + 1) * ROW + DOT_Y;
        const mid = (y1 + y2) / 2;
        const x1 = (ax / 100) * width;
        const x2 = (bx / 100) * width;
        edges.push({
          id: `${a.id}>${b.id}`,
          from: a.id,
          to: b.id,
          color: up.color,
          x1,
          y1,
          x2,
          y2,
          d: `M${x1.toFixed(1)} ${y1} C ${x1.toFixed(1)} ${mid}, ${x2.toFixed(1)} ${mid}, ${x2.toFixed(1)} ${y2}`,
        });
      }
    });
  }
  return edges;
}

/**
 * A point on an edge's curve. Both control points sit at the vertical midpoint, so y follows a
 * smoothstep: the packet eases out of one node and settles into the next without extra easing.
 */
function pointOn(e: Edge, t: number): [number, number] {
  const u = 1 - t;
  const a = u * u * u + 3 * u * u * t;
  const b = 3 * u * t * t + t * t * t;
  const mid = (e.y1 + e.y2) / 2;
  return [e.x1 * a + e.x2 * b, e.y1 * u * u * u + mid * (3 * u * u * t + 3 * u * t * t) + e.y2 * t * t * t];
}

export function Schematic({ reduced }: { reduced: boolean }) {
  const [width, setWidth] = useState(1000);
  const edges = useMemo(() => buildEdges(width), [width]);
  const [active, setActive] = useState<string | null>(null);
  const [diagram, seen] = useInView<HTMLDivElement>({ threshold: 0.2 });
  const glow = `glow-${useId().replace(/[^\w-]/g, "")}`;

  const activeRef = useRef<string | null>(null);
  const edgesRef = useRef<Edge[]>(edges);
  const heat = useRef<Record<string, number>>({});
  const paths = useRef<Record<string, SVGPathElement | null>>({});
  const packets = useRef<Record<string, SVGGElement | null>>({});
  const raf = useRef(0);
  const prev = useRef(0);
  const reducedRef = useRef(reduced);
  const wide = useRef(true);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // The SVG is drawn 1:1 in pixels, so it has to know how wide it is.
  useLayoutEffect(() => {
    const el = diagram.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(320, Math.round(el.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const mq = window.matchMedia(WIDE);
    const onMq = () => {
      wide.current = mq.matches;
    };
    onMq();
    mq.addEventListener("change", onMq);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, [diagram]);

  const frame = useCallback((t: number) => {
    const dt = (t - prev.current) / 1000 / PARAMS.z;
    prev.current = t;
    const decay = reducedRef.current ? 0.25 : DECAY_S;
    const on = activeRef.current;
    const flow = !reducedRef.current && wide.current;
    // one shared phase: packets arriving at the lit node land as the next ones leave it
    const phase = (t / 1000 / (PACKET_S * PARAMS.z)) % 1;
    const fade = Math.min(1, phase / 0.12, (1 - phase) / 0.12);
    let moving = on !== null;

    for (const e of edgesRef.current) {
      let h = heat.current[e.id] ?? 0;
      if (on !== null && (e.from === on || e.to === on)) h = 1;
      else if (h > 0) h = Math.max(0, h - dt / decay);
      heat.current[e.id] = h;
      if (h > 0) moving = true;
      paths.current[e.id]?.style.setProperty("--h", h.toFixed(3));

      const g = packets.current[e.id];
      if (!g) continue;
      if (flow && h > 0.02) {
        const [x, y] = pointOn(e, phase);
        g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        g.style.opacity = (h * fade).toFixed(3);
      } else if (g.style.opacity !== "0") {
        g.style.opacity = "0";
      }
    }
    raf.current = moving ? requestAnimationFrame(frame) : 0;
  }, []);

  const kick = useCallback(() => {
    if (raf.current) return;
    prev.current = performance.now();
    raf.current = requestAnimationFrame(frame);
  }, [frame]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
    },
    [],
  );

  const select = useCallback(
    (id: string | null) => {
      activeRef.current = id;
      setActive(id);
      kick();
    },
    [kick],
  );

  const ignite = (id: string) => {
    heat.current[id] = 1;
    kick();
  };

  // On touch there's no "pointer leaving", so a tap anywhere outside the diagram closes the open note.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const root = diagram.current;
      if (root && e.target instanceof Node && !root.contains(e.target)) select(null);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, [diagram, select]);

  const height = SKILLS.length * ROW;

  return (
    <div
      ref={diagram}
      className={styles.diagram}
      data-in={seen}
      style={{ "--layers": SKILLS.length } as CSSProperties}
      // Touch fires pointerleave right after pointerup, which would close the note the tap just opened.
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch") select(null);
      }}
    >
      <svg className={styles.lines} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <defs>
          <filter id={glow} x="-2" y="-2" width="5" height="5">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        {edges.map((e) => (
          <g key={e.id}>
            <path
              ref={(el) => {
                paths.current[e.id] = el;
              }}
              className={styles.line}
              style={{ "--lc": `var(--c-${e.color})` } as CSSProperties}
              d={e.d}
            />
            {/* fat invisible stroke: the pointer only has to cross near the line */}
            <path className={styles.hit} d={e.d} onPointerEnter={() => ignite(e.id)} />
          </g>
        ))}
        {/* data packets, one per connection; only drawn while that connection is lit */}
        {edges.map((e) => (
          <g
            key={`p-${e.id}`}
            ref={(el) => {
              packets.current[e.id] = el;
            }}
            className={styles.packet}
            style={{ "--lc": `var(--c-${e.color})`, opacity: 0 } as CSSProperties}
          >
            <circle className={styles.halo} r="7" filter={`url(#${glow})`} />
            <circle className={styles.core} r="2.8" />
          </g>
        ))}
      </svg>

      {SKILLS.map((layer, l) => (
        <section
          key={layer.id}
          className={styles.layer}
          style={{ "--row": l, "--lc": `var(--c-${layer.color})` } as CSSProperties}
          aria-label={layer.label}
        >
          <header className={styles.layerHead}>
            <span>{String(l + 1).padStart(2, "0")}</span>
            {layer.label}
            <em>{layer.caption}</em>
          </header>

          {layer.nodes.map((node, i) => {
            const n = layer.nodes.length;
            const x = xPct(i, n);
            const on = active === node.id;
            return (
              <div
                key={node.id}
                className={styles.slot}
                style={{ "--x": `${x}%`, "--w": `${roomPct(i, n)}%`, "--k": l * 8 + i } as CSSProperties}
                data-side={x > 58 ? "right" : "left"}
                data-open={on}
              >
                <button
                  type="button"
                  className={styles.node}
                  aria-expanded={on}
                  aria-describedby={on ? `note-${node.id}` : undefined}
                  onPointerEnter={(e) => {
                    if (e.pointerType !== "touch") select(node.id); // hover is a mouse thing; touch uses tap
                  }}
                  // keyboard focus opens the note; a tap/click also focuses the button on Android/Edge,
                  // and that must not open-then-immediately-close it via the click toggle below
                  onFocus={(e) => {
                    if (e.currentTarget.matches(":focus-visible")) select(node.id);
                  }}
                  onBlur={() => select(null)}
                  onClick={() => select(activeRef.current === node.id ? null : node.id)}
                >
                  <span className={styles.chip} data-on={on}>
                    <Logo id={node.id} size={20} decorative />
                  </span>
                  <span className={styles.text}>
                    <span className={styles.label}>{node.label}</span>
                    {node.tag && <span className={styles.tag}>{node.tag}</span>}
                  </span>
                </button>
                {on && (
                  <p id={`note-${node.id}`} role="status" className={styles.note}>
                    {node.note}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
