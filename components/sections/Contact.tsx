"use client";

/**
 * Contact
 * -------
 * Magnetic contact form with floating labels + real-time validation feedback,
 * a live South Africa (GMT+2) operational clock, and kinetic social links.
 *
 * The form has no backend here — on submit it composes a mailto: so it works
 * out of the box. Swap `handleSubmit` for your API route when ready.
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Github, Linkedin, Mail, MapPin } from "lucide-react";
import { profile } from "@/lib/data";

function useSATime() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const time = useMemo(() => {
    if (!now) return "--:--:--";
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: profile.timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(now);
  }, [now]);
  return time;
}

interface Field {
  value: string;
  touched: boolean;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  const time = useSATime();
  const [name, setName] = useState<Field>({ value: "", touched: false });
  const [email, setEmail] = useState<Field>({ value: "", touched: false });
  const [message, setMessage] = useState<Field>({ value: "", touched: false });

  const nameErr = name.touched && name.value.trim().length < 2;
  const emailErr = email.touched && !emailRe.test(email.value);
  const msgErr = message.touched && message.value.trim().length < 10;
  const valid =
    name.value.trim().length >= 2 &&
    emailRe.test(email.value) &&
    message.value.trim().length >= 10;

  const handleSubmit = () => {
    if (!valid) {
      setName((f) => ({ ...f, touched: true }));
      setEmail((f) => ({ ...f, touched: true }));
      setMessage((f) => ({ ...f, touched: true }));
      return;
    }
    const subject = encodeURIComponent(`Portfolio enquiry from ${name.value}`);
    const body = encodeURIComponent(`${message.value}\n\n— ${name.value} (${email.value})`);
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
  };

  const socials = [
    { icon: Github, label: "GitHub", href: profile.socials.github },
    { icon: Linkedin, label: "LinkedIn", href: profile.socials.linkedin },
    { icon: Mail, label: "Email", href: `mailto:${profile.email}` },
  ];

  return (
    <section id="contact" className="relative mx-auto max-w-6xl px-6 py-28">
      <div className="grid gap-16 lg:grid-cols-2">
        {/* Left: pitch + live widgets */}
        <div>
          <p className="eyebrow mb-3">05 — Contact</p>
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Got something
            <br />
            <span className="neon-cyan">worth building?</span>
          </h2>
          <p className="mt-6 max-w-md text-muted">{profile.availability}</p>
          <p className="mt-3 max-w-md text-sm text-faint">{profile.collabStyle}</p>

          {/* Live operational clock */}
          <div className="glass mt-10 inline-flex items-center gap-4 rounded-xl px-5 py-4">
            <span className="status-dot" />
            <div>
              <p className="font-mono text-lg text-cyan">{time}</p>
              <p className="flex items-center gap-1 font-mono text-[0.65rem] tracking-widest text-faint">
                <MapPin className="h-3 w-3" /> {profile.location.toUpperCase()} · GMT+2
              </p>
            </div>
          </div>

          {/* Socials */}
          <div className="mt-8 flex gap-3">
            {socials.map((s) => (
              <motion.a
                key={s.label}
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label={s.label}
                data-cursor="hover"
                whileHover={{ y: -4, scale: 1.08 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="glass flex h-12 w-12 items-center justify-center rounded-full text-muted transition-colors hover:text-cyan"
              >
                <s.icon className="h-5 w-5" />
              </motion.a>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div className="glass rounded-2xl p-8">
          <FloatingInput
            id="name"
            label="Your name"
            value={name.value}
            error={nameErr ? "Please enter your name" : ""}
            onChange={(v) => setName({ value: v, touched: true })}
            onBlur={() => setName((f) => ({ ...f, touched: true }))}
          />
          <FloatingInput
            id="email"
            label="Email address"
            type="email"
            value={email.value}
            error={emailErr ? "Enter a valid email" : ""}
            onChange={(v) => setEmail({ value: v, touched: true })}
            onBlur={() => setEmail((f) => ({ ...f, touched: true }))}
          />
          <FloatingInput
            id="message"
            label="Message"
            textarea
            value={message.value}
            error={msgErr ? "A little more detail helps (10+ chars)" : ""}
            onChange={(v) => setMessage({ value: v, touched: true })}
            onBlur={() => setMessage((f) => ({ ...f, touched: true }))}
          />

          <button
            onClick={handleSubmit}
            data-cursor="hover"
            className="mt-4 w-full rounded-full bg-cyan px-6 py-3.5 text-sm font-medium text-void transition-colors hover:bg-emerald disabled:opacity-40"
          >
            Send message
          </button>
        </div>
      </div>
    </section>
  );
}

/* --- Floating-label field ------------------------------------------------- */
function FloatingInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  textarea = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string;
  type?: string;
  textarea?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  const shared = {
    id,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      onBlur();
    },
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-err` : undefined,
    className:
      "peer w-full border-b bg-transparent pb-2 pt-6 text-ink outline-none transition-colors " +
      (error ? "border-[#ff5f57]" : "border-hairline focus:border-cyan"),
  };

  return (
    <div className="relative mb-6">
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-0 font-mono transition-all duration-200 ${
          active
            ? "top-0 text-[0.65rem] tracking-widest text-cyan"
            : "top-6 text-sm text-faint"
        }`}
      >
        {label.toUpperCase()}
      </label>
      {textarea ? (
        <textarea rows={4} {...shared} />
      ) : (
        <input type={type} {...shared} />
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 font-mono text-[0.65rem] text-[#ff5f57]">
          {error}
        </p>
      )}
    </div>
  );
}
