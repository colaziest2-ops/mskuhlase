import { useEffect, useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { PERSON } from "../content";
import styles from "./KeycapName.module.css";

interface KeycapNameProps {
  readonly reduced: boolean;
}

interface Key {
  readonly ch: string;
  /** index through the whole name — drives the entrance stagger and the light sweep */
  readonly gi: number;
  /** offset from the line's centre, in keys */
  readonly u: number;
}

/** Keys from the centre to here span the curve; both lines share it, so they sit on one sphere. */
const HALF_SPAN = 4;

const lineOf = (word: string, start: number): Key[] => {
  const chars = Array.from(word.toUpperCase());
  const mid = (chars.length - 1) / 2;
  return chars.map((ch, i) => ({ ch, gi: start + i, u: i - mid }));
};

const LINES: readonly (readonly Key[])[] = [
  lineOf(PERSON.first, 0),
  lineOf(PERSON.last, PERSON.first.length),
];

/** Where a key sits on the big sphere: ends drop a little, recede, turn outward and shrink. */
const placement = (u: number): CSSProperties => {
  const f = (u / HALF_SPAN) ** 2;
  return {
    "--s": (1 - 0.13 * f).toFixed(4),
    "--dy": (0.2 * f).toFixed(4),
    "--dz": (-0.4 * f).toFixed(4),
    "--ry": `${(u * 3.2).toFixed(2)}deg`,
  } as CSSProperties;
};

const SRC = (ch: string) => `${import.meta.env.BASE_URL}keycaps/${ch.toLowerCase()}.webp`;

/** Restart a CSS animation that is keyed off a data attribute. */
function retrigger(el: HTMLElement, attr: string) {
  el.removeAttribute(attr);
  void el.offsetWidth;
  el.setAttribute(attr, "");
}

/**
 * The hero name as white keycap spheres on a gentle arc. The group leans toward the pointer
 * (or the phone's tilt, or a slow idle sway on touch), and every key presses in under a finger.
 * Purely decorative: the h1 carries the accessible name.
 */
export function KeycapName({ reduced }: KeycapNameProps) {
  const rootRef = useRef<HTMLSpanElement>(null);

  // Hold the drop-in until the caps have decoded, so they never fall in as empty boxes.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      root.dataset.ready = "";
    };
    const timer = window.setTimeout(go, 2500);
    const imgs = Array.from(root.querySelectorAll("img"));
    void Promise.all(imgs.map((img) => img.decode().catch(() => undefined))).then(go);
    return () => {
      done = true;
      window.clearTimeout(timer);
    };
  }, []);

  // Device tilt, where it is offered without a permission prompt (not iOS).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced || typeof window.DeviceOrientationEvent === "undefined") return;
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown };
    if (typeof DOE.requestPermission === "function") return;

    let base: number | null = null;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      root.style.setProperty("--tx", cx.toFixed(3));
      root.style.setProperty("--ty", cy.toFixed(3));
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (base == null) {
        base = e.beta;
        root.dataset.tilt = "on"; // real readings: hand the idle sway over to the device
      }
      tx = clamp(e.gamma / 28);
      ty = clamp((e.beta - base) / 28);
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => {
      window.removeEventListener("deviceorientation", onTilt);
      if (raf) cancelAnimationFrame(raf);
      delete root.dataset.tilt;
      root.style.removeProperty("--tx");
      root.style.removeProperty("--ty");
    };
  }, [reduced]);

  const press = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const slot = e.currentTarget;
    slot.setAttribute("data-pressed", "");
    if (reduced) return;
    // the neighbours feel it: a little chained wobble, fading with distance
    const line = slot.parentElement;
    if (!line) return;
    const keys = Array.from(line.children) as HTMLElement[];
    const at = keys.indexOf(slot);
    keys.forEach((k, i) => {
      const d = i - at;
      if (d === 0 || Math.abs(d) > 2) return;
      const wig = k.querySelector(`.${styles.wig}`);
      if (!(wig instanceof HTMLElement)) return;
      wig.style.setProperty("--wd", String(Math.sign(d) * (Math.abs(d) === 1 ? 1 : 0.45)));
      wig.style.setProperty("--wt", `${(Math.abs(d) - 1) * 70}ms`);
      retrigger(wig, "data-wiggle");
    });
  };
  const release = (e: ReactPointerEvent<HTMLSpanElement>) => {
    e.currentTarget.removeAttribute("data-pressed");
  };

  return (
    <span ref={rootRef} className={styles.root} aria-hidden="true">
      <span className={styles.sway}>
        <span className={styles.tilt}>
          {LINES.map((line, li) => (
            <span key={li} className={styles.line}>
              {line.map((k) => (
                <span
                  key={k.gi}
                  className={styles.slot}
                  style={{ ...placement(k.u), "--gi": k.gi } as CSSProperties}
                  onPointerDown={press}
                  onPointerUp={release}
                  onPointerCancel={release}
                  onPointerLeave={release}
                >
                  <span className={styles.shadow} />
                  <span className={styles.drop}>
                    <span className={styles.wig}>
                      <span className={styles.key}>
                        <img
                          className={styles.img}
                          src={SRC(k.ch)}
                          alt=""
                          width={96}
                          height={96}
                          decoding="async"
                          draggable={false}
                        />
                        <span className={styles.shade} />
                        <span className={styles.sheen} />
                      </span>
                    </span>
                  </span>
                </span>
              ))}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
