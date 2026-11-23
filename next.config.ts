import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The live-run route reads the deal sources from /data at runtime; make sure
  // they're bundled into the serverless function on Vercel.
  outputFileTracingIncludes: {
    "/api/brief": ["./data/**/*"],
  },
};

export default nextConfig;
