import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next.js caps Server Action request bodies at 1MB by default, which the
    // Upload Data page's file (and dataset merge) actions can easily exceed.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
