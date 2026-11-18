import { Logo } from "./Logo";
import styles from "./TechTags.module.css";

/** Project stack entries → logo ids (lib/logos.ts). Payment providers have no mark to inline, so they get a card icon plus their name. */
const TECH: Readonly<Record<string, { id: string; named?: true }>> = {
  "Next.js": { id: "nextjs" },
  React: { id: "react" },
  "React Router": { id: "reactrouter" },
  "Tailwind CSS": { id: "tailwind" },
  "Framer Motion": { id: "framer" },
  GSAP: { id: "gsap" },
  Vite: { id: "vite" },
  PHP: { id: "php" },
  JavaScript: { id: "javascript" },
  "Yoco Payments": { id: "payment", named: true },
  PayFast: { id: "payment", named: true },
};

/** One stack entry as a list item: the real logo on a dark chip; the name is kept for tooltips and screen readers. */
export function TechTag({ name }: { readonly name: string }) {
  const t = TECH[name];
  if (!t) return <li className={styles.text}>{name}</li>;
  return (
    <li className={styles.item} data-named={t.named ?? false} title={name}>
      <Logo id={t.id} size={t.named ? 16 : 20} decorative />
      {t.named ? <span>{name}</span> : <span className={styles.sr}>{name}</span>}
    </li>
  );
}
