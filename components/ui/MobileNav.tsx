"use client";

/**
 * MobileNav
 * ---------
 * Fixed bottom navigation bar, visible only below the `md` breakpoint —
 * gives the site a native-app feel for touch users instead of forcing them
 * to hunt for the desktop top nav. Tracks scroll position with an
 * IntersectionObserver to highlight the active section. Every tap target is
 * at least 44×44px (WCAG / iOS HIG minimum) and respects the device's
 * safe-area inset so it doesn't collide with the home indicator on iPhone.
 */

import { useEffect, useRef, useState } from "react";
import { Home, Radar, LayoutGrid, Mail } from "lucide-react";

const ITEMS = [
  { id: "home", label: "Home", href: "#home", Icon: Home },
  { id: "skills", label: "Skills", href: "#skills", Icon: Radar },
  { id: "projects", label: "Work", href: "#projects", Icon: LayoutGrid },
  { id: "contact", label: "Contact", href: "#contact", Icon: Mail },
] as const;

export default function MobileNav() {
  const [active, setActive] = useState<string>("home");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const sections = ITEMS.map((i) => document.getElementById(i.id)).filter(
      (el): el is HTMLElement => !!el
    );
    if (!sections.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Pick whichever observed section has the largest visible area right
        // now — more stable than "first intersecting" when sections are tall.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((s) => observerRef.current?.observe(s));
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <nav
      aria-label="Mobile section navigation"
      className="glass fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around border-t md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {ITEMS.map(({ id, label, href, Icon }) => {
        const isActive = active === id;
        return (
          <a
            key={id}
            href={href}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className="flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors"
          >
            <Icon
              className="h-5 w-5"
              style={{ color: isActive ? "var(--color-cyan)" : "var(--color-faint)" }}
              aria-hidden
            />
            <span
              className="font-mono text-[0.6rem] tracking-widest"
              style={{ color: isActive ? "var(--color-cyan)" : "var(--color-faint)" }}
            >
              {label.toUpperCase()}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
