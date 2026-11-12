"use client";

/**
 * Card / Reveal
 * -------------
 * Card: a bento tile — hairline border, glass surface, pointer-following
 * spotlight (CSS in globals.css `.card`) — that fades up as it scrolls in.
 * Reveal: the same entrance on a plain wrapper, for headings and copy.
 */

import { motion } from "framer-motion";
import { EASE, trackSpotlight } from "@/lib/ui";

const enter = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, delay, ease: EASE },
});

export function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div {...enter(delay)} onMouseMove={trackSpotlight} className={`card ${className}`}>
      {children}
    </motion.div>
  );
}

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div {...enter(delay)} className={className}>
      {children}
    </motion.div>
  );
}
