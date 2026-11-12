# Siyabonga Kuhlase — Portfolio

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Lenis · Lucide.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Requires Node.js 18.18+ (20 LTS or newer recommended).

The chat widget, terminal and contact form call API routes that need
`GROQ_API_KEY`, `GEMINI_API_KEY` and `RESEND_API_KEY`. Set them in Vercel (and in
`.env.local` for local work) — `npm run build` fails without `GROQ_API_KEY`.

## Edit your content

Everything lives in **`lib/data.ts`** — edit there, not in the components. Search
for `[FILL]` to find what still needs your input.

- `profile` — name, role, location, email, hero `status` line, social URLs and
  `resumeUrl`. GitHub / LinkedIn / Resume links stay hidden until you set real URLs.
- `projects` — the work grid. Order drives the bento layout (`SPANS` in
  `components/sections/Projects.tsx`). Per project you can optionally set:
  - `image` — a screenshot in `/public` (e.g. `/projects/lumiritin.jpg`) to
    replace the generated card art.
  - `repo` — a GitHub URL; adds a "Source" button to the drawer.
  - `embed: false` — for sites that block iframes (`X-Frame-Options`), which
    skips the live preview.
- `skillClusters` — the three stack tiles and the hero marquee.
- `stats` — the numbers in the About tile. The first two are computed from
  `projects`.

## Design system

Tokens are defined once in `app/globals.css` under `@theme` (dark) and
`[data-theme="light"]`: `void / panel / raised / hairline` surfaces,
`ink / muted / faint` text, and a single `accent`. Reusable pieces:

- `.card` — bento tile with a pointer-following spotlight (set `--spot` to tint it)
- `.pill`, `.eyebrow`, `.text-gradient`, `glass`, `glass-solid`, `grid-fade`

Fonts (Bricolage Grotesque, Inter, JetBrains Mono) load through `next/font`.
All motion respects `prefers-reduced-motion`.

## Structure

```
app/
  layout.tsx          Fonts, metadata, providers
  page.tsx            Nav + sections + footer
  globals.css         Design tokens and primitives
  api/                chat (Groq) · gemini (terminal) · contact (Resend)
components/
  Providers.tsx       MotionConfig + smooth scroll
  SmoothScroll.tsx    Lenis + eased anchor links
  sections/Hero       Status badge, statement, CTAs, stack marquee
  sections/Projects   Bento work grid
  sections/Stack      About, local time and discipline tiles
  sections/Contact    Copy-to-clipboard email, links, form
  ui/ProjectDrawer    Project case file with scaled live preview
  ui/ProjectArt       Generated / screenshot card art
  ui/Card             Spotlight tile + scroll reveal
  ui/MagneticButton   Magnetic CTA
  ui/Terminal         Interactive shell
  ui/ChatWidget       Floating AI assistant
  ui/MobileNav        Bottom nav on phones
  ui/ThemeToggle      Dark / light
lib/
  data.ts             All content
  ui.ts               Spotlight, clipboard, clock, scroll-lock helpers
  systemPrompt.ts     AI assistant prompt, built from data.ts
```
