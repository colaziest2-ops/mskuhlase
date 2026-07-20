/**
 * Single source of truth for all portfolio content.
 * Pulled from Masakhane Kuhlase's CV + the project brief so every section
 * renders from one place — edit here, not in the components.
 */

export const profile = {
  name: "Masakhane Kuhlase",
  role: "Technical Engineer",
  subrole: "Security Systems Specialist · AxxonSoft",
  location: "Durban, South Africa",
  timezone: "Africa/Johannesburg", // GMT+2
  email: "mskuhlase1011@icloud.com",
  phone: "068 237 2341",
  socials: {
    github: "https://github.com/", // <- replace with your GitHub URL
    linkedin: "https://www.linkedin.com/", // <- replace with your LinkedIn URL
  },
  summary:
    "Technical Engineer specialising in real-time security management platforms. I support, troubleshoot and extend AxxonSoft systems (Axxon One, PSIM, Axxon Intellect), configure advanced video analytics, and build custom web tooling that turns raw telemetry into decisions.",
};

/** 2027 skill clusters — feeds the interactive Skill Matrix radar. */
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
    id: "realtime",
    title: "Real-Time Systems & Analytics",
    accent: "cyan",
    level: 92,
    skills: ["Axxon One / PSIM", "Video Analytics (LPR)", "API Integration", "PowerShell Automation"],
  },
  {
    id: "fullstack",
    title: "Full-Stack Architecture",
    accent: "violet",
    level: 80,
    skills: ["Java", "C++", "Python", "PHP", "C#", "HTML5"],
  },
  {
    id: "infra",
    title: "Cloud & Edge Infrastructure",
    accent: "emerald",
    level: 78,
    skills: ["Microsoft Azure", "Windows / Linux", "Networking", "Cisco Technologies"],
  },
  {
    id: "frontend",
    title: "Interactive Frontend",
    accent: "cyan",
    level: 74,
    skills: ["Custom Web Dev", "Client Reporting UI", "Responsive Layout", "Data Visualisation"],
  },
  {
    id: "data",
    title: "Database & Performance",
    accent: "violet",
    level: 84,
    skills: ["SQL", "PostgreSQL", "Complex Aggregates", "Encrypted Delivery"],
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
      "Kinetic UI system with a component-driven Next.js architecture and layout optimisations that hold zero cumulative layout shift across breakpoints.",
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
      "Structured modular frontend with high-contrast branding and seamless route transitions across a multi-division product catalogue.",
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
      "Dynamic user flows with real-time booking interactions and a mobile-first performance budget for on-the-move mechanics.",
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
      "Client-side rendered product presentation with fluid asset loading and a visual-first browsing experience.",
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
      "Secure server hosting on IIS/SolidCP with an SSL rewrite security pipeline hardening every request path.",
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
  { value: 99.99, suffix: "%", label: "System Node Uptime", decimals: 2 },
  { value: 6, suffix: "+", label: "Deployed Enterprise Platforms", decimals: 0 },
  { value: 100, prefix: "<", suffix: "ms", label: "Edge Telemetry Latency", decimals: 0 },
];
