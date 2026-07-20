"use client";

/**
 * MagneticButton
 * --------------
 * Pulls toward the pointer within its bounds, then springs back on leave.
 * Works as a link (href) or a button (onClick). Fully keyboard accessible.
 */

import { useRef, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "solid" | "ghost";
  strength?: number; // px of travel
  className?: string;
  ariaLabel?: string;
}

export default function MagneticButton({
  children,
  href,
  onClick,
  variant = "solid",
  strength = 22,
  className = "",
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    setPos({
      x: (relX / rect.width) * strength * 2,
      y: (relY / rect.height) * strength * 2,
    });
  };

  const reset = () => setPos({ x: 0, y: 0 });

  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium tracking-wide transition-colors";
  const styles =
    variant === "solid"
      ? "bg-cyan text-void hover:bg-emerald"
      : "glass text-ink hover:text-cyan";

  const inner = (
    <motion.div
      ref={ref}
      data-cursor="hover"
      onMouseMove={handleMove}
      onMouseLeave={reset}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 200, damping: 15, mass: 0.4 }}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </motion.div>
  );

  if (href) {
    return (
      <a href={href} aria-label={ariaLabel} className="inline-block">
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className="inline-block">
      {inner}
    </button>
  );
}
