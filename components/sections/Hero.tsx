"use client";

/**
 * Hero
 * ----
 * Full-viewport opener: the 3D network topology sits behind a GSAP kinetic
 * headline reveal, a rotating status badge (part real, part just for fun —
 * that's on purpose, it's the first "human, not corporate" signal on the
 * page), a live Durban clock, and a magnetic CTA.
 */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ArrowDown } from "lucide-react";
import MagneticButton from "@/components/ui/MagneticButton";
import { profile, statusMessages } from "@/lib/data";

const NodeBackground = dynamic(() => import("@/components/canvas/NodeBackground"), {
  ssr: false,
});

const HEADLINE = ["Full-Stack Developer,", "Grounded in Networks."];

/** Rotates through statusMessages every few seconds — real status mixed with
 * a bit of personality, so the badge doesn't read like a corporate uptime
 * widget nobody actually wrote. */
function useRotatingStatus(intervalMs = 3400) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % statusMessages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return statusMessages[index];
}

/** Live clock, Durban time — small proof the site is actually alive. */
function useLiveClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const tick = () => {
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: profile.timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date())
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const status = useRotatingStatus();
  const time = useLiveClock();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".hero-badge", { y: 20, opacity: 0, duration: 0.8 })
        .from(
          ".hero-line span",
          { yPercent: 120, opacity: 0, duration: 1.1, stagger: 0.12 },
          "-=0.4"
        )
        .from(".hero-sub", { y: 20, opacity: 0, duration: 0.8 }, "-=0.6")
        .from(".hero-cta", { y: 20, opacity: 0, duration: 0.8 }, "-=0.5")
        .from(".hero-scroll", { opacity: 0, duration: 1 }, "-=0.3");
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="home"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
    >
      <NodeBackground />

      {/* Status badge — rotates between a genuine status and a bit of tone.
          Fades the text on each swap rather than snapping, so it doesn't
          look like a bug. */}
      <div className="hero-badge glass mb-10 flex items-center gap-3 rounded-full px-5 py-2">
        <span className="status-dot" />
        <span
          key={status}
          className="font-mono text-[0.7rem] tracking-[0.2em] text-muted"
          style={{ animation: "fade-in 0.4s ease-out" }}
        >
          {status}
        </span>
        <span className="h-3 w-px bg-hairline" />
        <span className="font-mono text-[0.7rem] tracking-[0.2em] text-cyan">
          {time} SAST
        </span>
      </div>

      {/* Kinetic headline */}
      <h1 className="text-center font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
        {HEADLINE.map((line, i) => (
          <span key={i} className="hero-line block overflow-hidden py-1">
            <span className={`inline-block ${i === 1 ? "neon-cyan" : ""}`}>
              {line}
            </span>
          </span>
        ))}
      </h1>

      <p className="hero-sub mt-8 max-w-xl text-center text-base leading-relaxed text-muted sm:text-lg">
        {profile.summary}
      </p>

      <div className="hero-cta mt-10 flex flex-wrap items-center justify-center gap-4">
        <MagneticButton href="#projects" ariaLabel="Explore projects">
          Explore Projects
        </MagneticButton>
        <MagneticButton href="#contact" variant="ghost" ariaLabel="Get in touch">
          Get in Touch
        </MagneticButton>
      </div>

      <a
        href="#skills"
        className="hero-scroll absolute bottom-8 flex flex-col items-center gap-2 text-faint transition-colors hover:text-cyan"
        data-cursor="hover"
        aria-label="Scroll to skills"
      >
        <span className="font-mono text-[0.65rem] tracking-[0.3em]">SCROLL</span>
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </a>
    </section>
  );
}
