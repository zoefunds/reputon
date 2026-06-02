import type { Config } from "drizzle-kit";

const url =
  process.env.DATABASE_URL ??
  "postgres://reputon:reputon@localhost:5432/reputon";

export default {
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
} satisfies Config;
