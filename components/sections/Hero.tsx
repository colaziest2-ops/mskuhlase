"use client";

/**
 * Hero
 * ----
 * Minimal opener: live status badge, one large statement, two CTAs, then a
 * slow marquee of the working stack. Everything enters on a single staggered
 * fade-and-rise so the page settles in rather than popping.
 */

import { motion, type Variants } from "framer-motion";
import { ArrowDown, Check, Copy, FileText } from "lucide-react";
import MagneticButton from "@/components/ui/MagneticButton";
import { profile, projects, skillClusters } from "@/lib/data";
import { EASE, useClock, useCopy } from "@/lib/ui";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const MARQUEE = skillClusters.flatMap((c) => c.skills);
const city = profile.location.split(",")[0];

export default function Hero() {
  const time = useClock(profile.timezone);
  const [copied, copy] = useCopy();

  return (
    <section id="home" className="relative overflow-hidden">
      <div aria-hidden className="grid-fade pointer-events-none absolute inset-0 -z-10" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-center px-6 pb-24 pt-36 text-center"
      >
        {/* Status badge */}
        <motion.div
          variants={item}
          className="glass flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full px-4 py-2 text-xs text-muted"
        >
          {profile.status && (
            <>
              <span className="flex items-center gap-2.5">
                <span className="status-dot" />
                {profile.status}
              </span>
              <span aria-hidden className="hidden h-3 w-px bg-hairline sm:block" />
            </>
          )}
          <span className="font-mono text-[0.7rem] text-faint">
            {city} · <span className="tabular-nums">{time}</span> SAST
          </span>
        </motion.div>

        {/* Statement */}
        <motion.h1
          variants={item}
          className="mt-8 max-w-5xl text-balance text-[2.75rem] font-semibold leading-[0.98] tracking-tighter sm:text-7xl lg:text-[5.75rem]"
        >
          Web platforms that <span className="text-gradient">hold up in production.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg"
        >
          I&apos;m {profile.name}, a full-stack engineer in {city}. {projects.length} live
          platforms across aviation, e-commerce, engineering and on-demand services — built by
          someone who also keeps video management systems running across mine sites.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={item}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <MagneticButton href="#projects">
            Explore Work
            <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          </MagneticButton>
          <MagneticButton
            variant="ghost"
            onClick={() => copy(profile.email)}
            ariaLabel={`Copy email address ${profile.email}`}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald" />
            ) : (
              <Copy className="h-4 w-4 text-faint" />
            )}
            <span aria-live="polite">{copied ? "Email copied" : "Copy Email"}</span>
          </MagneticButton>
          {profile.resumeUrl && (
            <MagneticButton variant="ghost" href={profile.resumeUrl} external>
              <FileText className="h-4 w-4 text-faint" />
              Resume
            </MagneticButton>
          )}
        </motion.div>

        {/* Stack marquee — list is doubled so the -50% loop is seamless */}
        <motion.div
          variants={item}
          className="mt-20 w-full max-w-4xl overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]"
        >
          <ul className="flex w-max animate-marquee gap-10 hover:[animation-play-state:paused]">
            {[...MARQUEE, ...MARQUEE].map((skill, i) => (
              <li
                key={i}
                aria-hidden={i >= MARQUEE.length}
                className="flex items-center gap-10 whitespace-nowrap font-mono text-xs text-faint"
              >
                {skill}
                <span aria-hidden className="h-1 w-1 rounded-full bg-hairline" />
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </section>
  );
}
