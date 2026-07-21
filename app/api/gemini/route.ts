/**
 * POST /api/gemini
 * -----------------
 * Powers the terminal's free-form fallback: any command the Terminal doesn't
 * recognise locally gets sent here instead of "command not found". Runs
 * server-side only — GEMINI_API_KEY never reaches the browser.
 *
 * Uses plain (non-streaming) generateContent — the confirmed model list for
 * this key only lists generateContent/countTokens/createCachedContent/
 * batchGenerateContent as supported methods, not streamGenerateContent, so
 * the streaming endpoint 404s regardless of model choice. The Terminal still
 * reads the response via the same reader.read() loop; it just resolves in
 * one pass instead of several.
 */

import { profile, ALLOWED_GEMINI_MODELS, DEFAULT_GEMINI_MODEL, type GeminiModel } from "@/lib/data";

export const runtime = "nodejs";

const MAX_PROMPT_CHARS = 2000;

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

  // Only ever use a model from the allow-list above — falls back to the
  // default rather than erroring, so a stale client never hard-fails.
  const requestedModel = body.model;
  const model: GeminiModel = ALLOWED_GEMINI_MODELS.includes(
    requestedModel as GeminiModel
  )
    ? (requestedModel as GeminiModel)
    : DEFAULT_GEMINI_MODEL;

  // Short system-style context so terminal answers stay on-brand for a
  // portfolio shell rather than reading like a generic chatbot.
  const context = `You are a terminal assistant embedded in ${profile.name}'s developer portfolio. Someone has typed a command the terminal didn't recognise, so it's being routed to you. Answer helpfully and concisely — a few short lines, plain text only (no markdown headers, minimal formatting since this renders in a monospace terminal). If asked about ${profile.name} specifically and you don't know, say so plainly rather than guessing.\n\nUser input: ${prompt}`;

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: context }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        }),
      }
    );

    const raw = await upstream.text();

    if (!upstream.ok) {
      console.error("Gemini API error:", upstream.status, raw);
      return new Response(
        JSON.stringify({
          error: "Gemini request failed.",
          status: upstream.status,
          detail: raw.slice(0, 500),
          modelUsed: model,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    let text = "";
    try {
      const parsed = JSON.parse(raw);
      text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch {
      console.error("Gemini response parse error:", raw.slice(0, 500));
    }

    if (!text) {
      return new Response(
        JSON.stringify({
          error: "Gemini returned an empty response.",
          detail: raw.slice(0, 500),
          modelUsed: model,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Not a token stream anymore (this endpoint doesn't support one on this
    // key) — return the full answer as a single plain-text response. The
    // Terminal's reader.read() loop still works fine; it just resolves in
    // one pass instead of several.
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Gemini route error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong talking to Gemini." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
