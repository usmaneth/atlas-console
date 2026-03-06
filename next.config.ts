import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["http://187.124.91.6:3001", "187.124.91.6"],
};

export default nextConfig;
