"use client";

/**
 * Stack
 * -----
 * About + capabilities as one bento: a wide bio tile with headline numbers,
 * a live local-time tile, then one tile per discipline with its tools.
 */

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { Database, LayoutTemplate, MapPin, Server, type LucideIcon } from "lucide-react";
import { profile, skillClusters, stats, type SkillCluster } from "@/lib/data";
import { useClock } from "@/lib/ui";
import { Card, Reveal } from "@/components/ui/Card";

const ICONS: Record<SkillCluster["id"], LucideIcon> = {
  frontend: LayoutTemplate,
  backend: Database,
  "vms-ops": Server,
};

/** Counts up from 0 the first time it scrolls into view. */
function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

export default function Stack() {
  const time = useClock(profile.timezone, true);

  return (
    <section id="skills" className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Reveal className="mb-12 max-w-3xl">
        <p className="eyebrow mb-4">Stack &amp; background</p>
        <h2 className="text-4xl font-semibold leading-[1.02] tracking-tighter sm:text-6xl">
          Interface to <span className="text-gradient">server room.</span>
        </h2>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* Bio + numbers */}
        <Card className="flex flex-col justify-between gap-10 p-7 sm:p-9 md:col-span-2 lg:col-span-4">
          <div>
            <p className="eyebrow mb-4">About</p>
            <p className="text-pretty text-lg leading-relaxed text-ink/90 sm:text-xl sm:leading-relaxed">
              {profile.summary}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 border-t border-hairline pt-7">
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="font-display text-4xl font-semibold tracking-tighter sm:text-5xl">
                  <CountUp value={s.value} suffix={s.suffix} />
                </dd>
                <dt className="mt-2 text-xs leading-snug text-faint sm:text-sm">{s.label}</dt>
              </div>
            ))}
          </dl>
        </Card>

        {/* Local time */}
        <Card
          delay={0.07}
          className="flex min-h-56 flex-col justify-between p-7 sm:p-9 md:col-span-2 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <p className="eyebrow">Local time</p>
            <span className="status-dot" />
          </div>
          <div>
            <p className="font-display text-5xl font-semibold tabular-nums tracking-tighter sm:text-6xl lg:text-5xl xl:text-6xl">
              {time}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="h-3.5 w-3.5 text-faint" />
              {profile.location} · GMT+2
            </p>
            <p className="mt-4 text-sm leading-relaxed text-faint">{profile.role}</p>
          </div>
        </Card>

        {/* One tile per discipline */}
        {skillClusters.map((c, i) => {
          const Icon = ICONS[c.id];
          return (
            <Card
              key={c.id}
              delay={i * 0.07}
              className={`flex flex-col p-7 lg:col-span-2 ${
                i === skillClusters.length - 1 ? "md:col-span-2" : ""
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-raised text-accent">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <h3 className="mt-6 text-xl font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.story}</p>
              <ul className="mt-auto flex flex-wrap gap-1.5 pt-6">
                {c.skills.map((s) => (
                  <li key={s} className="pill">
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
