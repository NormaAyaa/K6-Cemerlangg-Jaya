import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["iceberg-js"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
