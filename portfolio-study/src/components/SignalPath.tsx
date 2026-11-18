import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ColorName } from "../content";
import { scrollState, scrollVelocity, subscribeScroll } from "../lib/scroll";
import { Logo } from "./Logo";
import styles from "./SignalPath.module.css";

interface Hop {
  readonly id: string;
  readonly name: string;
  /** Where in the stack this hop sits. */
  readonly kicker: string;
  readonly color: ColorName;
  /** Keys into lib/logos.ts. */
  readonly logos: readonly string[];
  readonly tech: string;
  /** One plain, generic observation about this hop. */
  readonly note: string;
  /** What carries the request on to the next hop. */
  readonly link?: string;
}

/** One request, followed from the screen down to the camera. Generic on purpose: no client, no numbers. */
const HOPS: readonly Hop[] = [
  {
    id: "browser",
    name: "Browser",
    kicker: "client",
    color: "rose",
    logos: ["browser"],
    tech: "HTML, CSS and JS on someone else's device",
    note: "It starts on hardware you don't control: an old phone, a weak signal, a tab left open for days.",
    link: "HTTPS",
  },
  {
    id: "ui",
    name: "Next.js / React UI",
    kicker: "interface",
    color: "sky",
    logos: ["nextjs", "react", "typescript"],
    tech: "Next.js · React · TypeScript",
    note: "Typed components check the input and show a pending state before anything goes over the network.",
    link: "fetch · JSON",
  },
  {
    id: "api",
    name: "API layer",
    kicker: "server",
    color: "violet",
    logos: ["nodejs", "php", "csharp"],
    tech: "Node.js · PHP · C#",
    note: "The server checks the same input again, because nothing from a browser can be trusted, then builds a parameterised query.",
    link: "SQL",
  },
  {
    id: "db",
    name: "Database",
    kicker: "data",
    color: "amber",
    logos: ["postgresql", "mssql", "sql"],
    tech: "PostgreSQL · Microsoft SQL Server",
    note: "An index on the right column decides whether this is a quick seek or a scan of every row.",
    link: "TCP/IP · site LAN",
  },
  {
    id: "node",
    name: "Network & server node",
    kicker: "infrastructure",
    color: "lime",
    logos: ["network", "restore", "linux"],
    tech: "switches · VLANs · Windows and Linux hosts",
    note: "A failing disk, a wrong VLAN or a loose patch lead down here shows up upstairs as a slow app.",
    link: "RTSP · ONVIF",
  },
  {
    id: "vms",
    name: "VMS & camera stream",
    kicker: "server room",
    color: "teal",
    logos: ["vms", "stream"],
    tech: "Axxon One · IP cameras",
    note: "The VMS ties footage to the event, which only works if cameras and servers keep the same NTP time.",
  },
];

/** Where the packet sits, as a fraction of the viewport height. Each hop lights as its pad crosses this line. */
const READ = 0.58;
/** px above the first pad where the request waits before it's sent. */
const ORIGIN_UP = 34;

interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A trace segment: straight down, then a 45° jog across to the next pad, like a routed PCB track. */
interface Seg {
  readonly a: Pt;
  readonly b: Pt;
  /** length of the straight vertical run before the jog */
  readonly v: number;
  readonly len: number;
  readonly d: string;
}

interface Geo {
  readonly w: number;
  readonly h: number;
  /** origin, then one point per pad */
  readonly pts: readonly Pt[];
  readonly segs: readonly Seg[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function makeSeg(a: Pt, b: Pt): Seg {
  const jog = Math.min(Math.abs(b.x - a.x), Math.max(0, b.y - a.y));
  const v = Math.max(0, b.y - a.y - jog);
  const len = Math.max(0.001, v + jog * Math.SQRT2);
  const d = jog > 0.5 ? `M${a.x} ${a.y}V${r1(a.y + v)}L${b.x} ${b.y}` : `M${a.x} ${a.y}V${b.y}`;
  return { a, b, v, len, d };
}

/** The packet's x at height y on a segment, and how much of the segment it has covered. */
function onSeg(s: Seg, y: number): { x: number; f: number } {
  if (y <= s.a.y) return { x: s.a.x, f: 0 };
  if (y >= s.b.y) return { x: s.b.x, f: 1 };
  const dy = y - s.a.y;
  if (dy <= s.v) return { x: s.a.x, f: dy / s.len };
  const k = dy - s.v;
  return { x: s.a.x + Math.sign(s.b.x - s.a.x) * k, f: (s.v + k * Math.SQRT2) / s.len };
}

function xAt(g: Geo, y: number): number {
  for (const s of g.segs) if (y <= s.b.y) return onSeg(s, y).x;
  return g.pts[g.pts.length - 1]?.x ?? 0;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function sameGeo(a: Geo | null, b: Geo): boolean {
  if (!a || a.w !== b.w || a.h !== b.h || a.pts.length !== b.pts.length) return false;
  return a.pts.every((p, i) => p.x === b.pts[i]?.x && p.y === b.pts[i]?.y);
}

export function SignalPath({ reduced }: { reduced: boolean }) {
  const uid = useId().replace(/[^\w-]/g, "");
  const board = useRef<HTMLDivElement>(null);
  const pads = useRef<(HTMLSpanElement | null)[]>([]);
  const lit = useRef<(SVGPathElement | null)[]>([]);
  const glow = useRef<(SVGPathElement | null)[]>([]);
  const packet = useRef<SVGGElement>(null);
  const trail = useRef<(SVGCircleElement | null)[]>([]);

  const [geo, setGeo] = useState<Geo | null>(null);
  const geoRef = useRef<Geo | null>(null);
  const [live, setLive] = useState(0);
  const liveRef = useRef(0);
  const reducedRef = useRef(reduced);

  // Reduced motion shows the end state: every hop lit, nothing travelling.
  const reached = reduced ? HOPS.length : live;

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  // Pads are laid out by CSS; the trace is drawn through wherever they ended up.
  useLayoutEffect(() => {
    const el = board.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const padPts: Pt[] = [];
      for (const p of pads.current) {
        if (!p) continue;
        const r = p.getBoundingClientRect();
        padPts.push({ x: r1(r.left + r.width / 2 - box.left), y: r1(r.top + r.height / 2 - box.top) });
      }
      const first = padPts[0];
      if (!first) return;
      const pts = [{ x: first.x, y: r1(first.y - ORIGIN_UP) }, ...padPts];
      const segs = pts.slice(1).map((b, i) => makeSeg(pts[i] ?? b, b));
      const next: Geo = { w: Math.round(box.width), h: Math.round(box.height), pts, segs };
      if (sameGeo(geoRef.current, next)) return;
      geoRef.current = next;
      setGeo(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) measure();
    });
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, []);

  const update = useCallback(() => {
    const g = geoRef.current;
    const el = board.current;
    if (!g || !el || reducedRef.current) return;
    const first = g.pts[0];
    const last = g.pts[g.pts.length - 1];
    if (!first || !last) return;

    const root = el.closest<HTMLElement>("[data-scroll-root]");
    const vh = root?.clientHeight || window.innerHeight;
    const top = el.getBoundingClientRect().top - (root?.getBoundingClientRect().top ?? 0);
    const raw = vh * READ - top;
    const y = Math.min(last.y, Math.max(first.y, raw));

    let x = first.x;
    g.segs.forEach((s, k) => {
      const at = onSeg(s, y);
      if (y >= s.a.y && y <= s.b.y) x = at.x;
      const off = (1 - at.f).toFixed(4);
      const a = lit.current[k];
      const b = glow.current[k];
      if (a && a.style.strokeDashoffset !== off) a.style.strokeDashoffset = off;
      if (b && b.style.strokeDashoffset !== off) b.style.strokeDashoffset = off;
    });

    let count = 0;
    for (let i = 1; i < g.pts.length; i++) if (raw >= (g.pts[i]?.y ?? Infinity) - 0.5) count = i;
    if (count !== liveRef.current) {
      liveRef.current = count;
      setLive(count);
    }

    const p = packet.current;
    if (p) {
      p.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      p.dataset.state = raw < first.y ? "idle" : raw >= last.y ? "done" : "live";
    }

    // a short wake behind the packet, as long as the scroll is fast; it shrinks back when you stop
    const v = scrollVelocity(performance.now());
    const gap = Math.max(-11, Math.min(11, v * 0.012));
    const strength = raw > first.y && raw < last.y ? Math.min(1, Math.abs(gap) / 5) : 0;
    trail.current.forEach((t, k) => {
      if (!t) return;
      const ty = Math.min(last.y, Math.max(first.y, y - gap * (k + 1)));
      t.setAttribute("cx", xAt(g, ty).toFixed(1));
      t.setAttribute("cy", ty.toFixed(1));
      t.style.opacity = (strength * (0.55 - k * 0.16)).toFixed(3);
    });
  }, []);

  // Scroll drives it. A short rAF tail after the last scroll event lets the wake settle.
  useEffect(() => {
    if (reduced) {
      for (const el of [...lit.current, ...glow.current]) el?.style.removeProperty("stroke-dashoffset");
      return;
    }
    let raf = 0;
    let near = false;
    const loop = (now: number) => {
      update();
      raf = near && now - scrollState.moved < 700 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const el = board.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        near = Boolean(entry?.isIntersecting);
        if (near) kick();
      },
      { rootMargin: "50% 0px 50% 0px" },
    );
    if (el) io.observe(el);
    const off = subscribeScroll(() => {
      if (near) kick();
    });
    const onResize = () => kick();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      off();
      io.disconnect();
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced, update]);

  // new geometry: place everything again
  useEffect(() => {
    if (geo) update();
  }, [geo, update]);

  const current = reached > 0 ? HOPS[reached - 1] : undefined;
  const packetColor = (current ?? HOPS[0])?.color ?? "rose";
  const lastPt = geo?.pts[geo.pts.length - 1];
  const done = reached === HOPS.length;

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Signal path</p>
        <h3 className={styles.title}>One request, screen to camera.</h3>
        <p className={styles.lede}>
          {reduced
            ? "Six hops from the interface down to the server room, and what tends to go wrong at each."
            : "Scroll, and one request travels down the stack. Each hop lights as the request reaches it."}
        </p>
      </header>

      <div className={styles.body}>
        {/* a live readout of the trace; the list beside it carries the same content for assistive tech */}
        <div className={styles.probe} aria-hidden="true" style={{ "--hc": `var(--c-${packetColor})` } as CSSProperties}>
          <p className={styles.probeHead}>
            <span>probe</span>
            <span>
              hop <b>{pad2(reached)}</b> / {pad2(HOPS.length)}
            </span>
          </p>
          <p className={styles.probeName}>{current ? current.name : "Waiting to send"}</p>
          <p className={styles.probeTech}>{current ? current.tech : "the request sits at the browser"}</p>
          <p className={styles.probeLink}>
            {done ? "delivered · end of trace" : current?.link ? `next ▸ ${current.link}` : "next ▸ scroll"}
          </p>
          <div className={styles.meter}>
            {HOPS.map((h, i) => (
              <i key={h.id} data-on={i < reached} style={{ "--hc": `var(--c-${h.color})` } as CSSProperties} />
            ))}
          </div>
        </div>

        <div ref={board} className={styles.board} style={{ "--pc": `var(--c-${packetColor})` } as CSSProperties}>
          {geo && (
            <svg className={styles.trace} width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true">
              <defs>
                {geo.segs.map((s, k) => (
                  <linearGradient
                    key={k}
                    id={`${uid}-g${k}`}
                    gradientUnits="userSpaceOnUse"
                    x1={s.a.x}
                    y1={s.a.y}
                    x2={s.b.x}
                    y2={s.b.y}
                  >
                    <stop offset="0" style={{ stopColor: `var(--c-${HOPS[Math.max(0, k - 1)]?.color ?? "rose"})` }} />
                    <stop offset="1" style={{ stopColor: `var(--c-${HOPS[k]?.color ?? "teal"})` }} />
                  </linearGradient>
                ))}
              </defs>

              {/* the unlit track */}
              <path className={styles.base} d={geo.segs.map((s) => s.d).join("")} />

              {/* the lit track: each segment fills to wherever the packet has got to */}
              {geo.segs.map((s, k) => (
                <path
                  key={`g${k}`}
                  ref={(el) => {
                    glow.current[k] = el;
                  }}
                  className={styles.litGlow}
                  d={s.d}
                  pathLength={1}
                  stroke={`url(#${uid}-g${k})`}
                  strokeDasharray="1 1"
                  strokeDashoffset={reduced ? 0 : 1}
                />
              ))}
              {geo.segs.map((s, k) => (
                <path
                  key={`l${k}`}
                  ref={(el) => {
                    lit.current[k] = el;
                  }}
                  className={styles.lit}
                  d={s.d}
                  pathLength={1}
                  stroke={`url(#${uid}-g${k})`}
                  strokeDasharray="1 1"
                  strokeDashoffset={reduced ? 0 : 1}
                />
              ))}

              {/* where the request waits: an open port */}
              {geo.pts[0] && <circle className={styles.origin} cx={geo.pts[0].x} cy={geo.pts[0].y} r={4} />}

              {/* the trace ends in the server room: an earth symbol */}
              {lastPt && (
                <g className={styles.ground} data-on={done}>
                  <path
                    d={`M${lastPt.x} ${lastPt.y + 8}V${lastPt.y + 30}M${lastPt.x - 10} ${lastPt.y + 30}h20M${lastPt.x - 6.5} ${lastPt.y + 35}h13M${lastPt.x - 3} ${lastPt.y + 40}h6`}
                  />
                </g>
              )}
            </svg>
          )}

          <ol className={styles.hops}>
            {HOPS.map((h, i) => (
              <li
                key={h.id}
                className={styles.hop}
                data-on={i < reached}
                style={{ "--i": i, "--hc": `var(--c-${h.color})` } as CSSProperties}
              >
                <span
                  ref={(el) => {
                    pads.current[i] = el;
                  }}
                  className={styles.pad}
                  aria-hidden="true"
                />
                <p className={styles.kicker}>
                  <span className={styles.idx}>{pad2(i + 1)}</span>
                  <span>{h.kicker}</span>
                </p>
                <h4 className={styles.name}>{h.name}</h4>
                <p className={styles.tech}>
                  <span className={styles.logos} aria-hidden="true">
                    {h.logos.map((id) => (
                      <Logo key={id} id={id} size={16} decorative />
                    ))}
                  </span>
                  <span>{h.tech}</span>
                </p>
                <p className={styles.note}>
                  <span className={styles.noteText}>{h.note}</span>
                </p>
                {h.link && (
                  <p className={styles.link}>
                    <span className={styles.sr}>Passed to the next hop over </span>
                    {h.link}
                  </p>
                )}
              </li>
            ))}
          </ol>

          {geo && (
            <svg
              className={styles.flight}
              width={geo.w}
              height={geo.h}
              viewBox={`0 0 ${geo.w} ${geo.h}`}
              aria-hidden="true"
            >
              <defs>
                <filter id={`${uid}-blur`} x="-2" y="-2" width="5" height="5">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>
              {[0, 1, 2].map((k) => (
                <circle
                  key={k}
                  ref={(el) => {
                    trail.current[k] = el;
                  }}
                  className={styles.wake}
                  r={2.6 - k * 0.5}
                  style={{ opacity: 0 }}
                />
              ))}
              <g ref={packet} className={styles.packet} data-state="idle" transform={`translate(${geo.pts[0]?.x ?? 0} ${geo.pts[0]?.y ?? 0})`}>
                <circle className={styles.packetHalo} r={10} filter={`url(#${uid}-blur)`} />
                <circle className={styles.packetCore} r={3.6} />
              </g>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
