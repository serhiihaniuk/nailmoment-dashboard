import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERCEL_ENV:
      process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "",
  },
  images: {
    remotePatterns: [
      {
        hostname: "public.blob.vercel-storage.com",
        protocol: "https",
      },
      {
        hostname: "**.public.blob.vercel-storage.com",
        protocol: "https",
      },
      {
        hostname: "blob.vercel-storage.com",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
