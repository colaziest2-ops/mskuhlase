/**
 * Single source of truth for all portfolio content.
 *
 * ⚠️ PLACEHOLDER FIELDS: [FILL: ...] marks anything I didn't invent — a
 * specific date, employer name, metric, or live URL I wasn't given. Replace
 * those with your real details before shipping. Everything else here comes
 * directly from what you specified.
 */

export const profile = {
  name: "Siyabonga Kuhlase",
  role: "Software Engineer & Technical Operations",
  subrole: "Full-Stack Development · VMS Operations",
  location: "Durban, South Africa", // [FILL] confirm — carried over, update if wrong
  timezone: "Africa/Johannesburg", // GMT+2
  email: "mskuhlase1011@icloud.com",
  phone: "[FILL: your real phone]",
  socials: {
    github: "https://github.com/", // <- replace with your GitHub URL
    linkedin: "https://www.linkedin.com/", // <- replace with your LinkedIn URL
  },
  summary:
    "I build web apps and I keep systems running — two things that don't usually sit in the same job description, but here we are. Day to day that's Next.js and React for clients who need a real interface, and SQL Server and server-node work for video management systems running across mine sites. Different problems, same instinct: understand the system before you touch it.",
  journey: [
    {
      year: "[FILL: year]",
      text: "[FILL: e.g. \"Started in technical operations — VMS deployment, SQL-backed event protocols, the unglamorous server-room work that keeps a system honest.\"]",
    },
    {
      year: "[FILL: year]",
      text: "[FILL: e.g. \"Moved into full-stack development — Next.js, React, Tailwind — while keeping one foot in operations.\"]",
    },
    {
      year: "Ongoing",
      text: "Split between client web builds and large-scale VMS work across mine sites.",
    },
  ],
  collabStyle: "",
  availability:
    "Got a question about the site, need something that isn't listed here, or want a copy of my CV? Just ask — happy to provide anything that isn't already on the page.",
};

export const statusMessages = [
  "SYSTEM STATUS: ONLINE",
  "COFFEE STATUS: REQUIRED",
  "LOAD SHEDDING: NOT TODAY (SO FAR)",
  "BUILD STATUS: PASSING (LOCALLY, ANYWAY)",
];

/** Skill clusters — feeds the interactive Skill Matrix radar. */
export interface SkillCluster {
  id: string;
  title: string;
  accent: "cyan" | "emerald" | "violet";
  /** 0–100 self-rated proficiency; drives the radar geometry */
  level: number;
  skills: string[];
  story: string;
}

export const skillClusters: SkillCluster[] = [
  {
    id: "frontend",
    title: "Frontend & App Development",
    accent: "cyan",
    level: 86,
    skills: ["Next.js", "React", "Tailwind CSS", "Framer Motion", "HTML5"],
    story:
      "This is the part clients actually see. Next.js and React for the structure, Tailwind for speed, Framer Motion for the interactions that make an app feel considered instead of just functional.",
  },
  {
    id: "backend",
    title: "Backend & Databases",
    accent: "violet",
    level: 80,
    skills: ["Microsoft SQL Server", "SQL", "PHP", "C#"],
    story:
      "Most of my database work isn't for a web app — it's event-protocol data from video management systems. That means schema decisions matter more than usual: this data gets queried under pressure, not browsed at leisure.",
  },
  {
    id: "vms-ops",
    title: "Systems & VMS Operations",
    accent: "emerald",
    level: 88,
    skills: ["Video Management Systems", "Server Node Restoration", "Networking", "Multi-Site Deployment"],
    story:
      "Large-scale VMS rollouts across mine sites taught me that software is only as good as the server room it runs in. I've restored nodes on-site more times than I've shipped a clean deploy from a laptop.",
  },
];

/** Featured project showcase. */
export interface Project {
  id: string;
  name: string;
  category: string;
  focus: string;
  /** [FILL] — a specific, true challenge you solved on this build. */
  challenge: string;
  /** [FILL] — what you'd do differently, or what it taught you. */
  lesson: string;
  /** Empty string = no public link yet. Projects.tsx handles this gracefully. */
  url: string;
  stack: string[];
  accent: "cyan" | "emerald" | "violet";
  /** Optional — only include real, measured numbers. Leave undefined otherwise. */
  lighthouse?: number;
  loadMs?: number;
}

export const projects: Project[] = [
  {
    id: "teez-flexx",
    name: "Teez-Flexx Mobiles",
    category: "E-Commerce & Service Booking",
    focus:
      "An e-commerce platform with a custom repair-booking system built in — calendar integrations, fluid UI animations, and a storefront that doesn't feel bolted together.",
    challenge:
      "[FILL: e.g. \"Booking and checkout needed to share state without feeling like two different apps — solved with a shared context layer across both flows.\"]",
    lesson: "[FILL]",
    url: "", // [FILL: add live URL when available]
    stack: ["Next.js", "React", "Framer Motion", "Tailwind CSS"],
    accent: "cyan",
  },
  {
    id: "ruz-bio",
    name: "Ruz Bio",
    category: "Corporate & AgriTech Digital Presence",
    focus:
      "A company profile and digital footprint built entirely around modern agricultural technology and sustainable farming — the brand had to read as credible to both investors and farmers.",
    challenge: "[FILL]",
    lesson: "[FILL]",
    url: "", // [FILL: add live URL when available]
    stack: ["Next.js", "Tailwind CSS", "Framer Motion"],
    accent: "emerald",
  },
  {
    id: "wrench-on-wheels",
    name: "Wrench on Wheels",
    category: "Mobile Service Business Framework",
    focus:
      "Web presence and business framework for a remote mobile vehicle cleaning and detailing service, with dynamic pricing rules that adjust to vehicle type and condition rather than one flat rate.",
    challenge:
      "[FILL: e.g. \"Pricing had too many variables for a static table — built a small rules engine instead of hardcoding every vehicle/condition combination.\"]",
    lesson: "[FILL]",
    url: "", // [FILL: add live URL when available]
    stack: ["React", "Tailwind CSS", "Pricing Rules Engine"],
    accent: "violet",
  },
];

/**
 * These are intentionally conservative. The first is a literal count of the
 * list above; the second is a placeholder — swap in your real number.
 */
export const stats = [
  { value: projects.length, suffix: "+", label: "Projects Shipped", decimals: 0 },
  { value: 3, suffix: "+", label: "Mine Sites Serviced (VMS)", decimals: 0 }, // [FILL] your real count
  { value: 100, prefix: "<", suffix: "ms", label: "Edge System Latency", decimals: 0 }, // [FILL] your real number
];

/** Terminal `joke` command pool. */
export const jokes = [
  "There are only 10 types of people: those who understand binary, and those who don't.",
  "I asked the compiler for closure. It gave me a stack trace instead.",
  "99 little bugs in the code, 99 little bugs — take one down, patch it around, 127 little bugs in the code.",
  "The best time to write a test was before you shipped. The second best time is now.",
];

/** Terminal `durban` command pool — color commentary, not personal claims. */
export const durbanFacts = [
  "Durban has the busiest port in Africa — a decent analogy for what a load balancer does, if you squint.",
  "The Golden Mile is right there and I still spend more time looking at a terminal than the ocean. Priorities.",
  "Durban's humidity has personally taken down more of my hardware than any DDoS attempt ever has.",
];

/** Terminal `ping` command pool — technical, fun-fact, and joke flavours, so
 * pinging three times in a row doesn't look like the same canned response. */
export const pingFlavourFacts = [
  "Average intercontinental fibre round-trip is ~150ms. Most of my UI updates faster than that.",
  "Ping originally meant nothing — Mike Muuss named it after sonar, then reverse-engineered the acronym later.",
  "Somewhere a server node is booting back up right now. This ping is faster than that, at least.",
];
export const pingJokes = [
  "Pinged the CTO. No response. Typical.",
  "Packet returned. Slightly judgmental about the request, but it returned.",
  "Latency's fine. It's the load-shedding schedule that's the real unpredictable variable here.",
];

/**
 * Gemini "-latest" aliases — Google maintains these specifically so code
 * doesn't hardcode a dated model name that later gets retired for new API
 * keys (which is exactly what happened with gemini-2.5-flash: it appeared in
 * the /v1beta/models list but returned 404 "no longer available to new
 * users" when actually called). These aliases always point to whatever
 * Google currently recommends, so this class of error shouldn't recur.
 * Shared between the client Terminal (model switcher UI) and the server
 * /api/gemini route (validation allow-list) so they can never drift apart.
 */
export const ALLOWED_GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-pro-latest",
] as const;
export type GeminiModel = (typeof ALLOWED_GEMINI_MODELS)[number];
export const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-flash-latest";
