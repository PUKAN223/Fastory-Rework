import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ["172.20.10.2", "10.193.97.219", "192.168.1.203"],
  experimental: {
    webpackMemoryOptimizations: true,
    preloadEntriesOnStart: false,
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
