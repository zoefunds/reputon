import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

// Load shared .env from repo root if present (frontend reads server-side vars
// like DATABASE_URL, AUTH_SECRET, etc. that aren't NEXT_PUBLIC_*).
const rootEnv = resolve(process.cwd(), "..", ".env");
if (existsSync(rootEnv)) loadEnv({ path: rootEnv });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
