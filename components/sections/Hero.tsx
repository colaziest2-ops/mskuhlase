"use client";

/**
 * Hero
 * ----
 * Full-viewport opener: the 3D node network sits behind a GSAP-driven kinetic
 * headline reveal, a live "all nodes operational" telemetry badge, and a
 * magnetic CTA. This is the thesis of the page — the distributed-systems world
 * stated visually before a word is read.
 */

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ArrowDown } from "lucide-react";
import MagneticButton from "@/components/ui/MagneticButton";
import { profile } from "@/lib/data";

// The 3D canvas is client-only and heavy — load it lazily so it never blocks
// first paint or the server render.
const NodeBackground = dynamic(() => import("@/components/canvas/NodeBackground"), {
  ssr: false,
});

const HEADLINE = ["Full-Stack Developer,", "Grounded in Networks."];

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);

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

      {/* Status badge — concrete, not decorative */}
      <div className="hero-badge glass mb-10 flex items-center gap-3 rounded-full px-5 py-2">
        <span className="status-dot" />
        <span className="font-mono text-[0.7rem] tracking-[0.2em] text-muted">
          NETWORK STATUS: ONLINE
        </span>
        <span className="h-3 w-px bg-hairline" />
        <span className="font-mono text-[0.7rem] tracking-[0.2em] text-cyan">
          DURBAN, SOUTH AFRICA
        </span>
      </div>

      {/* Kinetic headline — each line clips its span for the reveal */}
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
        {profile.role} at AxxonSoft with a background in network engineering
        and security systems — I build the app and web layer, and I
        understand the infrastructure it has to run on.
      </p>

      <div className="hero-cta mt-10 flex flex-wrap items-center justify-center gap-4">
        <MagneticButton href="#projects" ariaLabel="Explore projects">
          Explore Projects
        </MagneticButton>
        <MagneticButton href="#contact" variant="ghost" ariaLabel="Get in touch">
          Get in Touch
        </MagneticButton>
      </div>

      {/* Scroll cue */}
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
