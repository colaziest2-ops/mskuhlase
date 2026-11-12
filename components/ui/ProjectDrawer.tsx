"use client";

/**
 * ProjectDrawer
 * -------------
 * Case file for one project. Slides in from the right on desktop and rises
 * as a sheet on phones. Locks page scroll, traps focus, closes on Escape or
 * backdrop click. Where the site allows framing, shows a live preview scaled
 * down from a desktop viewport.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Github, Link2, X } from "lucide-react";
import type { Project } from "@/lib/data";
import { lockScroll, unlockScroll, useCopy } from "@/lib/ui";
import ProjectArt from "@/components/ui/ProjectArt";

const PREVIEW_W = 1280;
const PREVIEW_H = 800;

/** The live site rendered at desktop width, scaled to fit the drawer. */
function LivePreview({ project }: { project: Project }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / PREVIEW_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-void">
      <div className="flex items-center gap-1.5 border-b border-hairline bg-panel/70 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-hairline" />
        <span className="h-2 w-2 rounded-full bg-hairline" />
        <span className="h-2 w-2 rounded-full bg-hairline" />
        <span className="ml-2 truncate font-mono text-[0.62rem] text-faint">{project.domain}</span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-faint">
          <span className="status-dot" /> Live
        </span>
      </div>
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden"
        style={{ height: scale ? PREVIEW_H * scale : undefined, aspectRatio: scale ? undefined : `${PREVIEW_W} / ${PREVIEW_H}` }}
      >
        {scale > 0 && (
          <iframe
            src={project.url}
            title={`${project.name} live preview`}
            loading="lazy"
            tabIndex={-1}
            sandbox="allow-scripts allow-same-origin"
            className="absolute left-0 top-0 origin-top-left border-0"
            style={{ width: PREVIEW_W, height: PREVIEW_H, transform: `scale(${scale})` }}
          />
        )}
      </div>
    </div>
  );
}

export default function ProjectDrawer({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copied, copy] = useCopy();
  // Only ever mounted client-side (after a click), so reading the viewport here is safe.
  const [sheet] = useState(() => window.matchMedia("(max-width: 639px)").matches);

  useEffect(() => {
    lockScroll();
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
    };
    // onClose identity changes per render; the listener only needs the latest on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hidden = sheet ? { y: "100%" } : { x: "100%" };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end sm:items-stretch">
      <motion.div
        aria-hidden
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-drawer-title"
        data-lenis-prevent
        initial={hidden}
        animate={{ x: 0, y: 0 }}
        exit={hidden}
        transition={{ type: "spring", stiffness: 300, damping: 34, mass: 0.9 }}
        style={{ "--spot": project.hue } as React.CSSProperties}
        className="relative flex max-h-[92svh] w-full flex-col overflow-y-auto rounded-t-3xl border border-hairline bg-panel shadow-2xl sm:max-h-none sm:max-w-2xl sm:rounded-none sm:border-y-0 sm:border-r-0"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-hairline bg-panel/85 px-6 py-5 backdrop-blur-md sm:px-8">
          <div className="min-w-0">
            <p className="eyebrow">{project.category}</p>
            <h3 id="project-drawer-title" className="mt-1 truncate text-3xl font-semibold">
              {project.name}
            </h3>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close project details"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-faint hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-8 px-6 py-6 sm:px-8 sm:py-8">
          {project.embed ? (
            <LivePreview project={project} />
          ) : (
            <div className="group">
              <ProjectArt project={project} tall />
              <p className="mt-2 font-mono text-[0.65rem] text-faint">
                This site blocks embedding for security — open it in a new tab for the live view.
              </p>
            </div>
          )}

          <p className="text-pretty text-base leading-relaxed text-muted">{project.summary}</p>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline text-sm">
            {[
              ["Sector", project.sector],
              ["Type", project.category],
              ["Domain", project.domain],
              ["Status", "Live in production"],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0 bg-panel px-4 py-3">
                <dt className="eyebrow !text-[0.6rem]">{k}</dt>
                <dd className="mt-1 truncate text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <p className="eyebrow mb-3">What it does</p>
            <ul className="flex flex-col gap-2.5">
              {project.highlights.map((h) => (
                <li key={h} className="flex gap-3 text-sm leading-relaxed text-muted">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: `color-mix(in srgb, ${project.hue} 70%, var(--color-muted))` }}
                  />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">Built with</p>
            <ul className="flex flex-wrap gap-1.5">
              {project.stack.map((s) => (
                <li key={s} className="pill">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sticky actions */}
        <div className="sticky bottom-0 z-20 mt-auto flex flex-wrap gap-2 border-t border-hairline bg-panel/85 px-6 py-4 backdrop-blur-md sm:px-8">
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-void transition-colors hover:bg-ink/90"
          >
            Visit live site
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          {project.repo && (
            <a
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-hairline px-5 text-sm text-ink transition-colors hover:border-faint"
            >
              <Github className="h-4 w-4" /> Source
            </a>
          )}
          <button
            type="button"
            onClick={() => copy(project.url)}
            aria-label="Copy link to live site"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-hairline px-5 text-sm text-ink transition-colors hover:border-faint"
          >
            {copied ? <Check className="h-4 w-4 text-emerald" /> : <Link2 className="h-4 w-4 text-faint" />}
            <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
