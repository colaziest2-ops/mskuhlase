"use client";

/**
 * Projects
 * --------
 * Filterable gallery of 6 featured builds. Each card does a pointer-driven 3D
 * tilt (parallax) and opens a full-screen drawer with a live iframe preview,
 * the engineering focus, and performance stats.
 */

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ExternalLink, Gauge, Timer, X } from "lucide-react";
import { projects, type Project } from "@/lib/data";

const accentHex: Record<string, string> = {
  cyan: "#22d3ee",
  emerald: "#34d399",
  violet: "#a78bfa",
};

// Build a unique, stable list of filter categories.
const FILTERS = ["All", ...Array.from(new Set(projects.map((p) => p.category)))];

/* --- Individual tilt card -------------------------------------------------- */
function TiltCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setT({ rx: py * -10, ry: px * 12 });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1000 }}
    >
      <button
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={() => setT({ rx: 0, ry: 0 })}
        onClick={onOpen}
        data-cursor="hover"
        aria-label={`Open case study for ${project.name}`}
        className="group glass block w-full rounded-2xl p-6 text-left transition-shadow"
        style={{
          transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.15s ease-out",
          boxShadow: `0 0 0 1px transparent`,
        }}
      >
        <div className="flex items-start justify-between" style={{ transform: "translateZ(40px)" }}>
          <span
            className="font-mono text-[0.68rem] tracking-widest"
            style={{ color: accentHex[project.accent] }}
          >
            {project.category}
          </span>
          <ArrowUpRight className="h-5 w-5 text-faint transition-colors group-hover:text-cyan" />
        </div>

        <h3
          className="mt-4 font-display text-2xl font-bold tracking-tight"
          style={{ transform: "translateZ(30px)" }}
        >
          {project.name}
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-muted" style={{ transform: "translateZ(20px)" }}>
          {project.focus}
        </p>

        <div className="mt-5 flex flex-wrap gap-2" style={{ transform: "translateZ(15px)" }}>
          {project.stack.map((s) => (
            <span
              key={s}
              className="rounded-full border border-hairline px-2.5 py-1 font-mono text-[0.65rem] text-muted"
            >
              {s}
            </span>
          ))}
        </div>
      </button>
    </motion.div>
  );
}

/* --- Full-screen case-study drawer ---------------------------------------- */
function Drawer({ project, onClose }: { project: Project; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${project.name} case study`}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="glass relative z-10 m-4 grid max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl lg:grid-cols-[1.2fr_1fr]"
      >
        {/* Live preview */}
        <div className="relative min-h-[240px] border-b border-hairline bg-void lg:border-b-0 lg:border-r">
          <iframe
            src={project.url}
            title={`${project.name} live preview`}
            className="h-full min-h-[240px] w-full"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
          />
          <span
            className="absolute left-3 top-3 rounded-full px-3 py-1 font-mono text-[0.6rem] tracking-widest text-void"
            style={{ background: accentHex[project.accent] }}
          >
            ● LIVE PREVIEW
          </span>
        </div>

        {/* Detail */}
        <div className="flex flex-col gap-6 overflow-y-auto p-8">
          <div className="flex items-start justify-between">
            <div>
              <p
                className="font-mono text-[0.68rem] tracking-widest"
                style={{ color: accentHex[project.accent] }}
              >
                {project.category}
              </p>
              <h3 className="mt-2 font-display text-3xl font-bold">{project.name}</h3>
            </div>
            <button
              onClick={onClose}
              data-cursor="hover"
              aria-label="Close case study"
              className="rounded-full border border-hairline p-2 text-muted transition-colors hover:text-cyan"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div>
            <p className="eyebrow mb-2">Architectural Focus</p>
            <p className="text-sm leading-relaxed text-muted">{project.focus}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-xl p-4">
              <Gauge className="mb-2 h-4 w-4 text-emerald" />
              <p className="font-display text-2xl font-bold text-emerald">
                {project.lighthouse}
              </p>
              <p className="font-mono text-[0.6rem] tracking-widest text-faint">
                LIGHTHOUSE
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <Timer className="mb-2 h-4 w-4 text-cyan" />
              <p className="font-display text-2xl font-bold text-cyan">
                {project.loadMs}ms
              </p>
              <p className="font-mono text-[0.6rem] tracking-widest text-faint">
                LOAD TIME
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {project.stack.map((s) => (
              <span
                key={s}
                className="rounded-full border border-hairline px-3 py-1 font-mono text-[0.7rem] text-muted"
              >
                {s}
              </span>
            ))}
          </div>

          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="hover"
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-cyan px-6 py-3 text-sm font-medium text-void transition-colors hover:bg-emerald"
          >
            Visit live site <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* --- Section -------------------------------------------------------------- */
export default function Projects() {
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState<Project | null>(null);

  const shown = useMemo(
    () => (filter === "All" ? projects : projects.filter((p) => p.category === filter)),
    [filter]
  );

  return (
    <section id="projects" className="relative mx-auto max-w-6xl px-6 py-28">
      <header className="mb-10 max-w-2xl">
        <p className="eyebrow mb-3">03 — Selected Work</p>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
          Systems shipped to <span className="neon-cyan">production.</span>
        </h2>
      </header>

      {/* Filters */}
      <div className="mb-10 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            data-cursor="hover"
            className={`rounded-full border px-4 py-2 font-mono text-[0.7rem] tracking-wide transition-colors ${
              filter === f
                ? "border-cyan bg-cyan/10 text-cyan"
                : "border-hairline text-muted hover:text-ink"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((p) => (
            <TiltCard key={p.id} project={p} onOpen={() => setOpen(p)} />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Drawer */}
      <AnimatePresence>
        {open && <Drawer project={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </section>
  );
}
