"use client";

/**
 * ChatWidget
 * ----------
 * Floating AI copilot, styled to match the rest of the site (glass panels,
 * signal-amber accent, mono for anything code-like). Streams tokens from
 * /api/chat as they arrive rather than waiting for the full response.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What projects have you shipped?",
  "What's your tech stack?",
  "Explain closures in JavaScript",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    // Placeholder assistant message we'll stream tokens into.
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Something went wrong reaching the assistant. Try again in a moment.",
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        data-cursor="hover"
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
        aria-expanded={open}
        className="glass-solid fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-cyan transition-transform hover:scale-105 md:bottom-6 md:right-6"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="AI portfolio assistant"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="glass-solid fixed bottom-36 right-4 z-40 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl md:bottom-24 md:right-6"
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
              <span className="status-dot" />
              <p className="font-mono text-xs tracking-widest text-muted">
                AI COPILOT
              </p>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              aria-live="polite"
              className="flex-1 space-y-3 overflow-y-auto p-4"
            >
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted">
                    Ask me about the projects, the stack, or throw a coding
                    question at me — I'll do my best either way.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        data-cursor="hover"
                        className="rounded-full border border-hairline px-3 py-1.5 font-mono text-[0.65rem] text-muted transition-colors hover:text-cyan"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-cyan text-void"
                      : "glass-solid text-ink"
                  }`}
                >
                  {m.content || (
                    <Loader2 className="h-4 w-4 animate-spin text-muted" />
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t border-hairline p-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask something..."
                aria-label="Message the AI assistant"
                autoComplete="off"
                disabled={loading}
                className="flex-1 rounded-full border border-hairline bg-transparent px-4 py-2 text-sm text-ink outline-none focus:border-cyan disabled:opacity-50"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                aria-label="Send message"
                data-cursor="hover"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan text-void transition-opacity disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
