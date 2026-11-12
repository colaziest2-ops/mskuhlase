"use client";

/**
 * Contact
 * -------
 * One large tile: the pitch, a click-to-copy email, and direct links on the
 * left; a short form on the right that sends through /api/contact (Resend).
 */

import { useState } from "react";
import { ArrowUpRight, Check, Copy, FileText, Github, Linkedin, Mail, X as XIcon } from "lucide-react";
import { profile } from "@/lib/data";
import { trackSpotlight, useCopy } from "@/lib/ui";
import { Card } from "@/components/ui/Card";

interface Field {
  value: string;
  touched: boolean;
}

type SendState = "idle" | "sending" | "sent" | "error";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blank: Field = { value: "", touched: false };

/** True only for a real profile URL — hides the bare-domain placeholders. */
const isRealProfile = (url: string) => {
  try {
    return new URL(url).pathname.length > 1;
  } catch {
    return false;
  }
};

const links = [
  { icon: Github, label: "GitHub", href: profile.socials.github, show: isRealProfile(profile.socials.github) },
  { icon: Linkedin, label: "LinkedIn", href: profile.socials.linkedin, show: isRealProfile(profile.socials.linkedin) },
  { icon: FileText, label: "Resume", href: profile.resumeUrl, show: !!profile.resumeUrl },
  { icon: Mail, label: "Open in mail app", href: `mailto:${profile.email}`, show: true },
].filter((l) => l.show);

export default function Contact() {
  const [copied, copy] = useCopy();
  const [name, setName] = useState<Field>(blank);
  const [email, setEmail] = useState<Field>(blank);
  const [message, setMessage] = useState<Field>(blank);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const nameOk = name.value.trim().length >= 2;
  const emailOk = emailRe.test(email.value);
  const msgOk = message.value.trim().length >= 10;
  const valid = nameOk && emailOk && msgOk;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendState === "sending") return;
    if (!valid) {
      setName((f) => ({ ...f, touched: true }));
      setEmail((f) => ({ ...f, touched: true }));
      setMessage((f) => ({ ...f, touched: true }));
      return;
    }

    setSendState("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.value, email: email.value, message: message.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");

      setSendState("sent");
      setName(blank);
      setEmail(blank);
      setMessage(blank);
    } catch (err) {
      setSendState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <section id="contact" className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Card className="grid gap-12 p-7 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:p-14">
        {/* Pitch + direct contact */}
        <div className="flex flex-col">
          <p className="eyebrow mb-4">Contact</p>
          <h2 className="text-4xl font-semibold leading-[1.02] tracking-tighter sm:text-6xl">
            Got something <span className="text-gradient">worth building?</span>
          </h2>
          <p className="mt-6 max-w-md text-pretty leading-relaxed text-muted">
            {profile.availability}
          </p>

          {/* Click-to-copy email */}
          <button
            type="button"
            onClick={() => copy(profile.email)}
            onMouseMove={trackSpotlight}
            aria-label={`Copy email address ${profile.email}`}
            className="card group mt-10 flex w-full max-w-md cursor-pointer items-center justify-between gap-4 !rounded-2xl px-5 py-4 text-left"
          >
            <span className="min-w-0">
              <span className="eyebrow block !text-[0.6rem]" aria-live="polite">
                {copied ? "Copied to clipboard" : "Click to copy"}
              </span>
              <span className="mt-1 block truncate text-base text-ink sm:text-lg">
                {profile.email}
              </span>
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline text-faint transition-colors group-hover:text-ink">
              {copied ? <Check className="h-4 w-4 text-emerald" /> : <Copy className="h-4 w-4" />}
            </span>
          </button>

          <ul className="mt-6 flex flex-wrap gap-2 lg:mt-auto lg:pt-10">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  {...(l.href.startsWith("mailto:")
                    ? {}
                    : { target: "_blank", rel: "noopener noreferrer" })}
                  className="group inline-flex h-10 items-center gap-2 rounded-full border border-hairline px-4 text-sm text-muted transition-colors hover:border-faint hover:text-ink"
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                  <ArrowUpRight className="h-3.5 w-3.5 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <FormField
            id="name"
            label="Your name"
            autoComplete="name"
            value={name.value}
            error={name.touched && !nameOk ? "Please enter your name" : ""}
            onChange={(v) => setName({ value: v, touched: true })}
            onBlur={() => setName((f) => ({ ...f, touched: true }))}
          />
          <FormField
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            value={email.value}
            error={email.touched && !emailOk ? "Enter a valid email" : ""}
            onChange={(v) => setEmail({ value: v, touched: true })}
            onBlur={() => setEmail((f) => ({ ...f, touched: true }))}
          />
          <FormField
            id="message"
            label="Message"
            textarea
            value={message.value}
            error={message.touched && !msgOk ? "A little more detail helps (10+ characters)" : ""}
            onChange={(v) => setMessage({ value: v, touched: true })}
            onBlur={() => setMessage((f) => ({ ...f, touched: true }))}
          />

          <button
            type="submit"
            disabled={sendState === "sending"}
            className="mt-1 h-12 w-full cursor-pointer rounded-full bg-ink px-6 text-sm font-medium text-void transition-colors hover:bg-ink/90 disabled:cursor-wait disabled:opacity-50"
          >
            {sendState === "sending" ? "Sending…" : "Send message"}
          </button>

          <div aria-live="polite" className="min-h-5">
            {sendState === "sent" && (
              <p className="flex items-center gap-2 text-sm text-emerald">
                <Check className="h-4 w-4" /> Sent — I&apos;ll reply as soon as I can.
              </p>
            )}
            {sendState === "error" && (
              <p className="flex items-center gap-2 text-sm text-danger">
                <XIcon className="h-4 w-4 shrink-0" />
                {errorMsg || "Something went wrong — try again, or email me directly."}
              </p>
            )}
          </div>
        </form>
      </Card>
    </section>
  );
}

/* --- Labelled field ------------------------------------------------------- */
function FormField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  textarea = false,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  type?: string;
  textarea?: boolean;
  autoComplete?: string;
}) {
  const shared = {
    id,
    name: id,
    value,
    autoComplete,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    onBlur,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-err` : undefined,
    // text-base (16px) stops iOS Safari zooming the page on focus
    className:
      "w-full rounded-xl border bg-raised/60 px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-faint focus:bg-raised " +
      (error ? "border-danger" : "border-hairline focus:border-accent"),
  };

  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-2 block">
        {label}
      </label>
      {textarea ? <textarea rows={5} {...shared} /> : <input type={type} {...shared} />}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
