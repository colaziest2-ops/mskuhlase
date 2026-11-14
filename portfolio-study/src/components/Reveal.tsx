import type { CSSProperties, ElementType, ReactNode } from "react";
import { useInView } from "../lib/scroll";
import styles from "./Reveal.module.css";

/**
 * How a block arrives as it scrolls into view. Each section uses different ones
 * so the page doesn't feel like one effect on repeat.
 *   rise  – lifts up      drop – settles down    left / right – slides in
 *   pop   – scales up     blur – focuses in      wipe – unmasks left to right
 *   tilt  – flips up from the floor like a card
 */
export type RevealVariant = "rise" | "drop" | "left" | "right" | "pop" | "blur" | "wipe" | "tilt";

interface RevealProps {
  readonly variant?: RevealVariant;
  /** ms, before the transition starts */
  readonly delay?: number;
  readonly as?: ElementType;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly threshold?: number;
  readonly children?: ReactNode;
}

export function Reveal({
  variant = "rise",
  delay = 0,
  as: Tag = "div",
  className = "",
  style,
  threshold = 0.18,
  children,
}: RevealProps) {
  const [ref, seen] = useInView<HTMLElement>({ threshold });
  return (
    <Tag
      ref={ref}
      className={`${styles.r} ${styles[variant]} ${className}`}
      data-in={seen}
      style={{ ...style, "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
