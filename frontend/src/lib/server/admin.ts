/**
 * Server-only admin queries. All read-only; use directly inside admin pages.
 */
import "server-only";
import { desc, eq, sql, count, isNull } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import {
  users,
  wallets,
  profiles,
  scoreHistory,
  endorsements,
  evaluations,
  evaluationJobs,
  nftCredentials,
  sybilFlags,
  apiKeys,
  webhooks,
  webhookDeliveries,
} from "@reputon/db/schema";

const db = getDb();

export async function getOverviewMetrics() {
  const [u] = await db.select({ n: count() }).from(users);
  const [w] = await db.select({ n: count() }).from(wallets);
  const [p] = await db.select({ n: count() }).from(profiles);
  const [sh] = await db.select({ n: count() }).from(scoreHistory);
  const [e] = await db.select({ n: count() }).from(endorsements);
  const [ev] = await db.select({ n: count() }).from(evaluations);
  const [jobs] = await db.select({ n: count() }).from(evaluationJobs);
  const [nfts] = await db.select({ n: count() }).from(nftCredentials);
  const [flags] = await db.select({ n: count() }).from(sybilFlags);
  const [activeFlags] = await db
    .select({ n: count() })
    .from(sybilFlags)
    .where(isNull(sybilFlags.resolvedAt));
  const [keys] = await db.select({ n: count() }).from(apiKeys);
  const [activeKeys] = await db
    .select({ n: count() })
    .from(apiKeys)
    .where(isNull(apiKeys.revokedAt));
  const [hooks] = await db.select({ n: count() }).from(webhooks);
  const [deliveries] = await db.select({ n: count() }).from(webhookDeliveries);

  return {
    users: u?.n ?? 0,
    wallets: w?.n ?? 0,
    profiles: p?.n ?? 0,
    score_updates: sh?.n ?? 0,
    endorsements: e?.n ?? 0,
    evaluations: ev?.n ?? 0,
    jobs: jobs?.n ?? 0,
    nfts: nfts?.n ?? 0,
    sybil_flags: flags?.n ?? 0,
    sybil_flags_active: activeFlags?.n ?? 0,
    api_keys: keys?.n ?? 0,
    api_keys_active: activeKeys?.n ?? 0,
    webhooks: hooks?.n ?? 0,
    webhook_deliveries: deliveries?.n ?? 0,
  };
}

export async function getScoreDistribution() {
  // Buckets aligned with the contract's category thresholds.
  const rows = await db.execute<{ bucket: string; n: string }>(
    sql`SELECT
          CASE
            WHEN score < 200 THEN 'unverified'
            WHEN score < 500 THEN 'emerging'
            WHEN score < 800 THEN 'trusted'
            ELSE 'eminent'
          END as bucket,
          COUNT(*)::text as n
        FROM ${profiles}
        GROUP BY 1
        ORDER BY 1`
  );
  const order = ["unverified", "emerging", "trusted", "eminent"];
  const map: Record<string, number> = {};
  for (const r of rows as unknown as { bucket: string; n: string }[]) {
    map[r.bucket] = Number(r.n);
  }
  return order.map((b) => ({ bucket: b, count: map[b] ?? 0 }));
}

export async function getRecentUsers(limit = 30) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

export async function getRecentJobs(limit = 50) {
  return db
    .select()
    .from(evaluationJobs)
    .orderBy(desc(evaluationJobs.createdAt))
    .limit(limit);
}

export async function getJobStatusCounts() {
  const rows = await db.execute<{ status: string; n: string }>(
    sql`SELECT status, COUNT(*)::text as n FROM ${evaluationJobs} GROUP BY status`
  );
  const map: Record<string, number> = { queued: 0, running: 0, done: 0, failed: 0 };
  for (const r of rows as unknown as { status: string; n: string }[]) {
    map[r.status] = Number(r.n);
  }
  return map;
}

export async function getActiveSybilFlags(limit = 50) {
  return db
    .select()
    .from(sybilFlags)
    .where(isNull(sybilFlags.resolvedAt))
    .orderBy(desc(sybilFlags.createdAt))
    .limit(limit);
}

export async function getWebhookHealth() {
  const hooks = await db.select().from(webhooks);
  const [delivered] = await db
    .select({ n: count() })
    .from(webhookDeliveries)
    .where(sql`status_code >= 200 AND status_code < 300`);
  const [failed] = await db
    .select({ n: count() })
    .from(webhookDeliveries)
    .where(sql`status_code IS NULL OR status_code >= 400`);
  return {
    hooks,
    delivered: delivered?.n ?? 0,
    failed: failed?.n ?? 0,
  };
}

export async function getRecentDeliveries(limit = 30) {
  return db
    .select()
    .from(webhookDeliveries)
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);
}

export async function setUserRole(userId: string, role: "user" | "admin") {
  await db.update(users).set({ role }).where(eq(users.id, userId));
}
