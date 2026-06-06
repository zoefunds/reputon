import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

// Load shared .env from repo root if present (frontend reads server-side vars
// like DATABASE_URL, AUTH_SECRET, etc. that aren't NEXT_PUBLIC_*).
const rootEnv = resolve(process.cwd(), "..", ".env");
if (existsSync(rootEnv)) loadEnv({ path: rootEnv });

const isProd = process.env.NODE_ENV === "production";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4001";
const GENLAYER_RPC =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api";

const CONNECT_SRC = [
  "'self'",
  API_BASE,
  GENLAYER_RPC,
  "https://api.github.com",
  "https://hub.snapshot.org",
  "https://*.googleusercontent.com",
  "https://accounts.google.com",
  // WalletConnect / Reown — relay WebSocket + REST APIs + analytics
  "wss://relay.walletconnect.com",
  "wss://relay.walletconnect.org",
  "https://*.walletconnect.com",
  "https://*.walletconnect.org",
  "https://*.reown.com",
  "https://explorer-api.walletconnect.com",
  "https://pulse.walletconnect.com",
  // Dev only
  isProd ? "" : "ws://localhost:*",
  isProd ? "" : "http://localhost:*",
]
  .filter(Boolean)
  .join(" ");

const FRAME_SRC = [
  "'self'",
  "https://verify.walletconnect.com",
  "https://verify.walletconnect.org",
  // Telegram Login Widget loads its auth dialog in an iframe from
  // oauth.telegram.org. Without this the widget renders nothing.
  "https://oauth.telegram.org",
].join(" ");

// In dev, Next needs 'unsafe-eval' for HMR; in prod we keep it strict.
// telegram.org is needed at runtime because the widget injects a script
// tag pointed at https://telegram.org/js/telegram-widget.js.
const SCRIPT_SRC = isProd
  ? "'self' 'unsafe-inline' https://telegram.org"
  : "'self' 'unsafe-eval' 'unsafe-inline' https://telegram.org";

const CSP = [
  `default-src 'self'`,
  `script-src ${SCRIPT_SRC}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: https:`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `connect-src ${CONNECT_SRC}`,
  `frame-src ${FRAME_SRC}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  isProd ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: { typedRoutes: false },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
    ];
  },
};

export default nextConfig;
