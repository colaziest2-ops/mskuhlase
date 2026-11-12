import Hero from "@/components/sections/Hero";
import Projects from "@/components/sections/Projects";
import Stack from "@/components/sections/Stack";
import Terminal from "@/components/ui/Terminal";
import Contact from "@/components/sections/Contact";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { profile } from "@/lib/data";

const NAV = [
  ["Work", "#projects"],
  ["Stack", "#skills"],
  ["Shell", "#terminal"],
  ["Contact", "#contact"],
] as const;

/**
 * The full portfolio, top to bottom. Each section is self-contained and reads
 * from lib/data.ts. Order is the narrative: statement → proof → capabilities
 * → play → contact.
 */
export default function Page() {
  return (
    <main>
      {/* Floating pill nav */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
        <nav
          aria-label="Primary"
          className="glass mx-auto flex h-14 max-w-3xl items-center justify-between rounded-full pl-5 pr-2"
        >
          <a
            href="#home"
            aria-label={`${profile.name} — back to top`}
            className="font-display text-base font-semibold tracking-tight"
          >
            {profile.initials}
            <span className="text-accent">.</span>
          </a>
          <div className="flex items-center gap-1">
            <ul className="hidden items-center sm:flex">
              {NAV.map(([label, href]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-ink"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <Hero />
      <Projects />
      <Stack />
      <Terminal />
      <Contact />

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-10 text-sm text-faint sm:flex-row">
          <p>
            © {new Date().getFullYear()} {profile.name}
          </p>
          <ul className="flex items-center gap-6">
            {NAV.map(([label, href]) => (
              <li key={href}>
                <a href={href} className="transition-colors hover:text-ink">
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#home" className="transition-colors hover:text-ink">
            Back to top ↑
          </a>
        </div>
      </footer>
    </main>
  );
}
