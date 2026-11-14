/**
 * POST /api/contact — Vercel serverless function.
 *
 * Ported from the Next.js route at app/api/contact. Sends the enquiry to your
 * inbox through Resend and, if configured, logs it to a Google Sheet via a
 * Google Form. Secrets stay server-side.
 *
 * Env: RESEND_API_KEY (required), CONTACT_TO (optional, defaults below),
 * GOOGLE_FORM_URL + GOOGLE_FORM_ENTRY_NAME/EMAIL/MESSAGE (optional).
 */

import { Resend } from "resend";

const DEFAULT_TO = "mskuhlase1011@icloud.com";
const MAX_LEN = 4000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function logToGoogleSheet(name: string, email: string, message: string): Promise<void> {
  const url = process.env.GOOGLE_FORM_URL;
  const entryName = process.env.GOOGLE_FORM_ENTRY_NAME;
  if (!url || !entryName) return;
  try {
    const params = new URLSearchParams();
    params.set(entryName, name);
    if (process.env.GOOGLE_FORM_ENTRY_EMAIL) params.set(process.env.GOOGLE_FORM_ENTRY_EMAIL, email);
    if (process.env.GOOGLE_FORM_ENTRY_MESSAGE) params.set(process.env.GOOGLE_FORM_ENTRY_MESSAGE, message);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  } catch (err) {
    console.error("Google Sheet logging failed:", err);
  }
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json({ error: "Server is missing RESEND_API_KEY." }, 500);

  let body: { name?: unknown; email?: unknown; message?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  // Honeypot: real visitors never see or fill this field.
  if (String(body.website ?? "").trim()) return json({ ok: true });

  const name = String(body.name ?? "").slice(0, 200).trim();
  const email = String(body.email ?? "").slice(0, 200).trim();
  const message = String(body.message ?? "").slice(0, MAX_LEN).trim();

  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 10) {
    return json({ error: "Please fill in a valid name, email, and message." }, 400);
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: "Portfolio Contact <onboarding@resend.dev>",
      to: process.env.CONTACT_TO || DEFAULT_TO,
      replyTo: email,
      subject: `Portfolio enquiry from ${name}`,
      text: `${message}\n\n— ${name} (${email})`,
    });
    if (error) {
      console.error("Resend error:", error);
      return json({ error: "Email failed to send." }, 502);
    }
    await logToGoogleSheet(name, email, message);
    return json({ ok: true });
  } catch (err) {
    console.error("Contact function error:", err);
    return json({ error: "Something went wrong sending your message." }, 502);
  }
}
