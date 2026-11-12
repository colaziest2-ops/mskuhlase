import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { profile } from "@/lib/data";
import Providers from "@/components/Providers";
import MobileNav from "@/components/ui/MobileNav";
import ChatWidget from "@/components/ui/ChatWidget";

// Self-hosted at build time by next/font — no render-blocking font requests.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const body = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb", display: "swap" });

export const metadata: Metadata = {
  title: `${profile.name} — ${profile.role}`,
  description: profile.summary,
  keywords: [
    "Software Engineer",
    "Full-Stack Developer",
    "Next.js",
    "React",
    "Video Management Systems",
    profile.name,
  ],
  authors: [{ name: profile.name }],
  openGraph: {
    title: `${profile.name} — ${profile.role}`,
    description: profile.summary,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before paint so a saved "light" preference doesn't flash dark
            first — ThemeToggle.tsx reads/writes the same localStorage key. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}`,
          }}
        />
      </head>
      <body className="pb-16 md:pb-0">
        <Providers>{children}</Providers>
        {/* Fixed bottom nav — mobile/touch only */}
        <MobileNav />
        {/* Floating AI copilot */}
        <ChatWidget />
      </body>
    </html>
  );
}
