/**
 * All copy lives here. Project facts and stack badges come from what each live
 * site actually ships; anything that only you know is marked [FILL].
 */

export interface Person {
  readonly name: string;
  readonly first: string;
  readonly last: string;
  readonly role: string;
  readonly location: string;
  readonly availability: string;
  readonly email: string;
  /** Put a PDF in /public and set e.g. "/siyabonga-kuhlase-cv.pdf". Empty = no CV published. */
  readonly resumeUrl: string;
  /** Full profile URLs. Empty strings stay hidden. */
  readonly github: string; // [FILL]
  readonly linkedin: string; // [FILL]
}

export const PERSON: Person = {
  name: "Siyabonga Kuhlase",
  first: "Siyabonga",
  last: "Kuhlase",
  role: "Software Engineer · Full-Stack & Networking · AI Solutions · Technical Operations",
  location: "Durban, South Africa", // [FILL] confirm
  availability: "Open to interesting work",
  email: "mskuhlase1011@icloud.com",
  resumeUrl: "", // [FILL]
  github: "", // [FILL]
  linkedin: "https://www.linkedin.com/in/siyabonga-kuhlase", // [FILL] placeholder — replace with the real profile URL
};

export type ColorName = "amber" | "teal" | "sky" | "violet" | "rose" | "lime";

export interface IntroPart {
  readonly t: string;
  /** Lit in this colour. Unset = plain text. */
  readonly c?: ColorName;
}

export const INTRO_PARTS: readonly IntroPart[] = [
  { t: "I build " },
  { t: "practical software", c: "sky" },
  { t: " and " },
  { t: "keep complex systems running", c: "amber" },
  { t: ". Most of my work sits at the intersection of " },
  { t: "full-stack web applications", c: "sky" },
  { t: " and the infrastructure underneath them — " },
  { t: "video management systems", c: "teal" },
  { t: ", " },
  { t: "networking", c: "violet" },
  { t: ", " },
  { t: "multi-site deployments", c: "rose" },
  { t: ", and " },
  { t: "the databases that hold it all together", c: "amber" },
  { t: ". Lately I've been layering " },
  { t: "AI solutions", c: "lime" },
  { t: " into these environments to surface useful signals faster and reduce manual work. The goal is the same in every project: make things more efficient and contribute to a " },
  { t: "safer, better-run South Africa", c: "rose" },
  { t: "." },
];
export const INTRO = INTRO_PARTS.map((p) => p.t).join("");

export interface Section {
  readonly id: string;
  readonly label: string;
  /** Shown in the rail's readout. */
  readonly title: string;
  /** The section's accent: eyebrow, rule, rail marker, nav highlight. */
  readonly color: ColorName;
}

export const SECTIONS: readonly Section[] = [
  { id: "home", label: "Home", title: "Siyabonga Kuhlase", color: "amber" },
  { id: "work", label: "Work", title: "Seven platforms, all live", color: "rose" },
  { id: "stack", label: "Stack", title: "Interface to server room", color: "teal" },
  { id: "play", label: "Play", title: "Talk to the shell", color: "lime" },
  { id: "contact", label: "Contact", title: "Let's work together", color: "violet" },
];

export interface Project {
  readonly id: string;
  readonly name: string;
  /** Display host, no protocol. */
  readonly domain: string;
  readonly url: string;
  readonly category: string;
  readonly sector: string;
  readonly tagline: string;
  readonly summary: string;
  readonly highlights: readonly string[];
  readonly stack: readonly string[];
  /** One line shown on the peeled strip. Only claims that are visible on the live site. */
  readonly note: string;
  /** Accent for this card (index, note block, tags, status dot). Chosen to read on paper. */
  readonly ac: string;
  /** Optional. Leave unset until you've confirmed it — the strip hides the row. */
  readonly year?: string; // [FILL]
}

export const PROJECTS: readonly Project[] = [
  {
    id: "lumiritin",
    ac: "#1f6fe0",
    name: "Lumiritin",
    domain: "lumiritin.co.za",
    url: "https://lumiritin.co.za/",
    category: "Booking & credentialing platform",
    sector: "Private aviation",
    tagline: "Private aircraft charter for South Africa, with SACAA-verified crew credentials built in.",
    summary:
      "A booking and credentialing platform for private aviation. Passengers request charter quotes between South African airfields, operators find verified flight and cabin crew, and pilots keep their credentials and logbook in one place.",
    highlights: [
      "Charter quote flow across airfields from O.R. Tambo to Kruger Mpumalanga",
      "Separate entry points and sign-up for passengers, operators and pilots",
      "Pilot credential lookup against SACAA records, with expiry reminders and a digital logbook",
      "“Lumi”, an AI concierge for charter questions",
    ],
    stack: ["Next.js", "React", "Tailwind CSS", "Framer Motion", "GSAP"],
    note: "Credential lookups run against SACAA records only with the holder's consent.",
  },
  {
    id: "nsk-innovations",
    ac: "#6d3fe0",
    name: "NSK Innovations",
    domain: "nskinnovations.co.za",
    url: "https://www.nskinnovations.co.za/",
    category: "Agency website",
    sector: "Web design & development",
    tagline: "A Durban studio's site, built to turn a free audit into a signed client.",
    summary:
      "The marketing site for a Durban web design and development studio serving businesses across South Africa — services, portfolio, process and pricing, all funnelling toward a free website audit.",
    highlights: [
      "Conversion path built around a free audit offer, with WhatsApp, phone and email contact",
      "Portfolio of live client builds, a three-stage process and a Digital Care maintenance plan",
      "Pre-rendered, SEO-ready pages with per-page metadata",
      "Locked-down Content-Security-Policy and framing headers",
    ],
    stack: ["React", "Tailwind CSS", "Framer Motion"],
    note: "Ships a strict Content-Security-Policy and framing headers — a marketing site that's locked down.",
  },
  {
    id: "oxy-gas",
    ac: "#d9690b",
    name: "Oxy Gas",
    domain: "oxygas.co.za",
    url: "https://www.oxygas.co.za/",
    category: "E-commerce store",
    sector: "Energy & retail",
    tagline: "Order LPG online with free delivery across Pietermaritzburg.",
    summary:
      "An online store for a Pietermaritzburg LPG distributor that also sells animal feed, animal health products and second-hand furniture. Gas is ordered and paid for online; everything else routes to WhatsApp or the shop floor.",
    highlights: [
      "LPG refill and swap ordering with cart and card checkout through Yoco",
      "Multi-category catalogue with per-category enquiry paths",
      "Store and partner swap-point locations, live trading hours, FAQ and customer reviews",
      "Staff login plus POPIA privacy, terms and returns pages",
    ],
    stack: ["PHP", "Yoco Payments", "JavaScript"],
    note: "Gas is ordered and paid online (Yoco); feed, health products and furniture route to WhatsApp or the shop floor.",
  },
  {
    id: "rainbow-directory",
    ac: "#d12f68",
    name: "Rainbow Directory",
    domain: "rainbow-directory.vercel.app",
    url: "https://rainbow-directory.vercel.app/",
    category: "Services & jobs marketplace",
    sector: "Local services",
    tagline: "Work that works for South Africans — checked pros and jobs, in one directory.",
    summary:
      "A two-sided directory for South Africa: find a checked plumber, electrician, carer or tutor nearby, or find your next job. Professionals set their own rates in rand.",
    highlights: [
      "Search for vetted tradespeople, carers and tutors near you",
      "Job discovery alongside service listings",
      "Pros publish their own rand-denominated rates",
      "PayFast payment integration",
    ],
    stack: ["React", "Vite", "Tailwind CSS", "PayFast"],
    note: "Two-sided: pros set their own rand rates, clients search by trade and area. PayFast on the payments side.",
  },
  {
    id: "ruz-group",
    ac: "#0e8f7d",
    name: "RUZ Group",
    domain: "ruzgroup.vercel.app",
    url: "https://ruzgroup.vercel.app/",
    category: "Corporate website",
    sector: "Engineering & energy",
    tagline: "One digital home for an engineering group with five divisions.",
    summary:
      "The corporate site for an African engineering and sustainable energy group, presenting five divisions — Mining, Oil & Gas, Bio, Energy, and Water & Environment — under one brand.",
    highlights: [
      "Each division gets its own space inside a single brand system",
      "Multi-page client-side routing",
      "Motion-led section transitions",
    ],
    stack: ["React", "React Router", "Tailwind CSS", "Framer Motion"],
    note: "Five divisions under one brand: Mining, Oil & Gas, Bio, Energy, Water & Environment.",
  },
  {
    id: "myaluza-civils",
    ac: "#5b8a0e",
    name: "Myaluza Civils",
    domain: "myaluzacivils.com",
    url: "https://myaluzacivils.com/",
    category: "Company website",
    sector: "Civil engineering & construction",
    tagline: "Where tradition meets innovation — a civils contractor's credentials, online.",
    summary:
      "The company site for a 100% black-owned, BBBEE Level 1 civil engineering and construction firm serving Pietermaritzburg, Durban and wider KwaZulu-Natal.",
    highlights: [
      "Leads with the firm's credentials: ownership and BBBEE Level 1 status",
      "Service and region targeting for KwaZulu-Natal search traffic",
      "Animated, mobile-first presentation",
    ],
    stack: ["React", "Vite", "Tailwind CSS", "Framer Motion"],
    note: "Leads with credentials: 100% black-owned, BBBEE Level 1, serving Pietermaritzburg, Durban and KZN.",
  },
  {
    id: "wrench-on-wheels",
    ac: "#e0472a",
    name: "WrenchOnWheels",
    domain: "wrench-on-wheels.vercel.app",
    url: "https://wrench-on-wheels.vercel.app/",
    category: "On-demand booking app",
    sector: "Automotive services",
    tagline: "Certified mobile mechanics, booked to your door in 60 seconds.",
    summary:
      "An on-demand booking app for mobile mechanics anywhere in South Africa. Describe the problem or pick a service, choose a time and place, and a certified mechanic comes to you.",
    highlights: [
      "Three-step booking: issue or service, then date, time and location",
      "Service catalogue with from-prices in rand, diagnostics to alternator work",
      "Real-time tracking of the mechanic on the way",
    ],
    stack: ["React", "React Router", "Tailwind CSS", "Framer Motion"],
    note: "Published from-prices in rand across ten services, from OBD-II diagnostics to alternator work.",
  },
];

export interface SkillNode {
  /** Also the key into lib/logos.ts (or Logo.tsx's text badges). */
  readonly id: string;
  readonly label: string;
  /** Optional short qualifier set under the label in the diagram, e.g. the product behind a category. */
  readonly tag?: string;
  /** One or two plain operational sentences, shown on hover / focus / tap. */
  readonly note: string;
}

export interface SkillLayer {
  readonly id: string;
  readonly label: string;
  readonly caption: string;
  readonly color: ColorName;
  readonly nodes: readonly SkillNode[];
}

/**
 * Four strata, top (what people touch) to bottom (the server room). Notes say what a tool is
 * used for in this kind of work; project names only appear where PROJECTS above lists that tool.
 */
export const SKILLS: readonly SkillLayer[] = [
  {
    id: "frontend",
    label: "Frontend surface",
    caption: "what people touch",
    color: "sky",
    nodes: [
      {
        id: "nextjs",
        label: "Next.js",
        note: "Routing, server rendering and API routes in one project. Lumiritin's booking and crew-credential flows are built on it.",
      },
      {
        id: "react",
        label: "React",
        note: "Components and state for every interface here. Six of the seven live platforms use it.",
      },
      {
        id: "typescript",
        label: "TypeScript",
        note: "Strict mode on, so a wrong prop or an unhandled null fails the build instead of failing on someone's phone.",
      },
      {
        id: "javascript",
        label: "JavaScript",
        note: "The runtime under everything else in this layer. Plain JS still covers small jobs, like the storefront scripts on Oxy Gas.",
      },
      {
        id: "tailwind",
        label: "Tailwind CSS",
        note: "Utility classes keep spacing and colour consistent without a stylesheet that grows with every page. Used on six of the seven live builds.",
      },
      {
        id: "framer",
        label: "Framer Motion",
        note: "Enter, exit and layout animation for React, used where motion shows what changed. This site skips it and hand-writes its motion.",
      },
      {
        id: "vite",
        label: "Vite",
        note: "Dev server and production builds for React apps that don't need a framework. This site, Rainbow Directory and Myaluza Civils use it.",
      },
    ],
  },
  {
    id: "backend",
    label: "Backend & data",
    caption: "what holds the data",
    color: "violet",
    nodes: [
      {
        id: "nodejs",
        label: "Node.js",
        note: "Server-side JavaScript. This site's contact form and shell assistant run as Node serverless functions.",
      },
      {
        id: "php",
        label: "PHP",
        note: "Server-rendered pages and form handling that run on almost any host. The Oxy Gas storefront is PHP.",
      },
      {
        id: "csharp",
        label: "C#",
        note: "Typed .NET code for Windows services, integrations and internal tools, often running next to SQL Server.",
      },
      {
        id: "sql",
        label: "SQL",
        note: "Joins, indexes and query plans. A slow screen is often a missing index, or a query reading far more rows than it returns.",
      },
      {
        id: "postgresql",
        label: "PostgreSQL",
        note: "Open-source relational database with real constraints, JSON columns and good tooling. A sensible default for a new web app.",
      },
      {
        id: "mssql",
        label: "Microsoft SQL Server",
        note: "Holds event and operations data that gets queried in a hurry during an incident, so indexes, backups and log growth need regular checks.",
      },
    ],
  },
  {
    id: "automation",
    label: "AI & automation",
    caption: "what takes the repetitive work",
    color: "lime",
    nodes: [
      {
        id: "gemini",
        label: "Gemini API",
        tag: "this site's shell",
        note: "The model behind this site's shell. A serverless function keeps the key off the browser and falls back to another Gemini model when one is busy.",
      },
      {
        id: "llm",
        label: "LLM integrations",
        note: "A model given one narrow job inside an existing system, such as summarising, sorting or drafting, so useful signals surface sooner. A person still makes the call.",
      },
      {
        id: "aitools",
        label: "AI tooling",
        note: "Assistants for reading logs, drafting scripts and reviewing code. Good for a first pass; anything headed for production still gets read and tested.",
      },
      {
        id: "powershell",
        label: "PowerShell",
        note: "Scripts for repetitive Windows work: checking services, collecting logs, applying one setting across many machines.",
      },
    ],
  },
  {
    id: "systems",
    label: "Systems & VMS foundation",
    caption: "what it all runs on",
    color: "teal",
    nodes: [
      {
        id: "vms",
        label: "Video Management Systems",
        tag: "Axxon One · PSIM",
        note: "Axxon One as VMS and PSIM: cameras, recording and retention on one side; alarms, event rules and operator views on the other.",
      },
      {
        id: "network",
        label: "Networking",
        note: "Switching, VLANs and IP plans for camera and server networks. Video is heavy, constant traffic, so the network has to be sized for it.",
      },
      {
        id: "multisite",
        label: "Multi-Site Deployment",
        note: "The same configuration, naming and access rules at every site, so each one can be supported the same way.",
      },
      {
        id: "restore",
        label: "Server Nodes",
        tag: "restoration · maintenance",
        note: "Hands-on work in the server room: replacing disks, rebuilding arrays, reinstalling the OS and services, then checking recordings are being written again.",
      },
      {
        id: "linux",
        label: "Linux Migrations",
        note: "Moving services onto Linux hosts: list what actually runs, rebuild it from config, then cut over with a way back.",
      },
    ],
  },
];

export interface ShellCommand {
  readonly name: string;
  readonly desc: string;
}

export const SHELL_COMMANDS: readonly ShellCommand[] = [
  { name: "help", desc: "list commands" },
  { name: "whoami", desc: "who, where, and whether available" },
  { name: "projects", desc: "the seven platforms — projects <n> for detail" },
  { name: "stack", desc: "the four layers, top to bottom" },
  { name: "time", desc: "Durban time, SAST" },
  { name: "cv", desc: "where to get a CV" },
  { name: "clear", desc: "clear the screen" },
];

export const FOOTER = "Built by hand in Durban. Production-aware, deliberately a little rugged.";
