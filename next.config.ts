import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow this host to access Next.js dev resources (HMR) from the local network
  allowedDevOrigins: ["192.168.0.8"],
};

export default nextConfig;
