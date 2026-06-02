import { config } from "dotenv";
import { z } from "zod";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env from repo root if present.
const rootEnv = resolve(process.cwd(), "../.env");
if (existsSync(rootEnv)) config({ path: rootEnv });
config(); // also load workspace-local .env if any

const Env = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  BACKEND_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgres://reputon:reputon@localhost:5432/reputon"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().default("reputon"),
  S3_SECRET_KEY: z.string().default("reputonsecret"),
  S3_BUCKET: z.string().default("reputon-assets"),
  S3_FORCE_PATH_STYLE: z
    .union([z.string(), z.boolean()])
    .default("true")
    .transform((v) => v === "true" || v === true),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  API_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(120),
});

export type Env = z.infer<typeof Env>;

let _env: Env | null = null;

export function env(): Env {
  if (_env) return _env;
  const parsed = Env.safeParse(process.env);
  if (!parsed.success) {
    console.error("[env] invalid configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  _env = parsed.data;
  return _env;
}
