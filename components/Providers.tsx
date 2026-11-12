"use client";

import { MotionConfig } from "framer-motion";
import SmoothScroll from "@/components/SmoothScroll";

/** Client-side providers: honours the OS reduced-motion setting for every
 * Framer Motion animation, and wraps the tree in Lenis smooth scrolling. */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll>{children}</SmoothScroll>
    </MotionConfig>
  );
}
