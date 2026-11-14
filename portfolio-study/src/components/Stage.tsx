import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode, RefObject } from "react";
import { FOOTER, INTRO_PARTS, PERSON, PROJECTS, SECTIONS, SKILLS, type ColorName } from "../content";
import { createScroller } from "../lib/physics";
import { PARAMS } from "../lib/params";
import { rngFor } from "../lib/rng";
import { publishScroll, subscribeScroll } from "../lib/scroll";
import { sastHM } from "../lib/time";
import { Hl } from "./Hl";
import { ReLuma } from "./ReLuma";
import { Reveal } from "./Reveal";
import { Schematic } from "./Schematic";
import { Terminal } from "./Terminal";
import { Ticker, type TickerItem } from "./Ticker";
import { Words } from "./Words";
import { WorkStack } from "./WorkStack";
import styles from "./Stage.module.css";

export interface StageApi {
  goTo(index: number): void;
  /** The scrolling surface — what the crumple folds. */
  readonly surface: HTMLElement | null;
}

interface StageProps {
  readonly active: number;
  readonly onActive: (index: number) => void;
  readonly apiRef: RefObject<StageApi | null>;
  readonly reduced: boolean;
}

const PALETTE: readonly ColorName[] = ["amber", "teal", "sky", "violet", "rose", "lime"];
const TICKER: readonly TickerItem[] = SKILLS.flatMap((l) => l.nodes.map((n) => ({ label: n.label, color: l.color })));

const sec = (i: number) => ({ "--sec": `var(--c-${SECTIONS[i]?.color ?? "amber"})` }) as CSSProperties;

const mix = (a: ColorName, b: ColorName, f: number) =>
  `color-mix(in srgb, var(--c-${a}) ${Math.round((1 - f) * 100)}%, var(--c-${b}))`;
/** The surname runs amber → rose → violet, letter by letter. */
const surnameTint = (f: number) => (f < 0.5 ? mix("amber", "rose", f * 2) : mix("rose", "violet", (f - 0.5) * 2));

/** Name letters resolve on a slight mechanical delay — stepped, a little uneven, never smooth. */
function Resolve({
  text,
  label,
  start,
  tint,
}: {
  text: string;
  label: string;
  start: number;
  tint?: (f: number) => string;
}) {
  const glyphs = useMemo(() => {
    const r = rngFor(PARAMS.seed, `arrival:${label}`);
    const chars = Array.from(text);
    return chars.map((ch, i) => ({
      ch,
      delay: Math.round(start + i * 58 + r() * 110),
      color: tint ? tint(chars.length > 1 ? i / (chars.length - 1) : 0) : undefined,
    }));
  }, [text, label, start, tint]);

  return (
    <span aria-hidden="true">
      {glyphs.map((g, i) => (
        <span key={i} className={styles.glyph} style={{ "--d": `${g.delay}ms`, color: g.color } as CSSProperties}>
          {g.ch === " " ? " " : g.ch}
        </span>
      ))}
    </span>
  );
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    /* insecure context or permission denied — fall back below */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* nothing more to try */
  }
  ta.remove();
}

/** Section label with a lit dot, sliding in from the left. */
function Eyebrow({ i, children }: { i: number; children: ReactNode }) {
  return (
    <Reveal as="p" variant="left" className={styles.eyebrow} style={sec(i)}>
      {children}
    </Reveal>
  );
}

/** A hairline that draws itself across the top of a section, in that section's colour. */
function Rule({ i }: { i: number }) {
  return <Reveal variant="wipe" className={styles.rule} style={sec(i)} threshold={0.5} />;
}

/** Confetti: a ring of coloured shards thrown from the email address when it's copied. */
function Burst({ id }: { id: number }) {
  const bits = useMemo(() => {
    const r = rngFor(PARAMS.seed + id, "burst");
    return Array.from({ length: 26 }, (_v, i) => {
      const a = (i / 26) * Math.PI * 2 + r() * 0.4;
      const d = 70 + r() * 130;
      return {
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d - 24,
        c: PALETTE[i % PALETTE.length] ?? "amber",
        s: 4 + r() * 7,
        rot: r() * 540 - 270,
      };
    });
  }, [id]);

  return (
    <span className={styles.burst} aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={
            {
              "--dx": `${b.dx.toFixed(1)}px`,
              "--dy": `${b.dy.toFixed(1)}px`,
              "--c": `var(--c-${b.c})`,
              "--s": `${b.s.toFixed(1)}px`,
              "--r": `${b.rot.toFixed(0)}deg`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

type SendState = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

/** Writes straight to the inbox through api/contact.ts (Resend). */
function MessageForm() {
  const [state, setState] = useState<SendState>({ kind: "idle" });

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      form.reset();
      setState({ kind: "sent" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't send." });
    }
  };

  const busy = state.kind === "sending";

  return (
    <form className={styles.form} onSubmit={(e) => void submit(e)}>
      <Reveal as="p" variant="left" className={styles.formHead}>
        or leave a message
      </Reveal>
      <div className={styles.formRow}>
        <Reveal as="label" variant="left" delay={60} className={styles.field}>
          <span>Name</span>
          <input name="name" type="text" autoComplete="name" required minLength={2} maxLength={200} disabled={busy} />
        </Reveal>
        <Reveal as="label" variant="right" delay={120} className={styles.field}>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required maxLength={200} disabled={busy} />
        </Reveal>
      </div>
      <Reveal as="label" variant="rise" delay={180} className={styles.field}>
        <span>Message</span>
        <textarea name="message" rows={4} required minLength={10} maxLength={4000} disabled={busy} />
      </Reveal>
      {/* honeypot — hidden from people, tempting to bots */}
      <input className={styles.trap} name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <Reveal variant="pop" delay={240} className={styles.formFoot}>
        <button type="submit" className={styles.send} disabled={busy}>
          {busy ? "sending…" : "send"}
        </button>
        <p className={styles.formStatus} role="status" data-kind={state.kind}>
          {state.kind === "sent" && `sent · ${sastHM()} SAST · I'll reply by email`}
          {state.kind === "error" && state.message}
        </p>
      </Reveal>
    </form>
  );
}

function Contact({ reduced }: { reduced: boolean }) {
  const [stamp, setStamp] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const addr = useRef<HTMLButtonElement>(null);
  const heat = useRef(0);
  const raf = useRef(0);
  const prev = useRef(0);
  const clear = useRef(0);

  const frame = useCallback(
    (t: number) => {
      const dt = (t - prev.current) / 1000 / PARAMS.z;
      prev.current = t;
      heat.current = Math.max(0, heat.current - dt / (reduced ? 0.25 : 1.4));
      addr.current?.style.setProperty("--h", heat.current.toFixed(3));
      raf.current = heat.current > 0 ? requestAnimationFrame(frame) : 0;
    },
    [reduced],
  );

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      window.clearTimeout(clear.current);
    },
    [],
  );

  const copy = async () => {
    await copyText(PERSON.email);
    heat.current = 1;
    if (!raf.current) {
      prev.current = performance.now();
      raf.current = requestAnimationFrame(frame);
    }
    if (!reduced) setBurst((n) => n + 1);
    setStamp(`copied to clipboard · ${sastHM()} SAST`);
    window.clearTimeout(clear.current);
    clear.current = window.setTimeout(() => setStamp(null), 5000);
  };

  const links = [
    PERSON.github && { label: "GitHub", href: PERSON.github },
    PERSON.linkedin && { label: "LinkedIn", href: PERSON.linkedin },
    PERSON.resumeUrl && { label: "Résumé", href: PERSON.resumeUrl },
  ].filter((l): l is { label: string; href: string } => Boolean(l));

  return (
    <div className={styles.inner}>
      <Eyebrow i={4}>04 — Contact</Eyebrow>
      <h2 className={styles.h2}>
        <Words
          parts={[
            { t: "Got something" },
            { t: "worth building?", c: "violet" },
          ]}
        />
      </h2>
      <Reveal as="p" variant="blur" delay={250} className={styles.lede}>
        <Hl c="lime">{PERSON.availability}</Hl>. Questions about the site, something that isn't listed here, or a CV —{" "}
        <Hl c="sky">just ask</Hl>.
      </Reveal>

      <Reveal variant="pop" delay={150} className={styles.addrSlot}>
        <button ref={addr} type="button" className={styles.address} data-paper="" onClick={() => void copy()}>
          <span className={styles.addrText}>{PERSON.email}</span>
          <span className={styles.addrHint}>copy</span>
          {burst > 0 && <Burst key={burst} id={burst} />}
        </button>
      </Reveal>
      <p className={styles.stamp} role="status">
        {stamp ?? " "}
      </p>

      <Reveal as="p" variant="rise" delay={120} className={styles.alt}>
        <a href={`mailto:${PERSON.email}`}>or open your mail app ↗</a>
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label} ↗
          </a>
        ))}
      </Reveal>

      <MessageForm />

      <Reveal as="footer" variant="blur" className={styles.footer}>
        <span>{FOOTER}</span>
        <span>
          © {new Date().getFullYear()} {PERSON.name}
        </span>
      </Reveal>
    </div>
  );
}

export function Stage({ active, onActive, apiRef, reduced }: StageProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const parallax = useRef<HTMLDivElement>(null);
  const reducedRef = useRef(reduced);
  const activeRef = useRef(0);

  // Touch screens have no hover, so the portrait's light would sit dead — let it drift there.
  const coarse = useMemo(() => window.matchMedia("(pointer: coarse)").matches, []);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;

    const scroller = createScroller(el, { isReduced: () => reducedRef.current, z: PARAMS.z });

    apiRef.current = {
      surface: el,
      goTo: (i) => {
        const section = sections.current[i];
        if (section) scroller.to(i === 0 ? 0 : section.offsetTop);
      },
    };

    let ticking = false;
    const measure = () => {
      ticking = false;
      const line = el.scrollTop + el.clientHeight * 0.4;
      let idx = 0;
      sections.current.forEach((s, i) => {
        if (s && s.offsetTop <= line) idx = i;
      });
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        onActive(idx);
      }
    };
    const onScroll = () => {
      publishScroll(el.scrollTop, Math.max(0, el.scrollHeight - el.clientHeight), performance.now());
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.focus({ preventScroll: true }); // so PageUp / PageDown / Space scroll natively

    return () => {
      el.removeEventListener("scroll", onScroll);
      scroller.destroy();
      apiRef.current = null;
    };
  }, [apiRef, onActive]);

  // The portrait drifts up and tilts a touch as you leave the top of the page.
  useEffect(
    () =>
      subscribeScroll((s) => {
        const el = parallax.current;
        if (!el || reducedRef.current) return;
        const t = Math.min(1, s.y / Math.max(1, window.innerHeight));
        el.style.transform = `translate3d(0, ${(-t * 80).toFixed(1)}px, 0) rotate(${(t * 3).toFixed(2)}deg)`;
      }),
    [],
  );

  const setSection = (i: number) => (el: HTMLElement | null) => {
    sections.current[i] = el;
  };

  return (
    <div ref={viewport} className={`${styles.viewport} no-bar`} tabIndex={-1}>
      <div className={styles.content}>
        {/* 00 — arrival */}
        <section
          id="home"
          ref={setSection(0)}
          className={`${styles.section} ${styles.home}`}
          aria-labelledby="name"
          style={sec(0)}
        >
          <div className={styles.homeGrid}>
            <div>
              <p className={styles.status}>
                <i /> {PERSON.availability}
              </p>
              <h1 id="name" className={styles.name} aria-label={PERSON.name}>
                <span className={styles.nameLine}>
                  <Resolve text={PERSON.first} label="first" start={120} />
                </span>
                <span className={styles.nameLine}>
                  <Resolve text={PERSON.last} label="last" start={120 + PERSON.first.length * 58 + 140} tint={surnameTint} />
                </span>
              </h1>
              <p className={styles.role}>
                <span className={styles.roleA}>Software Engineer</span> <span className={styles.roleAmp}>&amp;</span>{" "}
                <span className={styles.roleB}>Technical Operations</span>
              </p>
              <Reveal as="p" variant="blur" delay={650} className={styles.intro}>
                {INTRO_PARTS.map((p, i) =>
                  p.c ? (
                    <Hl key={i} c={p.c}>
                      {p.t}
                    </Hl>
                  ) : (
                    p.t
                  ),
                )}
              </Reveal>
            </div>

            <Reveal as="figure" variant="pop" delay={450} className={styles.portrait}>
              <div ref={parallax} className={styles.parallax} data-paper="">
                <ReLuma
                  src="/portrait.jpg"
                  depth="/portrait-depth.png"
                  preset="dramatic"
                  intensity={1.6}
                  radius={0.85}
                  color="#ffb877"
                  ambient={0.42}
                  interaction="page"
                  idle={coarse && !reduced ? "drift" : "still"}
                  alt={`Portrait of ${PERSON.name}`}
                  style={{ width: "100%", aspectRatio: "375 / 667" }}
                />
              </div>
              <figcaption>{coarse ? "depth-mapped · the light drifts" : "depth-mapped · lit by your cursor"}</figcaption>
            </Reveal>
          </div>
        </section>

        {/* two crossing bands of colour, pushed around by the scroll */}
        <div className={styles.bands} aria-hidden="true">
          <Reveal variant="left" className={styles.bandSlot} style={{ top: "34px" }}>
            <div className={`${styles.band} ${styles.bandA}`}>
              <Ticker items={TICKER} dir={1} speed={52} reduced={reduced} />
            </div>
          </Reveal>
          <Reveal variant="right" delay={140} className={styles.bandSlot} style={{ top: "92px" }}>
            <div className={`${styles.band} ${styles.bandB}`}>
              <Ticker items={[...TICKER].reverse()} dir={-1} speed={40} reduced={reduced} />
            </div>
          </Reveal>
        </div>

        {/* 01 — work */}
        <section id="work" ref={setSection(1)} className={styles.section} style={sec(1)}>
          <Rule i={1} />
          <div className={`${styles.inner} ${styles.split}`}>
            <div className={styles.splitHead}>
              <Eyebrow i={1}>01 — Work</Eyebrow>
              <h2 className={styles.h2}>
                <Words
                  parts={[
                    { t: `${PROJECTS.length} platforms,` },
                    { t: "all live.", c: "rose" },
                  ]}
                />
              </h2>
              <Reveal as="p" variant="blur" delay={300} className={styles.lede}>
                Real businesses, real traffic. <Hl c="rose">Pull a card forward</Hl>, <Hl c="amber">peel it sideways</Hl>{" "}
                to see what's under it, or <Hl c="sky">open it</Hl> for the working notes.
              </Reveal>
            </div>
            <WorkStack active={active === 1} reduced={reduced} />
          </div>
        </section>

        {/* 02 — stack */}
        <section id="stack" ref={setSection(2)} className={styles.section} style={sec(2)}>
          <Rule i={2} />
          <div className={styles.inner}>
            <Eyebrow i={2}>02 — Stack</Eyebrow>
            <h2 className={styles.h2}>
              <Words
                parts={[
                  { t: "Interface to" },
                  { t: "server room.", c: "teal" },
                ]}
              />
            </h2>
            <Reveal as="p" variant="blur" delay={300} className={styles.lede}>
              Three layers, one working system. Move across a node and its connections light, then fade like{" "}
              <Hl c="amber">heat leaving metal</Hl>.
            </Reveal>
            <Schematic reduced={reduced} />
          </div>
        </section>

        {/* 03 — play */}
        <section id="play" ref={setSection(3)} className={styles.section} style={sec(3)}>
          <Rule i={3} />
          <div className={styles.inner}>
            <Eyebrow i={3}>03 — Play</Eyebrow>
            <h2 className={styles.h2}>
              <Words
                parts={[
                  { t: "Talk to the" },
                  { t: "shell.", c: "lime" },
                ]}
              />
            </h2>
            <Reveal as="p" variant="blur" delay={300} className={styles.lede}>
              <Hl c="lime">Real commands.</Hl> Anything that isn't one is sent on as a question.
            </Reveal>
            <Reveal variant="tilt" delay={120} className={styles.termSlot}>
              <Terminal reduced={reduced} />
            </Reveal>
          </div>
        </section>

        {/* 04 — contact */}
        <section id="contact" ref={setSection(4)} className={styles.section} style={sec(4)}>
          <Rule i={4} />
          <Contact reduced={reduced} />
        </section>
      </div>
    </div>
  );
}
