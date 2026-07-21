"use client";

/**
 * Terminal
 * --------
 * A functional, keyboard-driven command line. Known commands (help, whoami,
 * skills, projects, vms, ping, joke, durban, sudo, clear) resolve instantly
 * and locally — no API cost. Anything else gets routed to Gemini via
 * /api/gemini and streamed back into the terminal, so the shell can actually
 * answer free-form questions instead of just "command not found".
 *
 * Mobile notes: input font-size is 16px (text-base) to stop iOS Safari from
 * auto-zooming on focus; output pane height and padding shrink on small
 * screens; the title bar wraps instead of overflowing on narrow viewports.
 */

import { useEffect, useRef, useState } from "react";
import {
  profile,
  projects,
  skillClusters,
  jokes,
  durbanFacts,
  pingFlavourFacts,
  pingJokes,
} from "@/lib/data";

interface Line {
  type: "in" | "out" | "sys";
  text: string;
}

const BANNER: Line[] = [
  { type: "sys", text: `${profile.name} — interactive shell` },
  { type: "sys", text: 'Type "help" — or ask anything else, it goes to Gemini.' },
];

const KNOWN_COMMANDS = new Set([
  "help",
  "whoami",
  "skills",
  "projects",
  "vms",
  "ping",
  "joke",
  "durban",
  "sudo",
  "sudo make me a sandwich",
  "clear",
]);

/** Pick a random element — used everywhere below to vary responses. */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const skillsIntros = [
  "Alright, here's the stack:",
  "Full breakdown, no padding:",
  "Let's see what's actually under the hood:",
];
const projectsIntros = [
  "Here's what's shipped (and what's still internal):",
  "The receipts:",
  "Live and not-so-live, in order:",
];
const whoamiVariants = [
  [
    `${profile.name}`,
    `${profile.role}`,
    `Based in ${profile.location}.`,
    "Web apps by day, VMS server rooms by necessity.",
  ],
  [
    `${profile.name} — ${profile.subrole}`,
    "Ask me about Next.js or SQL Server event protocols.",
    "Both answers will be equally enthusiastic.",
  ],
];

export default function Terminal() {
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIndex, setHIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const push = (newLines: Line[]) => setLines((prev) => [...prev, ...newLines]);

  /** Sends unrecognised input to Gemini and streams the reply into a single
   * growing output line, the same pattern ChatWidget uses for Groq. */
  async function askGemini(prompt: string) {
    setBusy(true);
    push([{ type: "out", text: "…" }]);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok || !res.body) throw new Error("Gemini request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        acc += decoder.decode(chunk, { stream: true });
        setLines((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { type: "out", text: acc || "…" };
          return copy;
        });
      }
    } catch {
      setLines((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          type: "out",
          text: "Gemini didn't respond — try again in a moment.",
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  async function run(raw: string) {
    const cmd = raw.trim().toLowerCase();
    push([{ type: "in", text: raw }]);
    if (!cmd) return;

    setHistory((h) => [...h, raw]);
    setHIndex(-1);

    if (!KNOWN_COMMANDS.has(cmd)) {
      await askGemini(raw);
      return;
    }

    switch (cmd) {
      case "help":
        push([
          { type: "out", text: "AVAILABLE COMMANDS" },
          { type: "out", text: "  help      — list commands" },
          { type: "out", text: "  whoami    — quick bio" },
          { type: "out", text: "  skills    — full stack breakdown" },
          { type: "out", text: "  projects  — shipped work" },
          { type: "out", text: "  vms       — video management system background" },
          { type: "out", text: "  ping      — latency check (results vary)" },
          { type: "out", text: "  joke      — one dev joke, no refunds" },
          { type: "out", text: "  durban    — a fact about the city I work from" },
          { type: "out", text: "  clear     — clear the screen" },
          { type: "out", text: "  (anything else) — ask Gemini directly" },
        ]);
        break;

      case "whoami":
        push(pick(whoamiVariants).map((text) => ({ type: "out" as const, text })));
        break;

      case "vms":
        push([
          { type: "out", text: "VIDEO MANAGEMENT SYSTEM OPERATIONS" },
          { type: "out", text: "Large-scale VMS deployment across multiple mine" },
          { type: "out", text: "sites. SQL Server-backed event protocol management" },
          { type: "out", text: "on the software side; server node restoration on" },
          { type: "out", text: "the hardware side, when the problem isn't code." },
        ]);
        break;

      case "joke":
        push([{ type: "out", text: pick(jokes) }]);
        break;

      case "durban":
        push([{ type: "out", text: pick(durbanFacts) }]);
        break;

      case "sudo":
      case "sudo make me a sandwich":
        push([{ type: "out", text: "Nice try. You're not root here — I am." }]);
        break;

      case "skills":
        push([
          { type: "out", text: pick(skillsIntros) },
          ...skillClusters.map((c) => ({
            type: "out" as const,
            text: `  [${String(c.level).padStart(3)}%] ${c.title}: ${c.skills.join(", ")}`,
          })),
        ]);
        break;

      case "projects":
        push([
          { type: "out", text: pick(projectsIntros) },
          ...projects.map((p) => ({
            type: "out" as const,
            text: `  → ${p.name.padEnd(28)} ${p.url || "(internal / no public link)"}`,
          })),
        ]);
        break;

      case "ping": {
        const flavour = pick(["trace", "fact", "joke"] as const);

        if (flavour === "trace") {
          const nodes = ["node-dbn-01", "node-jhb-02", "edge-vms-03"];
          push([{ type: "out", text: "PING local network ..." }]);
          for (const n of nodes) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 240));
            const ms = (Math.random() * 40 + 8).toFixed(1);
            push([{ type: "out", text: `  reply from ${n.padEnd(16)} time=${ms}ms  ✓` }]);
          }
          push([{ type: "out", text: "3/3 reachable — network healthy." }]);
        } else if (flavour === "fact") {
          push([{ type: "out", text: pick(pingFlavourFacts) }]);
        } else {
          push([{ type: "out", text: pick(pingJokes) }]);
        }
        break;
      }

      case "clear":
        setLines(BANNER);
        break;
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (busy) return;
      run(value);
      setValue("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const next = hIndex < 0 ? history.length - 1 : Math.max(0, hIndex - 1);
      setHIndex(next);
      setValue(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIndex < 0) return;
      const next = hIndex + 1;
      if (next >= history.length) {
        setHIndex(-1);
        setValue("");
      } else {
        setHIndex(next);
        setValue(history[next]);
      }
    }
  };

  const color = (t: Line["type"]) =>
    t === "in" ? "text-cyan" : t === "sys" ? "text-violet" : "text-muted";

  return (
    <section id="terminal" className="relative mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28">
      <header className="mb-8 max-w-2xl sm:mb-10">
        <p className="eyebrow mb-3">04 — Playground</p>
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-5xl">
          Talk to the <span className="neon-cyan">shell.</span>
        </h2>
      </header>

      <div
        className="glass-solid overflow-hidden rounded-2xl"
        onClick={() => inputRef.current?.focus()}
        data-cursor="hover"
      >
        {/* title bar — wraps rather than overflowing on narrow screens */}
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-1 truncate font-mono text-[0.65rem] text-faint sm:ml-3 sm:text-xs">
            masakhane@portfolio:~$
          </span>
        </div>

        {/* output */}
        <div
          ref={scrollRef}
          aria-live="polite"
          className="h-64 overflow-y-auto overflow-x-hidden p-3 font-mono text-[0.78rem] leading-relaxed sm:h-80 sm:p-4 sm:text-[0.8rem]"
        >
          {lines.map((l, i) => (
            <div key={i} className={`${color(l.type)} break-words`}>
              {l.type === "in" ? <span className="text-emerald">$ </span> : null}
              <span className="whitespace-pre-wrap">{l.text}</span>
            </div>
          ))}

          {/* input line — text-base (16px) prevents iOS Safari's auto-zoom
              on focus; shrinks back down to match on larger screens where
              zoom isn't a concern. */}
          <div className="flex items-center text-ink">
            <span className="text-emerald">$&nbsp;</span>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Terminal command input"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={busy}
              className="flex-1 border-none bg-transparent text-base font-mono text-ink outline-none disabled:opacity-60 sm:text-[0.8rem]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
