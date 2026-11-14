import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, RefObject } from "react";
import { FOOTER, INTRO, PERSON, PROJECTS } from "../content";
import { createScroller } from "../lib/physics";
import { PARAMS } from "../lib/params";
import { rngFor } from "../lib/rng";
import { sastHM } from "../lib/time";
import { ReLuma } from "./ReLuma";
import { Schematic } from "./Schematic";
import { Terminal } from "./Terminal";
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

/** Name letters resolve on a slight mechanical delay — stepped, a little uneven, never smooth. */
function Resolve({ text, label, start }: { text: string; label: string; start: number }) {
  const glyphs = useMemo(() => {
    const r = rngFor(PARAMS.seed, `arrival:${label}`);
    return Array.from(text).map((ch, i) => ({ ch, delay: Math.round(start + i * 58 + r() * 110) }));
  }, [text, label, start]);

  return (
    <span aria-hidden="true">
      {glyphs.map((g, i) => (
        <span key={i} className={styles.glyph} style={{ "--d": `${g.delay}ms` } as CSSProperties}>
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
      <p className={styles.formHead}>or leave a message</p>
      <div className={styles.formRow}>
        <label className={styles.field}>
          <span>Name</span>
          <input name="name" type="text" autoComplete="name" required minLength={2} maxLength={200} disabled={busy} />
        </label>
        <label className={styles.field}>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required maxLength={200} disabled={busy} />
        </label>
      </div>
      <label className={styles.field}>
        <span>Message</span>
        <textarea name="message" rows={4} required minLength={10} maxLength={4000} disabled={busy} />
      </label>
      {/* honeypot — hidden from people, tempting to bots */}
      <input className={styles.trap} name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className={styles.formFoot}>
        <button type="submit" className={styles.send} disabled={busy}>
          {busy ? "sending…" : "send"}
        </button>
        <p className={styles.formStatus} role="status" data-kind={state.kind}>
          {state.kind === "sent" && `sent · ${sastHM()} SAST · I'll reply by email`}
          {state.kind === "error" && state.message}
        </p>
      </div>
    </form>
  );
}

function Contact({ reduced }: { reduced: boolean }) {
  const [stamp, setStamp] = useState<string | null>(null);
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
      <p className={styles.eyebrow}>04 — Contact</p>
      <h2 className={styles.h2}>
        Got something <span className={styles.dim}>worth building?</span>
      </h2>
      <p className={styles.lede}>
        {PERSON.availability}. Questions about the site, something that isn't listed here, or a CV — just ask.
      </p>

      <button ref={addr} type="button" className={styles.address} data-paper="" onClick={() => void copy()}>
        <span className={styles.addrText}>{PERSON.email}</span>
        <span className={styles.addrHint}>copy</span>
      </button>
      <p className={styles.stamp} role="status">
        {stamp ?? " "}
      </p>

      <p className={styles.alt}>
        <a href={`mailto:${PERSON.email}`}>or open your mail app ↗</a>
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label} ↗
          </a>
        ))}
      </p>

      <MessageForm />

      <footer className={styles.footer}>
        <span>{FOOTER}</span>
        <span>© {new Date().getFullYear()} {PERSON.name}</span>
      </footer>
    </div>
  );
}

export function Stage({ active, onActive, apiRef, reduced }: StageProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const reducedRef = useRef(reduced);
  const activeRef = useRef(0);

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

  const setSection = (i: number) => (el: HTMLElement | null) => {
    sections.current[i] = el;
  };

  return (
    <div ref={viewport} className={`${styles.viewport} no-bar`} tabIndex={-1}>
      <div className={styles.content}>
        {/* 00 — arrival */}
        <section id="home" ref={setSection(0)} className={`${styles.section} ${styles.home}`} aria-labelledby="name">
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
                  <Resolve text={PERSON.last} label="last" start={120 + PERSON.first.length * 58 + 140} />
                </span>
              </h1>
              <p className={styles.role}>{PERSON.role}</p>
              <p className={styles.intro}>{INTRO}</p>
            </div>

            <figure className={styles.portrait} data-paper="">
              <ReLuma
                src="/portrait.jpg"
                depth="/portrait-depth.png"
                preset="dramatic"
                intensity={1.6}
                radius={0.85}
                color="#ffb877"
                ambient={0.38}
                interaction="page"
                idle="still"
                alt={`Portrait of ${PERSON.name}`}
                style={{ width: "100%", aspectRatio: "375 / 667" }}
              />
              <figcaption>depth-mapped · lit by your cursor</figcaption>
            </figure>
          </div>
        </section>

        {/* 01 — work */}
        <section id="work" ref={setSection(1)} className={styles.section}>
          <div className={`${styles.inner} ${styles.split}`}>
            <div className={styles.splitHead}>
              <p className={styles.eyebrow}>01 — Work</p>
              <h2 className={styles.h2}>
                {PROJECTS.length} platforms, <span className={styles.dim}>all live.</span>
              </h2>
              <p className={styles.lede}>
                Real businesses, real traffic. Pull a card forward, peel it sideways to see what's under it, or open it
                for the working notes.
              </p>
            </div>
            <WorkStack active={active === 1} reduced={reduced} />
          </div>
        </section>

        {/* 02 — stack */}
        <section id="stack" ref={setSection(2)} className={styles.section}>
          <div className={styles.inner}>
            <p className={styles.eyebrow}>02 — Stack</p>
            <h2 className={styles.h2}>
              Interface to <span className={styles.dim}>server room.</span>
            </h2>
            <p className={styles.lede}>
              Three layers, one working system. Move across a node and its connections light, then fade like heat leaving
              metal.
            </p>
            <Schematic reduced={reduced} />
          </div>
        </section>

        {/* 03 — play */}
        <section id="play" ref={setSection(3)} className={styles.section}>
          <div className={styles.inner}>
            <p className={styles.eyebrow}>03 — Play</p>
            <h2 className={styles.h2}>
              Talk to the <span className={styles.dim}>shell.</span>
            </h2>
            <p className={styles.lede}>Real commands. Anything that isn't one is sent on as a question.</p>
            <Terminal reduced={reduced} />
          </div>
        </section>

        {/* 04 — contact */}
        <section id="contact" ref={setSection(4)} className={styles.section}>
          <Contact reduced={reduced} />
        </section>
      </div>
    </div>
  );
}
