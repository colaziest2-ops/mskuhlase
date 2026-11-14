# portfolio-study

Siyabonga Kuhlase's site as one continuous interactive piece. Vite · React 19 · strict TypeScript · plain CSS (tokens + CSS Modules). No UI framework, no animation library — motion is hand-rolled springs, `requestAnimationFrame` and CSS custom properties.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc + vite build → dist/
```

## Controls

| | |
|---|---|
| `←` `→` / `1`–`5` | jump between sections (spring with a soft overshoot) |
| wheel / trackpad / touch | native scroll; a notched mouse wheel is smoothed |
| top card | tilts toward the pointer; drag sideways to peel; double-click or `E` to open |
| a card's tab | click to pull it forward |
| `Esc` | close the open card |
| `C` or the corner control | crumple the page once |
| shell | `help` `whoami` `projects [n]` `stack` `time` `cv` `clear` · `↑ ↓` history · `Ctrl+L` clears |

## URL parameters

- `?seed=123` fixes every seeded variation: card micro-rotations, paper grain, arrival jitter, crease layout.
- `?z=3` runs every spring, settle and the crumple 3× slower (0.25–6) — for inspecting motion.
- `?reduced=1` forces reduced motion on (`0` forces it off). Default follows the OS.

Reduced motion keeps pointer interactions (tilt, peel, hover) and turns every autonomous settle into a jump or a 0.4 s cross-fade; the crumple becomes a dim-and-return fade. The clock still ticks.

## Content

Everything is in `src/content.ts`. Search for `[FILL]`:

- `PERSON.github`, `PERSON.linkedin`, `PERSON.resumeUrl` — links stay hidden until set. Drop a PDF in `public/` and the shell's `cv` command prints it.
- `PROJECTS[].year` — the peeled strip hides the row until you set it.
- `SKILLS` → C# note is a placeholder line.

Project notes and stack badges were written from what each live site ships. Check them before you rely on them.

## Free-form shell questions

Anything that isn't a command is POSTed as `{ "prompt": "…" }` to `VITE_ASSISTANT_URL` and the plain-text reply is printed. Unset, the shell says so instead of guessing. The endpoint must allow CORS from this site.

## The portrait

`public/portrait.jpg` + `public/portrait-depth.png` + `public/reluma.js` (the RELUMA engine, self-hosted — it makes no network calls) render through `src/components/ReLuma.tsx`. The light follows the cursor on the GPU; without WebGL the plain photo is shown. To change the look, edit the props in `Stage.tsx` (`preset`, `intensity`, `radius`, `color`, `ambient`).

## Notes on the crumple

It is an SVG ridged-turbulence displacement on the scroll surface plus a canvas of seeded crease lines and facets — no WebGL, no DOM rasterising. Strength: `PEAK` and the turbulence frequencies in `src/lib/paper.ts` and `App.tsx`. Card tilt amplitude: the `5` and `3.5` in `WorkStack.tsx`'s pointer handler.

## Layout

```
src/
  content.ts            all copy, projects, skills, commands
  lib/params.ts         ?seed ?z ?reduced
  lib/rng.ts            seeded streams
  lib/time.ts           Durban / SAST
  lib/physics.ts        springs, spring bag, scroller
  lib/paper.ts          crumple
  lib/shell.ts          command parser + localStorage history
  styles/               tokens.css, global.css
  components/           Stage, Rail, WorkStack, Schematic, Terminal, Clock, Cursor, ReLuma
```

## Serverless functions (Vercel)

`api/` holds two Vercel functions, deployed automatically when the project's Root Directory is `portfolio-study`:

- `api/contact.ts` — the contact form. Sends via Resend. Env: `RESEND_API_KEY` (required), `CONTACT_TO` (optional), `GOOGLE_FORM_URL` + `GOOGLE_FORM_ENTRY_*` (optional sheet logging).
- `api/assistant.ts` — the shell's free-form questions, via Gemini with model fallback. Env: `GEMINI_API_KEY`. The shell calls `/api/assistant` unless `VITE_ASSISTANT_URL` points elsewhere.

`npm run dev` doesn't serve `api/`; use `vercel dev` to try them locally.
