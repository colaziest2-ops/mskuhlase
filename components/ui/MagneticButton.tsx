"use client";

/**
 * MagneticButton
 * --------------
 * Leans toward the pointer while hovered and springs back on leave. Driven by
 * motion values, so tracking the mouse never re-renders React. Renders an <a>
 * when given href, otherwise a <button>.
 */

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface Props {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "solid" | "ghost";
  /** Max px of travel toward the pointer. */
  strength?: number;
  className?: string;
  ariaLabel?: string;
  external?: boolean;
}

const SPRING = { stiffness: 220, damping: 16, mass: 0.4 };

export default function MagneticButton({
  children,
  href,
  onClick,
  variant = "solid",
  strength = 14,
  className = "",
  ariaLabel,
  external = false,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const x = useSpring(useMotionValue(0), SPRING);
  const y = useSpring(useMotionValue(0), SPRING);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
    y.set(((e.clientY - r.top) / r.height - 0.5) * strength * 2);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const cls =
    "group relative inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition-colors " +
    (variant === "solid"
      ? "bg-ink text-void shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_-8px_color-mix(in_srgb,var(--color-accent)_55%,transparent)] hover:bg-ink/90 "
      : "glass text-ink hover:border-faint ") +
    className;

  const shared = {
    onMouseMove: onMove,
    onMouseLeave: reset,
    style: { x, y },
    whileTap: { scale: 0.97 },
    className: cls,
    "aria-label": ariaLabel,
  };

  if (href) {
    return (
      <motion.a
        ref={(el) => void (ref.current = el)}
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...shared}
      >
        {children}
      </motion.a>
    );
  }
  return (
    <motion.button
      ref={(el) => void (ref.current = el)}
      type="button"
      onClick={onClick}
      {...shared}
    >
      {children}
    </motion.button>
  );
}
