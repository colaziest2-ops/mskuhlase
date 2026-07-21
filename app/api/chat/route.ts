/**
 * POST /api/chat
 * ---------------
 * Runs entirely server-side. The Groq API key lives in process.env and is
 * never sent to, or readable by, the browser — the client only ever talks to
 * this route, never to Groq directly. Streams the model's response back as
 * plain text chunks so the chat UI can render tokens as they arrive.
 */

import Groq from "groq-sdk";
import { buildSystemPrompt } from "@/lib/systemPrompt";

// Node runtime (not Edge) — the Groq SDK expects Node's fetch/stream
// primitives. Fine for a chat route; nothing here needs Edge's cold-start win.
export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

// Basic guardrails: cap history length and message size so a visitor can't
// send an enormous payload or run up an unbounded bill against your key.
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 4000;

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Server is missing GROQ_API_KEY." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { messages?: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  if (!incoming.length) {
    return new Response(JSON.stringify({ error: "No messages provided." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Trim to the most recent N messages and enforce a per-message size cap.
  const trimmed = incoming
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(m.content ?? "").slice(0, MAX_CHARS_PER_MESSAGE),
    }));

  try {
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...trimmed,
      ],
      temperature: 0.6,
      max_tokens: 1024,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content ?? "";
            if (token) controller.enqueue(encoder.encode(token));
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode("\n\n[Error: the response stream was interrupted.]")
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Groq API error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong talking to the model." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
