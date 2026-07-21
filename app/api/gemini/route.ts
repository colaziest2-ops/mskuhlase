/**
 * POST /api/gemini
 * -----------------
 * Powers the terminal's free-form fallback: any command the Terminal doesn't
 * recognise locally gets sent here instead of "command not found". Runs
 * server-side only — GEMINI_API_KEY never reaches the browser.
 *
 * Reliability strategy:
 *  - thinkingBudget: 0 disables the "-latest" aliases' default extended
 *    reasoning mode, which otherwise adds a large, uncapped delay before any
 *    visible text comes back (this was the cause of multi-minute hangs).
 *  - Each attempt has its own short timeout (8s) rather than one long one,
 *    so a stuck model doesn't eat the whole request budget.
 *  - On a transient failure (503 "overloaded", 429 rate-limited, network
 *    error, or timeout) it automatically retries with the NEXT model in the
 *    allow-list, rather than surfacing the error straight to the visitor.
 *    Non-transient errors (400 bad request, 403 auth) fail immediately —
 *    retrying with a different model wouldn't fix those.
 *  - The response carries an `X-Model-Used` header so the client can tell
 *    the visitor when a fallback model actually answered.
 */

import { profile, ALLOWED_GEMINI_MODELS, DEFAULT_GEMINI_MODEL, type GeminiModel } from "@/lib/data";

export const runtime = "nodejs";
// Explicit ceiling for this route's total execution time. Worst case here is
// 3 attempts x 8s = 24s; this gives headroom. If your Vercel plan caps
// function duration below 30s, lower ATTEMPT_TIMEOUT_MS instead.
export const maxDuration = 30;

const MAX_PROMPT_CHARS = 2000;
const ATTEMPT_TIMEOUT_MS = 8_000;
// Status codes worth retrying with a different model. Anything else (400,
// 401, 403, 404) means the request itself is wrong — switching models won't
// help, so those fail immediately instead of wasting three attempts.
const RETRYABLE_STATUSES = new Set([429, 500, 503]);

interface AttemptResult {
  ok: boolean;
  text?: string;
  status?: number;
  detail?: string;
  retryable?: boolean;
}

async function attempt(model: GeminiModel, context: string, apiKey: string): Promise<AttemptResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: context }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );
    clearTimeout(timeout);

    const raw = await upstream.text();

    if (!upstream.ok) {
      console.error(`Gemini API error (${model}):`, upstream.status, raw);
      return {
        ok: false,
        status: upstream.status,
        detail: raw.slice(0, 500),
        retryable: RETRYABLE_STATUSES.has(upstream.status),
      };
    }

    let text = "";
    try {
      const parsed = JSON.parse(raw);
      text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch {
      console.error(`Gemini response parse error (${model}):`, raw.slice(0, 500));
    }

    if (!text) {
      return { ok: false, detail: raw.slice(0, 500), retryable: true };
    }

    return { ok: true, text };
  } catch (err) {
    clearTimeout(timeout);
    const timedOut = err instanceof Error && err.name === "AbortError";
    console.error(`Gemini attempt error (${model}):`, timedOut ? "timed out" : err);
    // Timeouts and network errors are transient by nature — worth retrying
    // with the next model rather than failing outright.
    return { ok: false, detail: timedOut ? "timed out" : String(err), retryable: true };
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server is missing GEMINI_API_KEY." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { prompt?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const prompt = String(body.prompt ?? "").slice(0, MAX_PROMPT_CHARS).trim();
  if (!prompt) {
    return new Response(JSON.stringify({ error: "No prompt provided." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const requestedModel = body.model;
  const primaryModel: GeminiModel = ALLOWED_GEMINI_MODELS.includes(
    requestedModel as GeminiModel
  )
    ? (requestedModel as GeminiModel)
    : DEFAULT_GEMINI_MODEL;

  // Try the requested model first, then fall through the rest of the
  // allow-list in order, skipping duplicates.
  const attemptOrder: GeminiModel[] = [
    primaryModel,
    ...ALLOWED_GEMINI_MODELS.filter((m) => m !== primaryModel),
  ];

  const context = `You are a terminal assistant embedded in ${profile.name}'s developer portfolio. Someone has typed a command the terminal didn't recognise, so it's being routed to you. Answer helpfully and concisely — a few short lines, plain text only (no markdown headers, minimal formatting since this renders in a monospace terminal). If asked about ${profile.name} specifically and you don't know, say so plainly rather than guessing.\n\nUser input: ${prompt}`;

  let lastFailure: AttemptResult | null = null;

  for (const model of attemptOrder) {
    const result = await attempt(model, context, apiKey);

    if (result.ok && result.text) {
      return new Response(result.text, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Model-Used": model,
          "X-Model-Requested": primaryModel,
        },
      });
    }

    lastFailure = result;
    if (!result.retryable) break; // a real error, not worth trying other models
  }

  // Every model failed (or a non-retryable error occurred on the first try).
  return new Response(
    JSON.stringify({
      error: "All models failed to respond.",
      status: lastFailure?.status,
      detail: lastFailure?.detail,
      modelsAttempted: attemptOrder,
    }),
    { status: 502, headers: { "Content-Type": "application/json" } }
  );
}
