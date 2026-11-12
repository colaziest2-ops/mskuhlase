"use client";

/**
 * Projects
 * --------
 * Selected work as an asymmetric bento grid. Each tile carries generated
 * "browser" art tinted with the project's hue (or a real screenshot if
 * `image` is set in lib/data.ts), a pointer-following spotlight, and opens a
 * drawer with the full case file — no page navigation.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { projects, type Project } from "@/lib/data";
import { EASE, trackSpotlight } from "@/lib/ui";
import { Reveal } from "@/components/ui/Card";
import ProjectArt from "@/components/ui/ProjectArt";
import ProjectDrawer from "@/components/ui/ProjectDrawer";

/** Column spans on the 6-col desktop grid, by position: 4+2 / 2+4 / 2+2+2. */
const SPANS = [4, 2, 2, 4, 2, 2, 2];
const spanClass: Record<number, string> = {
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  6: "lg:col-span-6",
};

function ProjectCard({
  project,
  span,
  index,
  onOpen,
}: {
  project: Project;
  span: number;
  index: number;
  onOpen: (trigger: HTMLElement) => void;
}) {
  const wide = span >= 4;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.07, ease: EASE }}
      whileHover={{ scale: 1.012 }}
      whileTap={{ scale: 0.995 }}
      onMouseMove={trackSpotlight}
      onClick={(e) => onOpen(e.currentTarget)}
      aria-haspopup="dialog"
      aria-label={`${project.name} — ${project.category}. Open project details`}
      style={{ "--spot": project.hue } as React.CSSProperties}
      className={`card group flex cursor-pointer flex-col p-3 text-left ${
        index === 0 ? "md:col-span-2" : ""
      } ${spanClass[span] ?? ""}`}
    >
      <ProjectArt project={project} tall={wide} />

      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <div className="flex items-start justify-between gap-4">
          <p className="eyebrow">{project.category}</p>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline text-faint transition-all duration-300 group-hover:rotate-45 group-hover:border-faint group-hover:text-ink">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        <h3 className={`mt-1 font-semibold ${wide ? "text-3xl" : "text-2xl"}`}>{project.name}</h3>
        <p className={`mt-2 text-sm leading-relaxed text-muted ${wide ? "max-w-xl" : ""}`}>
          {project.tagline}
        </p>

        <ul className="mt-auto flex flex-wrap gap-1.5 pt-5">
          {project.stack.slice(0, wide ? 5 : 3).map((s) => (
            <li key={s} className="pill">
              {s}
            </li>
          ))}
        </ul>
      </div>
    </motion.button>
  );
}

export default function Projects() {
  const [open, setOpen] = useState<{ project: Project; trigger: HTMLElement } | null>(null);

  return (
    <section id="projects" className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Reveal className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">Selected work</p>
          <h2 className="text-4xl font-semibold leading-[1.02] tracking-tighter sm:text-6xl">
            {projects.length} platforms, <span className="text-gradient">all live.</span>
          </h2>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-muted">
          Real businesses, real traffic. Open any project for what it does, what it runs on, and
          a link to the live site.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        {projects.map((p, i) => (
          <ProjectCard
            key={p.id}
            project={p}
            index={i}
            span={SPANS[i] ?? 2}
            onOpen={(trigger) => setOpen({ project: p, trigger })}
          />
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <ProjectDrawer
            key={open.project.id}
            project={open.project}
            onClose={() => {
              open.trigger.focus({ preventScroll: true });
              setOpen(null);
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
