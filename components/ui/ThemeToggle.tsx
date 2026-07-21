"use client";

/**
 * ThemeToggle
 * -----------
 * Switches the whole site between the default dark "Signal Room" theme and a
 * light variant, by setting `data-theme="light"` on <html> — every color
 * token in globals.css is redefined under that selector, so this one
 * attribute flip re-themes the entire site with no per-component changes.
 * Choice persists in localStorage (this is a real deployed site, not a
 * sandboxed artifact, so localStorage is fine here).
 */

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial = saved === "light" ? "light" : "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  // Avoid a flash of the wrong icon before we've read localStorage.
  if (!mounted) {
    return <div className="h-11 w-11" aria-hidden />;
  }

  return (
    <button
      onClick={toggle}
      data-cursor="hover"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:text-cyan"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
