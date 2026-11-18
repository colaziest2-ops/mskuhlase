/**
 * What crawlers and language models read, generated from src/content.ts at build time so it
 * can't drift from what the app shows. Wired up by the `seo()` plugin in vite.config.ts.
 *
 *   snapshot  semantic HTML put inside <div id="root">. createRoot() in main.tsx replaces it on
 *             mount; crawlers that don't run JavaScript (GPTBot, ClaudeBot, PerplexityBot…) read
 *             it as-is. Hidden while the app boots; shown as a plain page if the app never mounts.
 *   jsonLd    schema.org graph: Person, WebSite, ProfilePage, and one entry per project.
 *   llmsTxt   /llms.txt (https://llmstxt.org).
 *
 * Types only from content.ts here; the plugin loads the real module.
 */
import type { HtmlTagDescriptor } from "vite";

export const SITE_URL = "https://mskuhlase.vercel.app";
export const SNAPSHOT_ID = "snapshot";

type ContentModule = typeof import("../src/content");
export type SiteContent = Pick<
  ContentModule,
  "PERSON" | "INTRO_PARTS" | "SECTIONS" | "PROJECTS" | "SKILLS" | "SHELL_COMMANDS" | "FOOTER"
>;
type Project = ContentModule["PROJECTS"][number];
type SkillLayer = ContentModule["SKILLS"][number];
type Section = ContentModule["SECTIONS"][number];

/** Fails the build with a clear message if content.ts stops exporting what the page needs. */
export function readContent(mod: Record<string, unknown>): SiteContent {
  const required = ["PERSON", "INTRO_PARTS", "SECTIONS", "PROJECTS", "SKILLS"];
  const missing = required.filter((k) => mod[k] == null);
  if (missing.length) throw new Error(`[seo] src/content.ts no longer exports ${missing.join(", ")}`);
  return { SHELL_COMMANDS: [], FOOTER: "", ...mod } as unknown as SiteContent;
}

// ---- helpers ------------------------------------------------------------------------------

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const isUrl = (u: string | undefined): u is string => !!u && /^(https?:\/\/|mailto:|\/)/.test(u);
const href = (u: string) => (isUrl(u) ? esc(u) : "#");
const color = (c: string | undefined) => (c && /^[a-z]+$/.test(c) ? c : "amber");
const hex = (c: string) => (/^#[0-9a-f]{3,8}$/i.test(c) ? c : "currentColor");

const intro = (c: SiteContent) => c.INTRO_PARTS.map((p) => p.t).join("");
const knowsAbout = (c: SiteContent) => c.SKILLS.flatMap((l) => l.nodes.map((n) => n.label));

/** Reads "Work: Seven platforms, all live"; shows as an eyebrow over the title. */
const heading = (s: Section) =>
  `<h2 id="sn-${esc(s.id)}-title"><span class="sn-k">${esc(s.label)}<span class="sn-vh">:</span></span> ${esc(s.title)}</h2>`;

// ---- snapshot HTML ------------------------------------------------------------------------

function hero(c: SiteContent, s: Section | undefined): string {
  const { PERSON } = c;
  const cut = PERSON.last ? PERSON.name.lastIndexOf(PERSON.last) : -1;
  const name =
    cut > 0
      ? `${esc(PERSON.name.slice(0, cut))}<span class="sn-last">${esc(PERSON.name.slice(cut))}</span>`
      : esc(PERSON.name);
  const text = c.INTRO_PARTS.map((p) =>
    p.c ? `<span class="sn-hl" data-c="${color(p.c)}">${esc(p.t)}</span>` : esc(p.t),
  ).join("");
  const links = [
    `<a href="mailto:${esc(PERSON.email)}">${esc(PERSON.email)}</a>`,
    isUrl(PERSON.linkedin) && `<a href="${href(PERSON.linkedin)}" rel="me">LinkedIn</a>`,
    isUrl(PERSON.github) && `<a href="${href(PERSON.github)}" rel="me">GitHub</a>`,
    isUrl(PERSON.resumeUrl) && `<a href="${href(PERSON.resumeUrl)}">CV</a>`,
  ].filter(Boolean);
  return [
    `<section id="${esc(s?.id ?? "home")}" class="sn-hero" data-c="${color(s?.color)}" aria-labelledby="sn-name">`,
    `<p class="sn-status">${esc(PERSON.availability)}</p>`,
    `<h1 id="sn-name">${name}</h1>`,
    `<p class="sn-role">${esc(PERSON.role)}</p>`,
    `<p class="sn-place">${esc(PERSON.location)}</p>`,
    `<p class="sn-intro">${text}</p>`,
    `<p class="sn-reach">${links.join(" <span aria-hidden=\"true\">·</span> ")}</p>`,
    `</section>`,
  ].join("\n");
}

function project(p: Project): string {
  const meta: [string, string][] = [
    ["Category", esc(p.category)],
    ["Sector", esc(p.sector)],
  ];
  if (p.year) meta.push(["Year", esc(p.year)]);
  meta.push(["Stack", `<ul class="sn-tags">${p.stack.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`]);
  if (p.note) meta.push(["Note", esc(p.note)]);
  meta.push(["Live site", `<a href="${href(p.url)}">${esc(p.domain || p.url)}</a>`]);
  return [
    `<article id="project-${esc(p.id)}" class="sn-project" style="--ac:${hex(p.ac)}" aria-labelledby="sn-p-${esc(p.id)}">`,
    `<h3 id="sn-p-${esc(p.id)}">${esc(p.name)}</h3>`,
    `<p class="sn-tagline">${esc(p.tagline)}</p>`,
    `<p>${esc(p.summary)}</p>`,
    p.highlights.length
      ? `<h4>Highlights</h4>\n<ul class="sn-list">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`
      : "",
    `<dl class="sn-meta">${meta.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`,
    `</article>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function layer(l: SkillLayer): string {
  return [
    `<section class="sn-layer" data-c="${color(l.color)}" aria-labelledby="sn-l-${esc(l.id)}">`,
    `<h3 id="sn-l-${esc(l.id)}">${esc(l.label)}</h3>`,
    `<p class="sn-cap">${esc(l.caption)}</p>`,
    `<dl class="sn-nodes">${l.nodes.map((n) => `<dt>${esc(n.label)}</dt><dd>${esc(n.note)}</dd>`).join("")}</dl>`,
    `</section>`,
  ].join("\n");
}

function section(c: SiteContent, s: Section): string {
  const open = `<section id="${esc(s.id)}" class="sn-sec" data-c="${color(s.color)}" aria-labelledby="sn-${esc(s.id)}-title">`;
  const body: string[] = [];
  switch (s.id) {
    case "work":
      body.push(...c.PROJECTS.map(project));
      break;
    case "stack":
      body.push(...c.SKILLS.map(layer));
      break;
    case "play":
      body.push(
        `<p>The interactive page has a working terminal. It takes real commands; anything that isn't one is sent on as a question.</p>`,
      );
      if (c.SHELL_COMMANDS.length) {
        body.push(
          `<h3>Commands</h3>`,
          `<dl class="sn-nodes">${c.SHELL_COMMANDS.map((k) => `<dt><code>${esc(k.name)}</code></dt><dd>${esc(k.desc)}</dd>`).join("")}</dl>`,
        );
      }
      break;
    case "contact": {
      const { PERSON } = c;
      body.push(
        `<p>${esc(PERSON.availability)}.</p>`,
        `<p class="sn-email"><a href="mailto:${esc(PERSON.email)}">${esc(PERSON.email)}</a></p>`,
      );
      const links = [
        isUrl(PERSON.linkedin) && `<li><a href="${href(PERSON.linkedin)}" rel="me">LinkedIn</a></li>`,
        isUrl(PERSON.github) && `<li><a href="${href(PERSON.github)}" rel="me">GitHub</a></li>`,
        isUrl(PERSON.resumeUrl) && `<li><a href="${href(PERSON.resumeUrl)}">CV</a></li>`,
      ].filter(Boolean);
      if (links.length) body.push(`<ul class="sn-links">${links.join("")}</ul>`);
      break;
    }
  }
  return [open, heading(s), ...body, `</section>`].join("\n");
}

/** The page as plain, semantic HTML, in the order of SECTIONS. */
export function snapshotHtml(c: SiteContent, year = new Date().getFullYear()): string {
  const home = c.SECTIONS.find((s) => s.id === "home");
  const nav = c.SECTIONS.map((s) => `<li><a href="#${esc(s.id)}">${esc(s.label)}</a></li>`).join("");
  return [
    `<!-- Plain-HTML copy of the page, generated from src/content.ts at build time. The app replaces it when it mounts. -->`,
    // Inline style: invisible from the first paint, so there is no flash before React mounts.
    `<div id="${SNAPSHOT_ID}" style="position:fixed;inset:0;opacity:0">`,
    `<div class="sn-wrap">`,
    `<header class="sn-top">`,
    `<p>Plain version of this page. The interactive one runs on JavaScript.</p>`,
    `<nav aria-label="Sections"><ul>${nav}</ul></nav>`,
    `</header>`,
    `<main>`,
    hero(c, home),
    ...c.SECTIONS.filter((s) => s.id !== "home").map((s) => section(c, s)),
    `</main>`,
    `<footer class="sn-foot">`,
    c.FOOTER ? `<p>${esc(c.FOOTER)}</p>` : "",
    `<p>© ${year} ${esc(c.PERSON.name)}</p>`,
    `</footer>`,
    `</div>`,
    `</div>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Hidden while the app boots. If it is still in the DOM after ~3s (the bundle failed, or an old
 * browser), it fades in as a readable page. With JavaScript off it shows at once (NOSCRIPT_CSS).
 * Tokens come from tokens.css when that loaded; the fallbacks are the dark theme.
 */
const SNAPSHOT_CSS = `
#snapshot{position:fixed;inset:0;z-index:30;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;background:var(--field-0,#0a0908);color:var(--ink,#e8e4dc);font:400 16px/1.65 "IBM Plex Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-wrap:anywhere;animation:sn-reveal .45s ease-out 3s both}
@keyframes sn-reveal{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){#snapshot{animation-duration:1ms}}
#root:has([data-scroll-root])>#snapshot{display:none!important}
#snapshot [data-c=amber]{--k:var(--c-amber,#f0a45d)}#snapshot [data-c=teal]{--k:var(--c-teal,#4fd6c1)}#snapshot [data-c=sky]{--k:var(--c-sky,#6aa9ff)}#snapshot [data-c=violet]{--k:var(--c-violet,#a98bff)}#snapshot [data-c=rose]{--k:var(--c-rose,#ff7a9c)}#snapshot [data-c=lime]{--k:var(--c-lime,#b6e35a)}
#snapshot .sn-wrap{max-width:780px;margin:0 auto;padding:28px clamp(16px,5vw,40px) 72px}
#snapshot p,#snapshot ul,#snapshot dl{margin:0}
#snapshot ul{padding:0;list-style:none}
#snapshot a{color:inherit;text-decoration:underline;text-decoration-color:rgb(var(--edge,232 228 220)/.3);text-underline-offset:3px}
#snapshot a:hover{text-decoration-color:currentColor}
#snapshot h1,#snapshot h2,#snapshot h3{margin:0;font-family:Fraunces,Georgia,serif;font-weight:400;font-optical-sizing:auto}
#snapshot code,#snapshot dt,#snapshot h4,#snapshot .sn-top,#snapshot .sn-k,#snapshot .sn-status,#snapshot .sn-place,#snapshot .sn-cap,#snapshot .sn-tags,#snapshot .sn-foot{font-family:"IBM Plex Mono",ui-monospace,monospace}
#snapshot .sn-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:10px 24px;padding-bottom:16px;border-bottom:1px solid rgb(var(--edge,232 228 220)/.1);font-size:12px;color:var(--ink-dim,#9a958c)}
#snapshot .sn-top ul{display:flex;flex-wrap:wrap;gap:4px 18px}
#snapshot .sn-top a{text-decoration:none;color:var(--ink,#e8e4dc)}
#snapshot .sn-hero{padding:64px 0 8px}
#snapshot .sn-status{font-size:12px;color:var(--c-lime,#b6e35a)}
#snapshot h1{margin:16px 0 20px;font-size:clamp(46px,11vw,92px);font-weight:300;line-height:.98;letter-spacing:-.025em}
#snapshot .sn-last{color:var(--c-rose,#ff7a9c)}
@supports ((-webkit-background-clip:text) or (background-clip:text)){#snapshot .sn-last{background:linear-gradient(90deg,var(--c-amber,#f0a45d),var(--c-rose,#ff7a9c) 55%,var(--c-violet,#a98bff));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}}
#snapshot .sn-role{font:500 15px/1.5 "Space Grotesk","IBM Plex Sans",sans-serif}
#snapshot .sn-place{margin-top:6px;font-size:12px;color:var(--ink-dim,#9a958c)}
#snapshot .sn-intro{margin-top:28px;max-width:62ch;font-size:18px;line-height:1.7;color:var(--ink-dim,#9a958c)}
#snapshot .sn-hl{color:var(--k)}
#snapshot .sn-reach{margin-top:24px;font-size:15px}
#snapshot .sn-sec{margin-top:72px;padding-top:24px;border-top:1px solid var(--k)}
#snapshot h2{margin-bottom:36px;font-size:clamp(30px,6vw,44px);line-height:1.1;letter-spacing:-.01em}
#snapshot .sn-k{display:block;margin-bottom:10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--k)}
#snapshot .sn-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
#snapshot .sn-project{margin:0 0 56px;padding-left:20px;border-left:2px solid var(--ac)}
#snapshot .sn-project>p{margin-top:10px}
#snapshot h3{font-size:26px;line-height:1.2}
#snapshot .sn-tagline{font:italic 300 18px/1.45 Fraunces,Georgia,serif;color:var(--ink-dim,#9a958c)}
#snapshot h4{margin:20px 0 8px;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-dim,#9a958c)}
#snapshot .sn-list{padding-left:1.1em;list-style:disc}
#snapshot .sn-list li::marker{color:var(--ac)}
#snapshot dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 20px}
#snapshot dd{margin:0}
#snapshot dt{padding-top:3px;font-size:11px;letter-spacing:.04em;color:var(--ink-dim,#9a958c)}
#snapshot .sn-meta{margin-top:20px;font-size:15px}
#snapshot .sn-tags{display:flex;flex-wrap:wrap;gap:6px;font-size:12px}
#snapshot .sn-tags li{padding:1px 9px;border:1px solid rgb(var(--edge,232 228 220)/.18);border-radius:999px}
#snapshot .sn-layer{margin-top:40px}
#snapshot .sn-layer h3{color:var(--k)}
#snapshot .sn-cap{font-size:12px;color:var(--ink-dim,#9a958c)}
#snapshot .sn-nodes{grid-template-columns:minmax(140px,max-content) 1fr;gap:10px 24px;margin-top:16px}
#snapshot .sn-nodes dt{padding:0;font:500 15px/1.6 "IBM Plex Sans",sans-serif;letter-spacing:0;color:var(--ink,#e8e4dc)}
#snapshot .sn-nodes dd{color:var(--ink-dim,#9a958c)}
#snapshot .sn-sec>h3{margin-top:28px;font-size:20px}
#snapshot code{font-size:14px;color:var(--k)}
#snapshot .sn-email{margin-top:16px;font:300 clamp(22px,5vw,34px)/1.3 Fraunces,Georgia,serif}
#snapshot .sn-links{display:flex;gap:18px;margin-top:16px}
#snapshot .sn-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 24px;margin-top:88px;padding-top:16px;border-top:1px solid rgb(var(--edge,232 228 220)/.1);font-size:12px;color:var(--ink-dim,#9a958c)}
@media (max-width:560px){#snapshot dl{grid-template-columns:1fr;gap:0}#snapshot dd{margin-bottom:12px}#snapshot .sn-project{padding-left:14px}}
`
  .trim()
  .replace(/\n/g, "");

/** With JavaScript off there is nothing to wait for. */
const NOSCRIPT_CSS = `#${SNAPSHOT_ID}{animation:none!important;opacity:1!important}`;

// ---- JSON-LD ------------------------------------------------------------------------------

const COUNTRY_CODES: Record<string, string> = { "South Africa": "ZA" };

/** Apps get WebApplication, plain sites WebSite, anything else CreativeWork. */
function projectType(category: string): "WebApplication" | "WebSite" | "CreativeWork" {
  const c = category.toLowerCase();
  if (/\b(app|application|platform|marketplace)\b/.test(c)) return "WebApplication";
  if (/\b(website|site|store|shop)\b/.test(c)) return "WebSite";
  return "CreativeWork";
}

export function jsonLd(c: SiteContent, page: { title: string; description: string }) {
  const { PERSON, PROJECTS } = c;
  const url = `${SITE_URL}/`;
  const ref = (frag: string) => ({ "@id": `${SITE_URL}/#${frag}` });
  const [locality = "", ...rest] = PERSON.location.split(",").map((s) => s.trim());
  const country = rest.join(", ");
  const sameAs = [PERSON.linkedin, PERSON.github].filter((u) => isUrl(u) && /^https?:/.test(u));
  const work = c.SECTIONS.find((s) => s.id === "work");

  const projects = PROJECTS.map((p) => {
    const type = projectType(p.category);
    return {
      "@type": type,
      ...ref(`project-${p.id}`),
      name: p.name,
      url: p.url,
      description: p.summary,
      abstract: p.tagline,
      author: ref("person"),
      keywords: [p.category, p.sector, ...p.stack],
      ...(type === "WebApplication" ? { applicationCategory: p.category } : {}),
      ...(p.year ? { dateCreated: p.year } : {}),
    };
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        ...ref("person"),
        name: PERSON.name,
        givenName: PERSON.first,
        familyName: PERSON.last,
        jobTitle: PERSON.role,
        description: intro(c),
        url,
        image: `${SITE_URL}/portrait.jpg`,
        email: PERSON.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: locality,
          ...(country ? { addressCountry: COUNTRY_CODES[country] ?? country } : {}),
        },
        ...(sameAs.length ? { sameAs } : {}),
        knowsAbout: knowsAbout(c),
      },
      {
        "@type": "WebSite",
        ...ref("website"),
        url,
        name: PERSON.name,
        description: page.description,
        inLanguage: "en-ZA",
        author: ref("person"),
      },
      {
        "@type": "ProfilePage",
        ...ref("page"),
        url,
        name: page.title,
        description: page.description,
        inLanguage: "en-ZA",
        isPartOf: ref("website"),
        mainEntity: ref("person"),
        hasPart: ref("work"),
      },
      {
        "@type": "ItemList",
        ...ref("work"),
        name: work ? `${work.label}: ${work.title}` : "Work",
        numberOfItems: PROJECTS.length,
        itemListElement: PROJECTS.map((p, i) => ({ "@type": "ListItem", position: i + 1, item: ref(`project-${p.id}`) })),
      },
      ...projects,
    ],
  };
}

/** JSON in a <script> must not contain "</script" or "<!--". */
const scriptJson = (data: unknown) => JSON.stringify(data, null, 2).replace(/</g, "\\u003c");

// ---- index.html ---------------------------------------------------------------------------

/** Puts the snapshot into <div id="root"> and the JSON-LD, snapshot CSS and noscript CSS into <head>. */
export function injectSeo(html: string, c: SiteContent): { html: string; tags: HtmlTagDescriptor[] } {
  const rootRe = /<div id="root">\s*<\/div>/;
  if (!rootRe.test(html)) throw new Error('[seo] index.html has no empty <div id="root"></div> to fill');

  const title = decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? c.PERSON.name).trim();
  const description = decode(/<meta\s+name="description"\s+content="([^"]*)"/.exec(html)?.[1] ?? intro(c)).trim();

  return {
    html: html.replace(rootRe, () => `<div id="root">\n${snapshotHtml(c)}\n</div>`),
    tags: [
      { tag: "script", attrs: { type: "application/ld+json" }, children: scriptJson(jsonLd(c, { title, description })), injectTo: "head" },
      { tag: "style", attrs: { id: "snapshot-css" }, children: SNAPSHOT_CSS, injectTo: "head" },
      { tag: "noscript", children: [{ tag: "style", children: NOSCRIPT_CSS }], injectTo: "head" },
    ],
  };
}

// ---- llms.txt -----------------------------------------------------------------------------

export function llmsTxt(c: SiteContent): string {
  const { PERSON, PROJECTS, SKILLS, SECTIONS, SHELL_COMMANDS } = c;
  const title = (id: string) => SECTIONS.find((s) => s.id === id)?.title;
  const out: string[] = [];
  const push = (...lines: string[]) => out.push(...lines);

  push(`# ${PERSON.name}`, "");
  push(`> ${PERSON.role}. Based in ${PERSON.location}. ${PERSON.availability}.`, "");
  push(intro(c), "");
  push(`- Site: ${SITE_URL}/ (one page: ${SECTIONS.map((s) => s.label).join(", ")})`);
  push(`- Email: ${PERSON.email}`);
  if (isUrl(PERSON.linkedin)) push(`- LinkedIn: ${PERSON.linkedin}`);
  if (isUrl(PERSON.github)) push(`- GitHub: ${PERSON.github}`);
  push("");

  push(`## Work`, "");
  if (title("work")) push(`${title("work")}.`, "");
  for (const p of PROJECTS) {
    push(`- [${p.name}](${p.url}): ${p.summary}`);
    push(`  - ${p.category} · ${p.sector}${p.year ? ` · ${p.year}` : ""}`);
    push(`  - Stack: ${p.stack.join(", ")}`);
    for (const h of p.highlights) push(`  - ${h}`);
    if (p.note) push(`  - Note: ${p.note}`);
  }
  push("");

  push(`## Stack`, "");
  if (title("stack")) push(`${title("stack")}.`, "");
  for (const l of SKILLS) {
    push(`### ${l.label} (${l.caption})`, "");
    for (const n of l.nodes) push(`- ${n.label}: ${n.note}`);
    push("");
  }

  if (SHELL_COMMANDS.length) {
    push(`## Play`, "");
    push(
      `The site has a terminal that takes real commands; anything that isn't one is sent on as a question. Commands: ${SHELL_COMMANDS.map((k) => `\`${k.name}\` (${k.desc})`).join(", ")}.`,
      "",
    );
  }

  push(`## Contact`, "");
  push(`${PERSON.availability}.`, "");
  push(`- Email: [${PERSON.email}](mailto:${PERSON.email})`);
  if (isUrl(PERSON.linkedin)) push(`- LinkedIn: [${PERSON.linkedin.replace(/^https?:\/\/(www\.)?/, "")}](${PERSON.linkedin})`);
  if (isUrl(PERSON.github)) push(`- GitHub: [${PERSON.github.replace(/^https?:\/\//, "")}](${PERSON.github})`);
  push("");

  return out.join("\n");
}
