import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { Project } from "../content";
import styles from "./DetailSheet.module.css";

interface DetailSheetProps {
  readonly project: Project;
  readonly index: number;
  readonly total: number;
  /** The paper grain, shared with the cards so the sheet reads as the same stock. */
  readonly grain: string;
  readonly onClose: () => void;
}

const EXIT_MS = 340;
const DISMISS_PX = 110;

/**
 * The project's case file on phones. It comes up from the bottom like a native
 * sheet: grab handle, a header that stays put, content that scrolls with a fade
 * cue at the foot, and a full-width Visit button. Close it with the ✕, by
 * tapping outside, by pulling the handle down, or with Esc.
 */
export function DetailSheet({ project, index, total, grain, onClose }: DetailSheetProps) {
  const [shown, setShown] = useState(false); // drives the slide in / out
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ y0: number; dy: number } | null>(null);
  const closing = useRef(false);
  const timer = useRef(0);

  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    timer.current = window.setTimeout(onClose, EXIT_MS); // let it slide away before unmounting
  }, [onClose]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true)); // next frame, so the transition actually runs
    document.documentElement.classList.add("sheet-open");
    closeButton.current?.focus({ preventScroll: true });

    // modal: the page behind can't take focus or be reached by screen readers while the sheet is up
    const app = document.getElementById("root");
    app?.setAttribute("inert", "");

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer.current);
      document.documentElement.classList.remove("sheet-open");
      app?.removeAttribute("inert");
      window.removeEventListener("keydown", onKey);
    };
  }, [dismiss]);

  const onGrabDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.target instanceof Element && e.target.closest("button")) return;
    drag.current = { y0: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (panel.current) panel.current.style.transition = "none";
  };

  const onGrabMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !panel.current) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    panel.current.style.transform = `translateY(${d.dy}px)`;
  };

  const onGrabUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !panel.current) return;
    panel.current.style.transition = "";
    panel.current.style.transform = "";
    if (d.dy > DISMISS_PX) dismiss();
  };

  const n = String(index + 1).padStart(2, "0");

  return createPortal(
    <div
      className={styles.root}
      data-shown={shown}
      style={{ "--ac": project.ac, "--grain": grain } as CSSProperties}
    >
      <div className={styles.backdrop} onClick={dismiss} aria-hidden="true" />

      <div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div
          className={styles.grab}
          onPointerDown={onGrabDown}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabUp}
          onPointerCancel={onGrabUp}
        >
          <i className={styles.handle} aria-hidden="true" />
          <div className={styles.head}>
            <div className={styles.titles}>
              <p className={styles.eyebrow}>
                <span>{n}</span> / {String(total).padStart(2, "0")} · {project.category}
              </p>
              <h3 id="sheet-title" className={styles.title}>
                {project.name}
              </h3>
            </div>
            <button
              ref={closeButton}
              type="button"
              className={styles.close}
              onClick={dismiss}
              aria-label="Close project details"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.scroll} data-scroll-inner="">
          <p className={styles.sector}>
            {project.sector} · {project.domain}
          </p>
          <p className={styles.summary}>{project.summary}</p>
          <p className={styles.note}>
            <span>operational note</span>
            {project.note}
          </p>
          <ul className={styles.highlights}>
            {project.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <ul className={styles.tags}>
            {project.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        <div className={styles.foot}>
          <a className={styles.visit} href={project.url} target="_blank" rel="noopener noreferrer">
            Visit live site ↗
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
