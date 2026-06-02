/**
 * Connectivity smoke test for Postgres + Redis + MinIO.
 * Use after `npm run infra:up` to confirm everything is reachable.
 */
import "../src/env";
import { sql, closeDb } from "../src/services/db";
import { redis, closeRedis } from "../src/services/redis";
import { storage, ensureBucket } from "../src/services/storage";
import { env } from "../src/env";

async function main() {
  const results: Record<string, string> = {};

  try {
    const r = await sql`select now() as now, version() as v`;
    results.postgres = `ok (${r[0].now})`;
  } catch (e) {
    results.postgres = `FAIL: ${(e as Error).message}`;
  }

  try {
    const pong = await redis().ping();
    results.redis = `ok (${pong})`;
  } catch (e) {
    results.redis = `FAIL: ${(e as Error).message}`;
  }

  try {
    const bucket = await ensureBucket();
    results.storage = `ok (bucket=${bucket})`;
  } catch (e) {
    results.storage = `FAIL: ${(e as Error).message}`;
  }

  console.log("=".repeat(60));
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k.padEnd(10)} ${v}`);
  }
  console.log("=".repeat(60));

  await closeDb();
  await closeRedis();

  if (Object.values(results).some((v) => v.startsWith("FAIL"))) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
