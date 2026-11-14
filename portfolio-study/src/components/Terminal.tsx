import { useCallback, useEffect, useRef, useState } from "react";
import { BOOT, loadHistory, runCommand, saveHistory, type Line } from "../lib/shell";
import { PARAMS } from "../lib/params";
import styles from "./Terminal.module.css";

/** Blink with a 1.1 s period and a duty cycle that wanders a little. Solid while typing. */
function useBlink(resetKey: unknown, reduced: boolean): boolean {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(true);
    if (reduced) return;
    const period = 1100 * PARAMS.z;
    let state = true;
    let id = 0;
    const duty = () => 0.5 + Math.random() * 0.12;
    const tick = () => {
      state = !state;
      setOn(state);
      const d = duty();
      id = window.setTimeout(tick, (state ? d : 1 - d) * period);
    };
    id = window.setTimeout(tick, duty() * period + 450); // hold solid just after a keystroke
    return () => window.clearTimeout(id);
  }, [resetKey, reduced]);

  return on;
}

/** A tiny noise-burst key click. Off by default; the context only exists once the user opts in. */
function useKeyClick(enabled: boolean): () => void {
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;
    ctx.current ??= new window.AudioContext();
    void ctx.current.resume();
  }, [enabled]);

  return useCallback(() => {
    const c = ctx.current;
    if (!enabled || !c) return;
    const len = Math.floor(c.sampleRate * 0.012);
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800 + Math.random() * 900;
    const gain = c.createGain();
    gain.gain.value = 0.22;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start();
  }, [enabled]);
}

export function Terminal({ reduced }: { reduced: boolean }) {
  const [lines, setLines] = useState<readonly Line[]>(BOOT);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(""); // what's drawn: lags the input by 8–18 ms
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(false);

  const cursorOn = useBlink(shown, reduced);
  const click = useKeyClick(sound);

  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const lag = useRef(0);
  const cursor = useRef(-1); // position in history while browsing with ↑ ↓

  useEffect(() => () => window.clearTimeout(lag.current), []);

  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const setBoth = (v: string) => {
    window.clearTimeout(lag.current);
    setValue(v);
    setShown(v);
  };

  const submit = async () => {
    const raw = value;
    setBoth("");
    cursor.current = -1;
    setLines((l) => [...l, { kind: "in", text: raw }]);
    if (!raw.trim()) return;

    setHistory((h) => {
      const next = [...h, raw].slice(-100);
      saveHistory(next);
      return next;
    });

    setBusy(true);
    const result = await runCommand(raw);
    setBusy(false);
    setLines((l) => (result.clear ? BOOT : [...l, ...result.lines]));
    input.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") click();

    if (e.key === "Enter") {
      e.preventDefault();
      if (!busy) void submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      cursor.current = cursor.current < 0 ? history.length - 1 : Math.max(0, cursor.current - 1);
      setBoth(history[cursor.current] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cursor.current < 0) return;
      cursor.current += 1;
      if (cursor.current >= history.length) {
        cursor.current = -1;
        setBoth("");
      } else {
        setBoth(history[cursor.current] ?? "");
      }
    } else if (e.key === "Escape") {
      setBoth("");
    } else if (e.key.toLowerCase() === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines(BOOT);
    }
  };

  return (
    <div className={styles.term} onClick={() => input.current?.focus({ preventScroll: true })}>
      <div className={styles.bar}>
        <span className={styles.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={styles.title}>siyabonga@study:~</span>
        <button
          type="button"
          className={styles.snd}
          aria-pressed={sound}
          onClick={(e) => {
            e.stopPropagation();
            setSound((s) => !s);
          }}
        >
          key click · {sound ? "on" : "off"}
        </button>
      </div>

      <div ref={log} className={styles.log} data-scroll-inner="" role="log" aria-live="polite">
        {lines.map((l, i) => (
          <p key={i} className={styles.line} data-kind={l.kind}>
            {l.kind === "in" && <span className={styles.ps}>$ </span>}
            {l.text || " "}
          </p>
        ))}
      </div>

      <label className={styles.prompt}>
        <span className={styles.ps} aria-hidden="true">
          ${" "}
        </span>
        <span className={styles.typed} aria-hidden="true">
          {shown}
        </span>
        <span className={styles.caret} data-on={cursorOn && !busy} aria-hidden="true" />
        {busy && (
          <span className={styles.busy} aria-hidden="true">
            …
          </span>
        )}
        <input
          ref={input}
          className={styles.input}
          value={value}
          readOnly={busy}
          onChange={(e) => {
            const v = e.target.value;
            setValue(v);
            window.clearTimeout(lag.current);
            lag.current = window.setTimeout(() => setShown(v), 8 + Math.random() * 10);
          }}
          onKeyDown={onKeyDown}
          aria-label="Shell command or question"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
        />
      </label>
    </div>
  );
}
