import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { SKILLS, type ColorName } from "../content";
import { useInView } from "../lib/scroll";
import { PARAMS } from "../lib/params";
import styles from "./Schematic.module.css";

const ROW = 150; // px per stratum
const DOT_Y = 58; // px from the stratum's top to its node line
const DECAY_S = 1.2;

interface Edge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly color: ColorName;
  readonly d: string;
}

const xPct = (i: number, n: number) => (n === 1 ? 50 : 8 + (i * 84) / (n - 1));

/**
 * Connections are structural, not claims: each node reaches for its two
 * nearest neighbours in the layer below, so the diagram reads as a stack
 * resting on a stack.
 */
function buildEdges(): Edge[] {
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
        const x1 = ax * 10;
        const x2 = bx * 10;
        edges.push({
          id: `${a.id}>${b.id}`,
          from: a.id,
          to: b.id,
          color: up.color,
          d: `M${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`,
        });
      }
    });
  }
  return edges;
}

export function Schematic({ reduced }: { reduced: boolean }) {
  const edges = useMemo(buildEdges, []);
  const [active, setActive] = useState<string | null>(null);
  const [diagram, seen] = useInView<HTMLDivElement>({ threshold: 0.2 });

  const activeRef = useRef<string | null>(null);
  const heat = useRef<Record<string, number>>({});
  const paths = useRef<Record<string, SVGPathElement | null>>({});
  const raf = useRef(0);
  const prev = useRef(0);
  const reducedRef = useRef(reduced);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  const frame = useCallback((t: number) => {
    const dt = (t - prev.current) / 1000 / PARAMS.z;
    prev.current = t;
    const decay = reducedRef.current ? 0.25 : DECAY_S;
    const on = activeRef.current;
    let moving = on !== null;

    for (const e of edges) {
      let h = heat.current[e.id] ?? 0;
      if (on !== null && (e.from === on || e.to === on)) h = 1;
      else if (h > 0) h = Math.max(0, h - dt / decay);
      heat.current[e.id] = h;
      if (h > 0) moving = true;
      paths.current[e.id]?.style.setProperty("--h", h.toFixed(3));
    }
    raf.current = moving ? requestAnimationFrame(frame) : 0;
  }, [edges]);

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

  const select = (id: string | null) => {
    activeRef.current = id;
    setActive(id);
    kick();
  };

  const ignite = (id: string) => {
    heat.current[id] = 1;
    kick();
  };

  return (
    <div ref={diagram} className={styles.diagram} data-in={seen} onPointerLeave={() => select(null)}>
      <svg
        className={styles.lines}
        viewBox={`0 0 1000 ${SKILLS.length * ROW}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
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
            const x = xPct(i, layer.nodes.length);
            const on = active === node.id;
            return (
              <div
                key={node.id}
                className={styles.slot}
                style={{ "--x": `${x}%`, "--k": l * 6 + i } as CSSProperties}
                data-side={x > 58 ? "right" : "left"}
              >
                <button
                  type="button"
                  className={styles.node}
                  aria-expanded={on}
                  aria-describedby={on ? `note-${node.id}` : undefined}
                  onPointerEnter={() => select(node.id)}
                  onFocus={() => select(node.id)}
                  onBlur={() => select(null)}
                  onClick={() => select(on ? null : node.id)}
                >
                  <i className={styles.dot} data-on={on} />
                  <span>{node.label}</span>
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
