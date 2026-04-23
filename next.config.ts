import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {},
  // @ts-ignore - for newer next versions this is top level, for some it's experimental.
  allowedDevOrigins: ['127.0.0.1', 'localhost:3001', '127.0.0.1:3001'],
};

export default nextConfig;
