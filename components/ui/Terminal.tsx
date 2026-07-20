"use client";

/**
 * Terminal
 * --------
 * A functional, keyboard-driven command line. Commands operate on the real CV
 * data. Supports: help, axxon, skills, projects, ping, clear. Arrow-up recalls
 * history. Fully accessible: it's a labelled input feeding an aria-live log.
 */

import { useEffect, useRef, useState } from "react";
import { profile, projects, skillClusters } from "@/lib/data";

interface Line {
  type: "in" | "out" | "sys";
  text: string;
}

const BANNER: Line[] = [
  { type: "sys", text: `${profile.name} — interactive shell v2027.1` },
  { type: "sys", text: 'Type "help" to list commands.' },
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
          { type: "out", text: "  axxon     — engineering background at AxxonSoft" },
          { type: "out", text: "  network   — networking & infrastructure background" },
          { type: "out", text: "  skills    — full stack breakdown" },
          { type: "out", text: "  projects  — launch links to deployed apps" },
          { type: "out", text: "  ping      — latency across the network" },
          { type: "out", text: "  clear     — clear the screen" },
        ]);
        break;

      case "axxon":
        push([
          { type: "out", text: `${profile.role} @ AxxonSoft — ${profile.location}` },
          { type: "out", text: "Support & optimisation for Axxon One, PSIM, Axxon" },
          { type: "out", text: "Intellect and AxxonNet. Built an automated daily" },
          { type: "out", text: "criminal-intel report for retail (Cash Crusaders," },
          { type: "out", text: "Spar) via analytics + API + PowerShell with" },
          { type: "out", text: "encrypted delivery. Deployed Axxon One affinities," },
          { type: "out", text: "integrations & clusters for a mining operation." },
        ]);
        break;

      case "network":
        push([
          { type: "out", text: "NETWORKING & INFRASTRUCTURE BACKGROUND" },
          { type: "out", text: "Cisco networking, network configuration and" },
          { type: "out", text: "troubleshooting, Windows/Linux administration," },
          { type: "out", text: "and Microsoft Azure (AZ-900 complete; AZ-204," },
          { type: "out", text: "AI-900, AI-102, DP-900, DP-100 in progress)." },
          { type: "out", text: "This is the layer beneath every app I ship —" },
          { type: "out", text: "I design for the network it actually runs on." },
        ]);
        break;

      case "skills":
        push(
          skillClusters.map((c) => ({
            type: "out" as const,
            text: `  [${String(c.level).padStart(3)}%] ${c.title}: ${c.skills.join(", ")}`,
          }))
        );
        break;

      case "projects":
        push([
          { type: "out", text: "DEPLOYED PLATFORMS" },
          ...projects.map((p) => ({
            type: "out" as const,
            text: `  → ${p.name.padEnd(20)} ${p.url}`,
          })),
        ]);
        break;

      case "ping": {
        const nodes = ["node-jhb-01", "node-dbn-02", "node-cpt-03", "edge-analytics"];
        push([{ type: "out", text: "PING distributed mesh ..." }]);
        for (const n of nodes) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 260));
          const ms = (Math.random() * 40 + 8).toFixed(1);
          push([{ type: "out", text: `  reply from ${n.padEnd(16)} time=${ms}ms  ✓` }]);
        }
        push([{ type: "out", text: "4/4 nodes reachable — mesh healthy." }]);
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
            masakhane@axxon: ~/portfolio
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
