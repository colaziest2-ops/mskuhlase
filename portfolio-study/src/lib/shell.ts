import { PERSON, PROJECTS, SHELL_COMMANDS, SKILLS } from "../content";
import { sastHMS } from "./time";

export type LineKind = "in" | "out" | "err" | "sys";

export interface Line {
  readonly kind: LineKind;
  readonly text: string;
}

export interface ShellResult {
  readonly lines: readonly Line[];
  readonly clear?: boolean;
}

const out = (text: string): Line => ({ kind: "out", text });
const err = (text: string): Line => ({ kind: "err", text });
const sys = (text: string): Line => ({ kind: "sys", text });

export const BOOT: readonly Line[] = [
  sys(`${PERSON.name} — shell`),
  sys('type "help". anything that is not a command is sent on as a question.'),
];

/* ---- history ------------------------------------------------------------- */

const HISTORY_KEY = "study.shell.history.v1";
const HISTORY_MAX = 100;

export function loadHistory(): string[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(-HISTORY_MAX)
      : [];
  } catch {
    return []; // storage blocked or corrupt — the shell still works, it just forgets
  }
}

export function saveHistory(history: readonly string[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_MAX)));
  } catch {
    /* storage full or blocked — ignore */
  }
}

/* ---- commands ------------------------------------------------------------ */

function findProject(query: string) {
  const n = Number(query);
  if (Number.isInteger(n) && n >= 1 && n <= PROJECTS.length) return PROJECTS[n - 1];
  const q = query.toLowerCase();
  return PROJECTS.find((p) => p.id === q || p.name.toLowerCase().includes(q));
}

async function ask(prompt: string, head: string): Promise<ShellResult> {
  // Defaults to the serverless function in api/assistant.ts; override with VITE_ASSISTANT_URL.
  const endpoint = (import.meta.env.VITE_ASSISTANT_URL as string | undefined) || "/api/assistant";
  if (!endpoint) {
    return {
      lines: [
        err(`${head}: not a command, and no assistant endpoint is configured.`),
        sys('Set VITE_ASSISTANT_URL to route free-form questions. Try "help".'),
      ],
    };
  }

  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 20_000);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: ctl.signal,
    });
    const body = (await res.text()).trim();
    if (!res.ok) throw new Error(body || `HTTP ${res.status}`);
    return { lines: (body || "…").split("\n").map(out) };
  } catch (e) {
    const reason = e instanceof Error && e.name === "AbortError" ? "timed out after 20s" : e instanceof Error ? e.message : "failed";
    return { lines: [err(`assistant: ${reason}`)] };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function runCommand(raw: string): Promise<ShellResult> {
  const text = raw.trim();
  if (!text) return { lines: [] };
  const [head = "", ...rest] = text.split(/\s+/);

  switch (head.toLowerCase()) {
    case "help":
      return {
        lines: [
          out("COMMANDS"),
          ...SHELL_COMMANDS.map((c) => out(`  ${c.name.padEnd(9)} ${c.desc}`)),
          out("  (anything else) sent on as a question"),
        ],
      };

    case "whoami":
      return {
        lines: [out(PERSON.name), out(PERSON.role), out(PERSON.location), out(`${PERSON.availability}.`)],
      };

    case "projects": {
      if (rest.length) {
        const p = findProject(rest.join(" "));
        if (!p) return { lines: [err(`projects: no match for "${rest.join(" ")}". Try "projects".`)] };
        return {
          lines: [
            out(`${p.name} — ${p.category}`),
            out(p.url),
            out(""),
            ...p.highlights.map((h) => out(`  · ${h}`)),
            out(""),
            out(`  stack: ${p.stack.join(", ")}`),
          ],
        };
      }
      return {
        lines: [
          ...PROJECTS.map((p, i) => out(`  ${String(i + 1).padStart(2, "0")}  ${p.name.padEnd(18)} ${p.domain}`)),
          sys('projects <n> for detail'),
        ],
      };
    }

    case "stack":
      return {
        lines: SKILLS.flatMap((layer) => [
          out(layer.label.toUpperCase()),
          out(`  ${layer.nodes.map((n) => n.label).join(" · ")}`),
        ]),
      };

    case "time":
      return { lines: [out(`${sastHMS()} SAST · ${PERSON.location}`)] };

    case "cv":
      return PERSON.resumeUrl
        ? { lines: [out(PERSON.resumeUrl)] }
        : { lines: [out("No CV file is published here yet."), out(`Ask for one: ${PERSON.email}`)] };

    case "clear":
      return { lines: [], clear: true };

    default:
      return ask(text, head);
  }
}
