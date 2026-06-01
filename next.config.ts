import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local dev was exhausting all system RAM during compile (kernel watchdog
  // panic on a 16 GB machine). These reduce the dev/build memory footprint.
  experimental: {
    // Lowers peak Webpack memory at a small cost to compile speed.
    webpackMemoryOptimizations: true,
    // Don't eagerly load every page's modules into memory on server start.
    preloadEntriesOnStart: false,
  },
};

export default nextConfig;
