import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "./components/Clock";
import { Cursor } from "./components/Cursor";
import { Rail } from "./components/Rail";
import { Stage, type StageApi } from "./components/Stage";
import { SECTIONS } from "./content";
import { crumple } from "./lib/paper";
import { PARAMS, useReduced } from "./lib/params";
import styles from "./App.module.css";

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function App() {
  const reduced = useReduced();
  const [active, setActive] = useState(0);

  const apiRef = useRef<StageApi | null>(null);
  const activeRef = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const turbulence = useRef<SVGFETurbulenceElement>(null);

  const onActive = useCallback((i: number) => {
    activeRef.current = i;
    setActive(i);
  }, []);

  const goTo = useCallback((i: number) => {
    apiRef.current?.goTo(Math.min(SECTIONS.length - 1, Math.max(0, i)));
  }, []);

  const doCrumple = useCallback(() => {
    const surface = apiRef.current?.surface;
    const c = canvas.current;
    const d = displacement.current;
    const t = turbulence.current;
    if (!surface || !c || !d || !t) return;
    void crumple(
      { surface, canvas: c, displacement: d, turbulence: t, seed: PARAMS.seed },
      { reduced, z: PARAMS.z },
    );
  }, [reduced]);

  useEffect(() => {
    document.documentElement.dataset.reduced = String(reduced);
  }, [reduced]);

  // Keyboard: ← → and 1–5 move between sections, C crumples, E opens the top card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goTo(activeRef.current - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          goTo(activeRef.current + 1);
          break;
        case "c":
        case "C":
          doCrumple();
          break;
        case "e":
        case "E":
          window.dispatchEvent(new Event("study:expand"));
          break;
        default:
          if (/^[1-9]$/.test(e.key) && Number(e.key) <= SECTIONS.length) goTo(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, doCrumple]);

  // The "light" over the desk: pointer position → --lx / --ly, used by the name's cast shadow.
  useEffect(() => {
    let raf = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      raf = 0;
      const root = document.documentElement.style;
      root.setProperty("--lx", ((x / window.innerWidth) * 2 - 1).toFixed(3));
      root.setProperty("--ly", ((y / window.innerHeight) * 2 - 1).toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* filter used only while crumpling; see lib/paper.ts */}
      <svg className={styles.defs} width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="crumple" colorInterpolationFilters="sRGB">
          <feTurbulence ref={turbulence} type="turbulence" baseFrequency="0.0019 0.0031" numOctaves={2} seed={1} result="noise" />
          <feDisplacementMap ref={displacement} in="SourceGraphic" in2="noise" scale={0} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <Stage active={active} onActive={onActive} apiRef={apiRef} reduced={reduced} />
      <canvas ref={canvas} className={styles.creases} aria-hidden="true" />

      <Clock reduced={reduced} />
      <Rail active={active} onGo={goTo} reduced={reduced} />
      <Cursor reduced={reduced} />

      <button
        type="button"
        className={styles.crumple}
        onClick={doCrumple}
        aria-label="Crumple the page (C)"
        title="Crumple (C)"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M2 11 5.5 4 8 10 10.5 3 14 12" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </button>
    </>
  );
}
