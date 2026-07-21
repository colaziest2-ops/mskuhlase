import type { Metadata, Viewport } from "next";
import "./globals.css";
import { profile } from "@/lib/data";
import SmoothScroll from "@/components/SmoothScroll";
import CustomCursor from "@/components/ui/CustomCursor";
import MobileNav from "@/components/ui/MobileNav";

export const metadata: Metadata = {
  title: `${profile.name} — ${profile.role}`,
  description: profile.summary,
  keywords: [
    "Software Engineer",
    "Full-Stack Developer",
    "Next.js",
    "React",
    "Video Management Systems",
    "Algorithmic Trading",
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
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="pb-16 md:pb-0">
        {/* Lenis momentum scroll wraps the whole tree */}
        <SmoothScroll>{children}</SmoothScroll>
        {/* Velocity-aware custom cursor (auto-disabled on touch devices) */}
        <CustomCursor />
        {/* Fixed bottom nav — mobile/touch only */}
        <MobileNav />
      </body>
    </html>
  );
}
