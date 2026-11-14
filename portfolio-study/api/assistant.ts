/**
 * POST /api/assistant — Vercel serverless function.
 *
 * Answers the shell's free-form questions. Ported from the Next.js route at
 * app/api/gemini: same short per-attempt timeout and fallback through the
 * model list on transient failures. GEMINI_API_KEY never reaches the browser.
 *
 * Request: { prompt: string }  →  Response: plain text.
 */

const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-pro-latest"] as const;
const MAX_PROMPT_CHARS = 2000;
const ATTEMPT_TIMEOUT_MS = 8_000;
const RETRYABLE = new Set([429, 500, 503]);

interface Attempt {
  ok: boolean;
  text?: string;
  status?: number;
  retryable: boolean;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function attempt(model: string, context: string, apiKey: string): Promise<Attempt> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: ctl.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: context }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );
    const raw = await res.text();
    if (!res.ok) {
      console.error(`Gemini error (${model}):`, res.status, raw.slice(0, 500));
      return { ok: false, status: res.status, retryable: RETRYABLE.has(res.status) };
    }
    let text = "";
    try {
      text = JSON.parse(raw)?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch {
      /* fall through to empty-text retry */
    }
    return text ? { ok: true, text, retryable: false } : { ok: false, retryable: true };
  } catch (err) {
    console.error(`Gemini attempt failed (${model}):`, err);
    return { ok: false, retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: "Server is missing GEMINI_API_KEY." }, 500);

  let body: { prompt?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const prompt = String(body.prompt ?? "").slice(0, MAX_PROMPT_CHARS).trim();
  if (!prompt) return json({ error: "No prompt provided." }, 400);

  const context =
    "You are a terminal assistant embedded in Siyabonga Kuhlase's developer portfolio. " +
    "Someone typed a command the terminal didn't recognise, so it's routed to you. " +
    "Answer helpfully and concisely: a few short lines, plain text only, no markdown, since this renders in a monospace terminal. " +
    "If asked about Siyabonga specifically and you don't know, say so plainly rather than guessing.\n\n" +
    `User input: ${prompt}`;

  let last: Attempt | null = null;
  for (const model of MODELS) {
    const result = await attempt(model, context, apiKey);
    if (result.ok && result.text) {
      return new Response(result.text, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "X-Model-Used": model },
      });
    }
    last = result;
    if (!result.retryable) break;
  }
  return json({ error: "The assistant couldn't answer right now.", status: last?.status }, 502);
}
