import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "o2o-static.lotuss.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  allowedDevOrigins: ["172.20.10.2", "10.193.97.219", "192.168.1.203"],
  compress: true,
  experimental: {
    webpackMemoryOptimizations: true,
    preloadEntriesOnStart: false,
    optimizePackageImports: ["lucide-react", "@tabler/icons-react", "recharts", "date-fns"]
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
