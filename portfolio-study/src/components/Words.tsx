import { Fragment } from "react";
import type { CSSProperties } from "react";
import type { ColorName } from "../content";
import { useInView } from "../lib/scroll";
import styles from "./Words.module.css";

export interface WordPart {
  readonly t: string;
  /** Lit as a moving two-colour gradient. */
  readonly c?: ColorName;
}

/** The colour each highlight drifts toward, so a lit word is a gradient, never a flat swatch. */
const NEXT: Record<ColorName, ColorName> = {
  amber: "rose",
  rose: "violet",
  violet: "sky",
  sky: "teal",
  teal: "lime",
  lime: "amber",
};

/**
 * A heading whose words rise out of a mask one after another when it scrolls
 * into view. Words with a colour carry a slowly shifting gradient.
 */
export function Words({ parts, delay = 0 }: { parts: readonly WordPart[]; delay?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>({ threshold: 0.4 });
  let i = 0;

  return (
    <span ref={ref} className={styles.words} data-in={seen} style={{ "--base": `${delay}ms` } as CSSProperties}>
      <span className={styles.sr}>{parts.map((p) => p.t).join(" ")}</span>
      {parts.map((p, pi) =>
        p.t
          .split(" ")
          .filter(Boolean)
          .map((word, wi) => {
            const idx = i++;
            const lit = p.c
              ? ({ "--i": idx, "--c1": `var(--c-${p.c})`, "--c2": `var(--c-${NEXT[p.c]})` } as CSSProperties)
              : ({ "--i": idx } as CSSProperties);
            return (
              <Fragment key={`${pi}-${wi}`}>
                <span className={styles.w} aria-hidden="true">
                  <span className={p.c ? `${styles.wi} ${styles.hl}` : styles.wi} style={lit}>
                    {word}
                  </span>
                </span>{" "}
              </Fragment>
            );
          }),
      )}
    </span>
  );
}
