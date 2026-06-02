/**
 * Run Drizzle migrations against the configured DATABASE_URL.
 *
 *   npm run db:migrate         # from repo root
 *   npm --workspace backend run migrate
 *
 * Generates new migration files via: npm run db:generate
 */
import "../src/env";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getDb, closeDb } from "@reputon/db/client";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, "../../packages/db/migrations");

async function main() {
  const db = getDb();
  console.log(`[migrate] applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log("[migrate] done");
  await closeDb();
}

main().catch((e) => {
  console.error("[migrate] failed:", e);
  process.exit(1);
});
