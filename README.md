# Masakhane Kuhlase — Portfolio

Cybernetic-precision developer portfolio. Next.js 15 · React 19 · TypeScript · Tailwind v4 · Three.js (R3F) · GSAP · Framer Motion · Lenis.

## Run it (in VS Code)

1. Extract this folder and open it in VS Code (`File → Open Folder`).
2. Open the integrated terminal (`` Ctrl+` ``) and install dependencies:

   ```bash
   npm install
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open **http://localhost:3000**.

> Requires **Node.js 18.18+** (Node 20 LTS recommended). Check with `node -v`.

## Make it yours (2-minute edit)

Almost everything lives in **`lib/data.ts`** — edit there, not in the components:

- `profile` — name, role, email, phone, location. **Add your real GitHub + LinkedIn URLs** (the socials are placeholders).
- `skillClusters` — the 2027 skill radar (title, `level` 0–100, skills).
- `projects` — the 6 featured builds (name, url, stack, Lighthouse, load time).
- `stats` — the animated counter strip.

## Notes

- **Contact form** composes a `mailto:` on submit — works with no backend. To wire a real endpoint, replace `handleSubmit` in `components/sections/Contact.tsx` with a `fetch` to your API route.
- **Project previews** load the live sites in an `<iframe>`. Some sites send `X-Frame-Options`/CSP headers that block embedding — those will show blank inside the modal, but the "Visit live site" button always works.
- **Reduced motion** is respected: smooth scroll and heavy animation switch off for users who prefer it.
- The custom cursor auto-disables on touch devices.

## Build for production

```bash
npm run build
npm run start
```

Deploys cleanly to **Vercel** (`vercel` or connect the repo) with zero config.

## Structure

```
app/
  layout.tsx        Root layout, metadata, providers
  page.tsx          Assembles all sections + nav + footer
  globals.css       Tailwind v4 design tokens (colors, type, motion)
components/
  SmoothScroll.tsx        Lenis + GSAP ticker sync
  canvas/NodeBackground   R3F distributed-node particle network
  sections/Hero           Kinetic headline + telemetry badge + CTA
  sections/SkillMatrix    Interactive radar of skill clusters
  sections/Projects       3D tilt cards + filters + live-preview modal
  sections/Stats          GSAP scroll counters
  sections/Contact        Floating-label form + live SA clock + socials
  ui/Terminal             Functional CLI (help / axxon / skills / projects / ping)
  ui/CustomCursor         Velocity-aware cursor
  ui/MagneticButton       Magnetic hover button
lib/data.ts               Single source of truth for all content
```
