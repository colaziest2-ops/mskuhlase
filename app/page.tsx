import Hero from "@/components/sections/Hero";
import SkillMatrix from "@/components/sections/SkillMatrix";
import Projects from "@/components/sections/Projects";
import Stats from "@/components/sections/Stats";
import Terminal from "@/components/ui/Terminal";
import Contact from "@/components/sections/Contact";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { profile } from "@/lib/data";

/**
 * The full portfolio, top to bottom. Each section is self-contained and reads
 * from lib/data.ts. Section order is the narrative: thesis → capabilities →
 * proof → numbers → play → contact.
 */
export default function Page() {
  return (
    <main>
      {/* Fixed lightweight nav */}
      <nav className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a
            href="#home"
            data-cursor="hover"
            className="font-display text-sm font-bold tracking-tight"
          >
            SK<span className="text-cyan">.</span>
          </a>
          <div className="flex items-center gap-4">
            <div className="hidden gap-8 font-mono text-[0.7rem] tracking-widest text-muted sm:flex">
              {[
                ["Skills", "#skills"],
                ["Work", "#projects"],
                ["Shell", "#terminal"],
                ["Contact", "#contact"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  data-cursor="hover"
                  className="flex items-center transition-colors hover:text-cyan"
                >
                  {label.toUpperCase()}
                </a>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <Hero />
      <SkillMatrix />
      <Projects />
      <Stats />
      <Terminal />
      <Contact />

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <p className="font-mono text-[0.7rem] tracking-widest text-faint">
            © {new Date().getFullYear()} {profile.name.toUpperCase()}
          </p>
          <p className="font-mono text-[0.7rem] tracking-widest text-faint">
            BUILT WITH NEXT.JS · THREE.JS · GSAP
          </p>
        </div>
      </footer>
    </main>
  );
}
