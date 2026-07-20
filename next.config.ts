import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three.js ships ESM; transpile for Next's server build
  transpilePackages: ["three"],
};

export default nextConfig;
