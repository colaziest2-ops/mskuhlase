/**
 * POST /api/gemini
 * -----------------
 * Powers the terminal's free-form fallback: any command the Terminal doesn't
 * recognise locally gets sent here instead of "command not found". Runs
 * server-side only — GEMINI_API_KEY never reaches the browser. Streams the
 * response back as plain text so it can be appended to the terminal output
 * line by line, the same way /api/chat streams into the ChatWidget.
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
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: context }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      console.error("Gemini API error:", upstream.status, errText);
      return new Response(
        JSON.stringify({
          error: "Gemini request failed.",
          status: upstream.status,
          detail: errText.slice(0, 500),
          modelUsed: model,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Gemini's streaming endpoint sends Server-Sent Events: lines prefixed
    // "data: {...json...}". We parse each event and forward just the text
    // token, so the client gets a plain text stream like /api/chat does.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();

    const readable = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const jsonStr = trimmed.slice(5).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) controller.enqueue(encoder.encode(text));
              } catch {
                // Skip any malformed/partial SSE chunk rather than failing
                // the whole stream over one bad line.
              }
            }
          }
        } catch {
          controller.enqueue(encoder.encode("\n[stream interrupted]"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
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
