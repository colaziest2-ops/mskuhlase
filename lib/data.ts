/**
 * Single source of truth for all portfolio content.
 *
 * Project copy and tech badges below were written from what each live site
 * actually ships (its own meta description, visible content and bundles).
 * Anything marked [FILL] is something only you know — replace before shipping.
 */

export const profile = {
  name: "Siyabonga Kuhlase",
  initials: "SK",
  role: "Software Engineer & Technical Operations",
  subrole: "Full-Stack Development · VMS Operations",
  location: "Durban, South Africa", // [FILL] confirm
  timezone: "Africa/Johannesburg", // GMT+2
  email: "mskuhlase1011@icloud.com",
  /** Shown in the hero status badge. Change or blank it if it stops being true. */
  status: "Available for select freelance projects",
  socials: {
    // Bare placeholders are hidden automatically — add your real profile URLs.
    github: "https://github.com/", // [FILL]
    linkedin: "https://www.linkedin.com/", // [FILL]
  },
  /** Optional: put a PDF in /public and set e.g. "/siyabonga-kuhlase-cv.pdf". */
  resumeUrl: "", // [FILL]
  summary:
    "I build web apps and I keep systems running — two things that don't usually sit in the same job description, but here we are. Day to day that's Next.js and React for clients who need a real interface, and SQL Server and server-node work for video management systems running across mine sites. Different problems, same instinct: understand the system before you touch it.",
  availability:
    "Got a question about the site, need something that isn't listed here, or want a copy of my CV? Just ask — happy to provide anything that isn't already on the page.",
};

/** Skill clusters — feed the stack grid, the marquee, the terminal and the AI prompt. */
export interface SkillCluster {
  id: "frontend" | "backend" | "vms-ops";
  title: string;
  skills: string[];
  story: string;
}

export const skillClusters: SkillCluster[] = [
  {
    id: "frontend",
    title: "Frontend & App Development",
    skills: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion", "Vite", "HTML5"],
    story:
      "This is the part clients actually see. Next.js and React for the structure, Tailwind for speed, Framer Motion for the interactions that make an app feel considered instead of just functional.",
  },
  {
    id: "backend",
    title: "Backend & Databases",
    skills: ["Microsoft SQL Server", "SQL", "PHP", "C#"],
    story:
      "Most of my database work isn't for a web app — it's event-protocol data from video management systems. That means schema decisions matter more than usual: this data gets queried under pressure, not browsed at leisure.",
  },
  {
    id: "vms-ops",
    title: "Systems & VMS Operations",
    skills: [
      "Video Management Systems",
      "Server Node Restoration",
      "Networking",
      "Multi-Site Deployment",
    ],
    story:
      "Large-scale VMS rollouts across mine sites taught me that software is only as good as the server room it runs in. I've restored nodes on-site more times than I've shipped a clean deploy from a laptop.",
  },
];

export interface Project {
  id: string;
  name: string;
  /** Display domain, no protocol. */
  domain: string;
  url: string;
  /** Short type label shown on the card. */
  category: string;
  sector: string;
  /** One line for the card. */
  tagline: string;
  /** Paragraph for the drawer. */
  summary: string;
  /** What the product actually does — concrete, verifiable on the live site. */
  highlights: string[];
  stack: string[];
  /** Tint for this card's ambient light. Keep these muted. */
  hue: string;
  /** false when the site forbids framing (X-Frame-Options) — skips the live preview. */
  embed: boolean;
  /** Optional GitHub URL — the "Source" button only renders when this is set. */
  repo?: string;
  /** Optional screenshot in /public (e.g. "/projects/lumiritin.jpg") — replaces the generated card art. */
  image?: string;
}

/** Order matters: it drives the bento layout (see SPANS in Projects.tsx). */
export const projects: Project[] = [
  {
    id: "lumiritin",
    name: "Lumiritin",
    domain: "lumiritin.co.za",
    url: "https://lumiritin.co.za/",
    category: "Booking & credentialing platform",
    sector: "Private aviation",
    tagline:
      "Private aircraft charter for South Africa, with SACAA-verified crew credentials built in.",
    summary:
      "A booking and credentialing platform for private aviation. Passengers request charter quotes between South African airfields, operators find verified flight and cabin crew, and pilots keep their credentials and logbook in one place.",
    highlights: [
      "Charter quote flow with instant estimates across airfields from O.R. Tambo to Kruger Mpumalanga",
      "Separate entry points and sign-up for passengers, operators and pilots",
      "Pilot credential lookup against SACAA records, with expiry reminders and a digital logbook",
      "“Lumi”, an AI concierge for charter questions",
    ],
    stack: ["Next.js", "React", "Tailwind CSS", "Framer Motion", "GSAP"],
    hue: "#7dd3fc",
    embed: true,
  },
  {
    id: "nsk-innovations",
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
    hue: "#a5b4fc",
    embed: false,
  },
  {
    id: "oxy-gas",
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
    hue: "#fcd34d",
    embed: false,
  },
  {
    id: "rainbow-directory",
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
    hue: "#f0abfc",
    embed: true,
  },
  {
    id: "ruz-group",
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
    hue: "#6ee7b7",
    embed: true,
  },
  {
    id: "myaluza-civils",
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
    hue: "#fdba74",
    embed: true,
  },
  {
    id: "wrench-on-wheels",
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
      "Service catalogue with transparent from-prices in rand, diagnostics to alternator work",
      "Real-time tracking of the mechanic on the way",
    ],
    stack: ["React", "React Router", "Tailwind CSS", "Framer Motion"],
    hue: "#fca5a5",
    embed: true,
  },
];

/**
 * Headline numbers. The first two are literal counts of the list above, so
 * they stay true as you add projects; the third is yours to confirm.
 */
export const stats = [
  { value: projects.length, suffix: "", label: "Platforms live in production" },
  {
    value: new Set(projects.map((p) => p.sector)).size,
    suffix: "",
    label: "Industries shipped for",
  },
  { value: 3, suffix: "+", label: "Mine sites serviced (VMS)" }, // [FILL] your real count
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
