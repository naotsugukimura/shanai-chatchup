import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel hosting: no 'output: export' — use serverless for API routes
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
