"use client";

/**
 * Terminal
 * --------
 * A functional, keyboard-driven command line. Several commands pull from a
 * randomized response pool so the shell doesn't feel like a static script —
 * ping three times in a row and you'll get three different flavours (a real
 * simulated trace, a fun fact, or a dry joke). Arrow-up recalls history.
 * Fully accessible: labelled input feeding an aria-live log.
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
  { type: "sys", text: 'Type "help" to list commands.' },
];

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
    "Web apps by day, VMS server rooms by necessity, trading algorithms by obsession.",
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const push = (newLines: Line[]) => setLines((prev) => [...prev, ...newLines]);

  async function run(raw: string) {
    const cmd = raw.trim().toLowerCase();
    push([{ type: "in", text: raw }]);
    if (!cmd) return;

    setHistory((h) => [...h, raw]);
    setHIndex(-1);

    switch (cmd) {
      case "help":
        push([
          { type: "out", text: "AVAILABLE COMMANDS" },
          { type: "out", text: "  help      — list commands" },
          { type: "out", text: "  whoami    — quick bio" },
          { type: "out", text: "  skills    — full stack breakdown" },
          { type: "out", text: "  projects  — shipped work" },
          { type: "out", text: "  vms       — video management system background" },
          { type: "out", text: "  trading   — algorithmic trading systems background" },
          { type: "out", text: "  ping      — latency check (results vary)" },
          { type: "out", text: "  joke      — one dev joke, no refunds" },
          { type: "out", text: "  durban    — a fact about the city I work from" },
          { type: "out", text: "  clear     — clear the screen" },
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

      case "trading":
        push([
          { type: "out", text: "MT5 / ALGORITHMIC TRADING ARCHITECTURE" },
          { type: "out", text: "V75 Smart Money Concepts Expert Advisor, built" },
          { type: "out", text: "and documented in MQL5. Multi-timeframe analysis" },
          { type: "out", text: "feeds block-detection logic into entry decisions —" },
          { type: "out", text: "the same 'confirm before you act' instinct as VMS." },
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
        // Three response flavours picked at random, so pinging repeatedly
        // doesn't produce the same canned output every time.
        const flavour = pick(["trace", "fact", "joke"] as const);

        if (flavour === "trace") {
          const nodes = ["node-dbn-01", "node-jhb-02", "edge-vms-03", "trading-vm"];
          push([{ type: "out", text: "PING local network ..." }]);
          for (const n of nodes) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 240));
            const ms = (Math.random() * 40 + 8).toFixed(1);
            push([{ type: "out", text: `  reply from ${n.padEnd(16)} time=${ms}ms  ✓` }]);
          }
          push([{ type: "out", text: "4/4 reachable — network healthy." }]);
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

      default:
        push([{ type: "out", text: `command not found: ${cmd}. Try "help".` }]);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
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
    <section id="terminal" className="relative mx-auto max-w-4xl px-6 py-28">
      <header className="mb-10 max-w-2xl">
        <p className="eyebrow mb-3">04 — Playground</p>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
          Talk to the <span className="neon-cyan">shell.</span>
        </h2>
      </header>

      <div
        className="glass overflow-hidden rounded-2xl"
        onClick={() => inputRef.current?.focus()}
        data-cursor="hover"
      >
        {/* title bar */}
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-xs text-faint">
            masakhane@portfolio:~$
          </span>
        </div>

        {/* output */}
        <div
          ref={scrollRef}
          aria-live="polite"
          className="h-80 overflow-y-auto p-4 font-mono text-[0.8rem] leading-relaxed"
        >
          {lines.map((l, i) => (
            <div key={i} className={color(l.type)}>
              {l.type === "in" ? <span className="text-emerald">$ </span> : null}
              <span className="whitespace-pre-wrap">{l.text}</span>
            </div>
          ))}

          {/* input line */}
          <div className="flex items-center text-ink">
            <span className="text-emerald">$&nbsp;</span>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Terminal command input"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 border-none bg-transparent font-mono text-[0.8rem] text-ink outline-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
