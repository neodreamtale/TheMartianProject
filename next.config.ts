import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.30.*.*', 'http://localhost:3001'],
};

export default nextConfig;
