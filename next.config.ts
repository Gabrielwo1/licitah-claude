import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    after: true,
  },
  // Allow images from any domain
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
