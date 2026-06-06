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

  // s3 (minio / R2 / S3) — optional. Default config points at a local
  // minio instance that doesn't exist in prod; only probe when the
  // endpoint has been explicitly overridden, otherwise mark "not
  // configured" so prod health stays "ok" instead of flapping to
  // "degraded" forever for an unused feature.
  const cfg = env();
  const sentinelKeys = new Set(["", "reputon", "disabled", "none", "off"]);
  const hasRealCreds =
    !sentinelKeys.has(cfg.S3_ACCESS_KEY) && !sentinelKeys.has(cfg.S3_SECRET_KEY);
  const usingDefaultEndpoint = cfg.S3_ENDPOINT === "http://localhost:9000";
  if (!usingDefaultEndpoint && hasRealCreds) {
    try {
      const ok = await storage().bucketExists(cfg.S3_BUCKET);
      checks.storage = { ok };
    } catch (e) {
      checks.storage = { ok: false, detail: (e as Error).message };
    }
  } else {
    checks.storage = { ok: true, detail: "not configured" };
  }

  // Health is OK if the two critical deps are up. Storage is reported but
  // does not gate the 200 response — see docs/runbook.md.
  const criticalOk = checks.postgres.ok && checks.redis.ok;
  const allOk = Object.values(checks).every((v) => v.ok);
  return c.json(
    {
      status: allOk ? "ok" : criticalOk ? "degraded" : "down",
      service: "reputon-backend",
      version: "0.1.0",
      time: new Date().toISOString(),
      checks,
    },
    criticalOk ? 200 : 503
  );
});

export default app;
