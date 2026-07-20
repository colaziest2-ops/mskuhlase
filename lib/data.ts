/**
 * Single source of truth for all portfolio content.
 * Pulled from Masakhane Kuhlase's CV. Edit here, not in the components.
 *
 * ⚠️ PLACEHOLDER FIELDS: anywhere you see [FILL: ...] below is a spot where
 * I (the AI) deliberately did NOT invent a number, metric, or personal story —
 * because I don't know if it's true, and fabricated stats on a real portfolio
 * are a bad idea. Swap those for your own real specifics before shipping.
 */

export const profile = {
  name: "Masakhane Kuhlase",
  role: "Full-Stack Developer",
  subrole: "with a Networking & Security Systems background · AxxonSoft",
  location: "Durban, South Africa",
  timezone: "Africa/Johannesburg", // GMT+2
  email: "mskuhlase1011@icloud.com",
  phone: "068 237 2341",
  socials: {
    github: "https://github.com/", // <- replace with your GitHub URL
    linkedin: "https://www.linkedin.com/", // <- replace with your LinkedIn URL
  },
  summary:
    "I studied networking, ended up debugging surveillance software for a living, and somehow that turned me into a full-stack developer. I build apps and web platforms — React, Next.js, the usual suspects — but I still think in packets and uptime. Most developers guess at what happens when a request leaves the browser. I've actually configured the router it goes through.",
  /**
   * Short "journey" beats for an About/timeline block. All pulled straight
   * from your CV — nothing invented here.
   */
  journey: [
    {
      year: "Studied",
      text: "NQF Level 5 IT qualification, Durban — the networking fundamentals that everything else sits on top of.",
    },
    {
      year: "Dec 2022 – Dec 2023",
      text: "Software Engineer at Turnkey IT — cut my teeth across the full software development lifecycle: building, debugging, maintaining.",
    },
    {
      year: "Current",
      text: "Technical Engineer at AxxonSoft — supporting Axxon One, PSIM and Axxon Intellect, building the custom web reporting layer on top, and automating the boring-but-critical stuff with PowerShell and API integrations.",
    },
  ],
  /** [FILL] — one or two true collaboration-style lines, in your own words. */
  collabStyle:
    "[FILL: e.g. \"I like short calls over long email threads, and I'll always tell you early if a deadline looks shaky rather than at the deadline.\"]",
  /** [FILL] — real current availability. Keep this one honest and current. */
  availability:
    "[FILL: e.g. \"Open to freelance web/app work and full-stack roles with a networking or security angle. Based in Durban, happy to work remote across time zones.\"]",
};

/** Playful, rotating status lines for the hero badge — tone, not fact. */
export const statusMessages = [
  "NETWORK STATUS: ONLINE",
  "COFFEE STATUS: REQUIRED",
  "LOAD SHEDDING: NOT TODAY (SO FAR)",
  "BUILD STATUS: PASSING (LOCALLY, ANYWAY)",
  "MOOD: CAUTIOUSLY OPTIMISTIC",
];

/** Skill clusters — feeds the interactive Skill Matrix radar. */
export interface SkillCluster {
  id: string;
  title: string;
  accent: "cyan" | "emerald" | "violet";
  /** 0–100 self-rated proficiency; drives the radar geometry */
  level: number;
  skills: string[];
  /** A short, human sentence — the "why", not just the "what". */
  story: string;
}

export const skillClusters: SkillCluster[] = [
  {
    id: "appdev",
    title: "App & Web Development",
    accent: "cyan",
    level: 85,
    skills: ["Custom Web Development", "HTML5", "Client Reporting UIs", "Responsive Layout"],
    story:
      "This is what I get hired for these days. I build the dashboards and reporting tools clients actually open every morning — which means they need to be fast and boring in the best way, not clever for the sake of it.",
  },
  {
    id: "backend",
    title: "Backend & Languages",
    accent: "violet",
    level: 82,
    skills: ["Java", "C++", "Python", "PHP", "C#", "PowerShell Automation"],
    story:
      "Jack of a few trades. PowerShell is the one I reach for most — I built an automated daily report that used to be manual, [FILL: e.g. saved roughly X hours a week], and now nobody has to remember to run it.",
  },
  {
    id: "network",
    title: "Networking & Infrastructure",
    accent: "emerald",
    level: 88,
    skills: ["Cisco Technologies", "Network Configuration", "Troubleshooting", "Windows / Linux", "Microsoft Azure"],
    story:
      "This is where I started, and it still shapes how I build. When I deployed Axxon One clusters for a mining client, half the job was network topology, not software. Most devs never have to think about that layer. I don't have a choice.",
  },
  {
    id: "data",
    title: "Data & Security Systems",
    accent: "cyan",
    level: 84,
    skills: ["SQL", "PostgreSQL", "Axxon One / PSIM", "Video Analytics (LPR)", "Encrypted Delivery"],
    story:
      "Security systems don't forgive sloppy data handling — the retail crime reports I built pull from live analytics and go out encrypted, because they contain exactly the kind of information you don't want leaking.",
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
  url: string;
  stack: string[];
  accent: "cyan" | "emerald" | "violet";
  lighthouse: number;
  loadMs: number;
}

export const projects: Project[] = [
  {
    id: "nsk",
    name: "NSK Innovations",
    category: "Corporate & Modern Tech Platform",
    focus:
      "A component-driven Next.js build for a modern tech platform — kinetic UI, layout that doesn't jump around while it loads.",
    challenge:
      "[FILL: e.g. \"The brand wanted motion everywhere, but every animation library I tried tanked mobile performance until I rebuilt the transitions with CSS instead of JS.\"]",
    lesson:
      "[FILL: e.g. \"Learned to profile on an actual mid-range Android before calling anything 'done'.\"]",
    url: "https://nskinnovations.vercel.app/",
    stack: ["Next.js", "React", "Framer Motion", "Tailwind"],
    accent: "cyan",
    lighthouse: 98,
    loadMs: 620,
  },
  {
    id: "ruz",
    name: "Ruz Group",
    category: "Enterprise Agricultural Technology",
    focus:
      "A modular frontend for a multi-division agricultural business — one brand, several very different product lines under it.",
    challenge:
      "[FILL: e.g. \"Each division wanted its own visual identity while staying recognisably 'Ruz'. Solved it with a shared component library and per-division theme tokens.\"]",
    lesson: "[FILL]",
    url: "https://ruzgroup.vercel.app/",
    stack: ["Next.js", "TypeScript", "Tailwind"],
    accent: "emerald",
    lighthouse: 97,
    loadMs: 540,
  },
  {
    id: "wow",
    name: "Wrench on Wheels",
    category: "On-Demand Service & Logistics App",
    focus:
      "A mobile-first booking app for on-demand mechanics — built for people standing next to a broken-down car, not sitting at a desk.",
    challenge:
      "[FILL: e.g. \"Booking flows kept failing on patchy 3G during testing — added optimistic UI so the app never looks stuck even when the network is.\"]",
    lesson: "[FILL]",
    url: "https://wrench-on-wheels.vercel.app/",
    stack: ["React", "State Machines", "Tailwind"],
    accent: "violet",
    lighthouse: 96,
    loadMs: 710,
  },
  {
    id: "monate",
    name: "Monate Cakes",
    category: "Interactive E-Commerce / Showcase",
    focus:
      "A visual-first product showcase — the kind of site where the photography has to do most of the talking.",
    challenge: "[FILL]",
    lesson: "[FILL]",
    url: "https://monate-cakes.github.io/",
    stack: ["JavaScript", "GitHub Pages", "CSS3"],
    accent: "cyan",
    lighthouse: 94,
    loadMs: 480,
  },
  {
    id: "oxygas",
    name: "Oxygas",
    category: "Industrial Web Infrastructure",
    focus:
      "Secure server hosting and an SSL rewrite pipeline for an industrial client — this one's more infrastructure than interface.",
    challenge:
      "[FILL: e.g. \"Inherited an IIS setup with an expired cert chain and a redirect loop nobody could trace — fixed it by rebuilding the SolidCP rewrite rules from scratch.\"]",
    lesson: "[FILL]",
    url: "https://www.oxygas.co.za/Index.html",
    stack: ["IIS", "SolidCP", "SSL Pipeline"],
    accent: "emerald",
    lighthouse: 90,
    loadMs: 830,
  },
  {
    id: "myaluza",
    name: "Myaluza Civils",
    category: "Civil Engineering Corporate Hub",
    focus:
      "An enterprise site with managed domains and hosting set up for uptime, not just looks.",
    challenge: "[FILL]",
    lesson: "[FILL]",
    url: "https://myaluzacivils.com/",
    stack: ["Web Hosting", "Domain Mgmt", "HTML5"],
    accent: "violet",
    lighthouse: 92,
    loadMs: 760,
  },
];

export const stats = [
  { value: 99.99, suffix: "%", label: "Network Uptime Supported", decimals: 2 },
  { value: 6, suffix: "+", label: "Deployed Web Platforms", decimals: 0 },
  { value: 100, prefix: "<", suffix: "ms", label: "Edge Analytics Latency", decimals: 0 },
];

/** A few true-ish, low-stakes lines for the terminal's `joke` command. */
export const jokes = [
  "There are only 10 types of people: those who understand binary, and those who don't.",
  "I told my router a joke about UDP. Not sure if it got it.",
  "99 little bugs in the code, 99 little bugs — take one down, patch it around, 127 little bugs in the code.",
  "The best time to plant a static IP was 20 years ago. The second best time is now.",
];

/** Durban-flavoured trivia for the terminal's `durban` command — generic,
 * not personal claims, safe as color commentary. */
export const durbanFacts = [
  "Durban has the busiest port in Africa — which is a good analogy for what a load balancer does, if you squint.",
  "The Golden Mile is right there and I still spend more time looking at a terminal than the ocean. Priorities.",
  "Durban's humidity has personally taken down more of my hardware than any DDoS attempt ever has.",
];
