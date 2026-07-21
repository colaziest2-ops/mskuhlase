"use client";

/**
 * SkillMatrix
 * -----------
 * Interactive radar of the 2027 skill clusters. Hovering a cluster in the list
 * highlights its vertex on the SVG radar and reveals its underlying skills.
 * The radar polygon is derived from each cluster's `level` — real data, not
 * decoration. Reveals on scroll via Framer Motion.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { skillClusters } from "@/lib/data";

const accentHex: Record<string, string> = {
  cyan: "#f2a93b",
  emerald: "#6fae8f",
  violet: "#948bc4",
};

// Radar geometry helpers -----------------------------------------------------
const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 120;
const N = skillClusters.length;

function vertex(index: number, value: number) {
  const angle = (Math.PI * 2 * index) / N - Math.PI / 2;
  const r = (value / 100) * RADIUS;
  return {
    x: CENTER + Math.cos(angle) * r,
    y: CENTER + Math.sin(angle) * r,
  };
}

export default function SkillMatrix() {
  const [active, setActive] = useState<string | null>(null);

  const polygon = skillClusters
    .map((c, i) => {
      const v = vertex(i, c.level);
      return `${v.x},${v.y}`;
    })
    .join(" ");

  return (
    <section id="skills" className="relative mx-auto max-w-6xl px-6 py-28">
      <header className="mb-16 max-w-2xl">
        <p className="eyebrow mb-3">02 — Capability Map</p>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
          {skillClusters.length === 4 ? "Four" : skillClusters.length === 3 ? "Three" : skillClusters.length} disciplines,
          <br />
          <span className="neon-cyan">one working stack.</span>
        </h2>
      </header>

      <div className="grid items-center gap-12 lg:grid-cols-2">
        {/* Radar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="hidden justify-center md:flex"
        >
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="h-[320px] w-[320px]"
            role="img"
            aria-label="Radar chart of skill cluster proficiency"
          >
            {/* concentric rings */}
            {[0.25, 0.5, 0.75, 1].map((s) => (
              <circle
                key={s}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS * s}
                fill="none"
                stroke="#1e1e2e"
                strokeWidth={1}
              />
            ))}
            {/* spokes */}
            {skillClusters.map((_, i) => {
              const v = vertex(i, 100);
              return (
                <line
                  key={i}
                  x1={CENTER}
                  y1={CENTER}
                  x2={v.x}
                  y2={v.y}
                  stroke="#1e1e2e"
                  strokeWidth={1}
                />
              );
            })}
            {/* data polygon */}
            <motion.polygon
              points={polygon}
              fill="rgba(34,211,238,0.12)"
              stroke="#22d3ee"
              strokeWidth={1.5}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
            />
            {/* vertices */}
            {skillClusters.map((c, i) => {
              const v = vertex(i, c.level);
              const on = active === c.id;
              return (
                <circle
                  key={c.id}
                  cx={v.x}
                  cy={v.y}
                  r={on ? 7 : 4}
                  fill={accentHex[c.accent]}
                  style={{
                    filter: on
                      ? `drop-shadow(0 0 8px ${accentHex[c.accent]})`
                      : "none",
                    transition: "r 0.2s, filter 0.2s",
                  }}
                />
              );
            })}
          </svg>
        </motion.div>

        {/* Cluster list */}
        <ul className="flex flex-col gap-2">
          {skillClusters.map((c, i) => {
            const on = active === c.id;
            return (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                onMouseEnter={() => setActive(c.id)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(on ? null : c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive(on ? null : c.id);
                  }
                }}
                data-cursor="hover"
                className="glass rounded-xl p-4 transition-colors"
                style={{
                  borderColor: on ? accentHex[c.accent] : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-ink">
                    {c.title}
                  </h3>
                  <span
                    className="font-mono text-xs"
                    style={{ color: accentHex[c.accent] }}
                  >
                    {c.level}%
                  </span>
                </div>
                <div
                  className="grid transition-all duration-300"
                  style={{
                    gridTemplateRows: on ? "1fr" : "0fr",
                    opacity: on ? 1 : 0,
                  }}
                >
                  <div className="overflow-hidden">
                    <p className="pt-3 text-sm leading-relaxed text-muted">
                      {c.story}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-3">
                      {c.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-hairline px-3 py-1 font-mono text-[0.7rem] text-muted"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
