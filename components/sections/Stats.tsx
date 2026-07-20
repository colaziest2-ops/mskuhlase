"use client";

/**
 * Stats
 * -----
 * A GSAP counter strip that animates from 0 to each value when it scrolls into
 * view (ScrollTrigger). Numbers respect decimal precision + prefix/suffix.
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { stats } from "@/lib/data";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Stats() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const nums = gsap.utils.toArray<HTMLElement>(".stat-value");
      nums.forEach((el) => {
        const target = parseFloat(el.dataset.value || "0");
        const decimals = parseInt(el.dataset.decimals || "0", 10);
        const prefix = el.dataset.prefix || "";
        const suffix = el.dataset.suffix || "";
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 2,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
          onUpdate: () => {
            el.textContent = `${prefix}${obj.v.toFixed(decimals)}${suffix}`;
          },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative border-y border-hairline bg-panel/30">
      <div
        ref={rootRef}
        className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-3"
      >
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p
              className="stat-value font-display text-4xl font-bold tracking-tight text-cyan sm:text-6xl"
              data-value={s.value}
              data-decimals={s.decimals}
              data-prefix={"prefix" in s ? (s as { prefix?: string }).prefix : ""}
              data-suffix={s.suffix}
            >
              {"prefix" in s ? (s as { prefix?: string }).prefix : ""}0{s.suffix}
            </p>
            <p className="mt-2 font-mono text-[0.7rem] tracking-[0.2em] text-muted">
              {s.label.toUpperCase()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
