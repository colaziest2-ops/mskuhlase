/**
 * Single source of truth for all portfolio content.
 * Pulled from Masakhane Kuhlase's CV. Edit here, not in the components.
 */

export const profile = {
  name: "Masakhane Kuhlase",
  role: "App & Web Developer",
  subrole: "Networking & Security Systems Engineer · AxxonSoft",
  location: "Durban, South Africa",
  timezone: "Africa/Johannesburg", // GMT+2
  email: "mskuhlase1011@icloud.com",
  phone: "068 237 2341",
  socials: {
    github: "https://github.com/", // <- replace with your GitHub URL
    linkedin: "https://www.linkedin.com/", // <- replace with your LinkedIn URL
  },
  summary:
    "I'm an App & Web Developer with a networking and security-systems engineering background. At AxxonSoft I build the custom web tooling that sits on top of live surveillance infrastructure, which means every interface I ship has to hold up against real network conditions — not just look good on a fast connection.",
};

/** Skill clusters — feeds the interactive Skill Matrix radar. */
export interface SkillCluster {
  id: string;
  title: string;
  accent: "cyan" | "emerald" | "violet";
  /** 0–100 self-rated proficiency; drives the radar geometry */
  level: number;
  skills: string[];
}

export const skillClusters: SkillCluster[] = [
  {
    id: "appdev",
    title: "App & Web Development",
    accent: "cyan",
    level: 85,
    skills: ["Custom Web Development", "HTML5", "Client Reporting UIs", "Responsive Layout"],
  },
  {
    id: "backend",
    title: "Backend & Languages",
    accent: "violet",
    level: 82,
    skills: ["Java", "C++", "Python", "PHP", "C#", "PowerShell Automation"],
  },
  {
    id: "network",
    title: "Networking & Infrastructure",
    accent: "emerald",
    level: 88,
    skills: ["Cisco Technologies", "Network Configuration", "Troubleshooting", "Windows / Linux", "Microsoft Azure"],
  },
  {
    id: "data",
    title: "Data & Security Systems",
    accent: "cyan",
    level: 84,
    skills: ["SQL", "PostgreSQL", "Axxon One / PSIM", "Video Analytics (LPR)", "Encrypted Delivery"],
  },
];

/** Featured project showcase. */
export interface Project {
  id: string;
  name: string;
  category: string;
  focus: string;
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
      "Component-driven Next.js build with layout optimisations that hold zero cumulative layout shift across breakpoints.",
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
      "Modular frontend with high-contrast branding and seamless route transitions across a multi-division product catalogue.",
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
      "Real-time booking flows on a mobile-first performance budget for mechanics working on the move.",
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
      "Client-side rendered product presentation with fluid asset loading for a visual-first browsing experience.",
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
      "Secure server hosting on IIS/SolidCP with an SSL rewrite pipeline hardening every request path — the networking side of the build.",
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
      "Enterprise web structure with managed domains and a high-availability hosting configuration.",
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
