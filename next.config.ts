import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // No experimental flags needed
  },
  // Allow images from any domain
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
