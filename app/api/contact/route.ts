/**
 * POST /api/contact
 * -------------------
 * Two things happen here, both server-side (no secrets reach the browser):
 *
 * 1. Sends a real email to you via Resend — this replaces the old
 *    mailto:-link approach, which only ever opened the VISITOR's own email
 *    client (unreliable, and did nothing if they had no mail app configured).
 *
 * 2. Optionally logs the submission into a Google Sheet, using the
 *    "submit straight to a Google Form" trick — no Google Cloud service
 *    account or OAuth needed. This step is skipped gracefully if you haven't
 *    set up a form yet (see the .env.local.example comments for how to).
 */

import { Resend } from "resend";
import { profile } from "@/lib/data";

export const runtime = "nodejs";

const MAX_LEN = 4000;

// --- Google Form field IDs -------------------------------------------------
// Fill these in from your own Google Form once you've created one (steps in
// .env.local.example). Left blank = the Sheets step is silently skipped.
const GOOGLE_FORM_URL = process.env.GOOGLE_FORM_URL || "";
const GOOGLE_FORM_ENTRY_NAME = process.env.GOOGLE_FORM_ENTRY_NAME || "";
const GOOGLE_FORM_ENTRY_EMAIL = process.env.GOOGLE_FORM_ENTRY_EMAIL || "";
const GOOGLE_FORM_ENTRY_MESSAGE = process.env.GOOGLE_FORM_ENTRY_MESSAGE || "";

async function logToGoogleSheet(name: string, email: string, message: string) {
  if (!GOOGLE_FORM_URL || !GOOGLE_FORM_ENTRY_NAME) {
    return; // not configured yet — skip quietly, don't fail the whole request
  }
  try {
    const params = new URLSearchParams();
    params.set(GOOGLE_FORM_ENTRY_NAME, name);
    if (GOOGLE_FORM_ENTRY_EMAIL) params.set(GOOGLE_FORM_ENTRY_EMAIL, email);
    if (GOOGLE_FORM_ENTRY_MESSAGE) params.set(GOOGLE_FORM_ENTRY_MESSAGE, message);

    // Server-to-server fetch — no CORS restriction here (that only applies
    // to browser requests), so this works reliably unlike a client-side
    // no-cors submission would.
    await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  } catch (err) {
    // Sheet logging is a nice-to-have — never let it block the actual email.
    console.error("Google Sheet logging failed:", err);
  }
}

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Server is missing RESEND_API_KEY." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { name?: string; email?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const name = String(body.name ?? "").slice(0, 200).trim();
  const email = String(body.email ?? "").slice(0, 200).trim();
  const message = String(body.message ?? "").slice(0, MAX_LEN).trim();

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (name.length < 2 || !emailRe.test(email) || message.length < 10) {
    return new Response(
      JSON.stringify({ error: "Please fill in a valid name, email, and message." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      // Resend's shared test domain works without any domain verification —
      // fine for sending TO your own inbox. If you verify your own domain
      // later, swap this for something like "contact@yourdomain.com".
      from: "Portfolio Contact <onboarding@resend.dev>",
      to: profile.email,
      replyTo: email,
      subject: `Portfolio enquiry from ${name}`,
      text: `${message}\n\n— ${name} (${email})`,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(
        JSON.stringify({ error: "Email failed to send.", detail: error.message }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fire-and-forget — don't let a slow/failed Sheet write delay the
    // response to the visitor.
    logToGoogleSheet(name, email, message);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Contact route error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong sending your message." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
