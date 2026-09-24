import type { NextConfig } from "next";

// Extra origins the Next.js dev server accepts cross-origin requests from,
// for example a LAN or public IP used to reach the dev server from another
// device. Comma-separated, set per developer, not committed.
const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  allowedDevOrigins,
};

export default nextConfig;
