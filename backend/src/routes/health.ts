import { Hono } from "hono";
import { sql } from "../services/db";
import { redis } from "../services/redis";
import { storage } from "../services/storage";
import { env } from "../env";

const app = new Hono();

app.get("/", async (c) => {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // postgres
  try {
    await sql`select 1`;
    checks.postgres = { ok: true };
  } catch (e) {
    checks.postgres = { ok: false, detail: (e as Error).message };
  }

  // redis
  try {
    const pong = await redis().ping();
    checks.redis = { ok: pong === "PONG" };
  } catch (e) {
    checks.redis = { ok: false, detail: (e as Error).message };
  }

  // s3 (minio)
  try {
    const ok = await storage().bucketExists(env().S3_BUCKET);
    checks.storage = { ok };
  } catch (e) {
    checks.storage = { ok: false, detail: (e as Error).message };
  }

  const allOk = Object.values(checks).every((v) => v.ok);
  return c.json(
    {
      status: allOk ? "ok" : "degraded",
      service: "reputon-backend",
      version: "0.1.0",
      time: new Date().toISOString(),
      checks,
    },
    allOk ? 200 : 503
  );
});

export default app;
