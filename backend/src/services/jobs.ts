/**
 * Evaluation job queue (Postgres-backed, polled by scheduler).
 *
 * In Phase 6 the actual on-chain write happens only when
 * GENLAYER_ACCOUNT_PRIVATE_KEY is set on the backend. Without a signer,
 * jobs are accepted and recorded but marked `failed: no-signer` after one
 * attempt — the engine team / user runs the contract write manually.
 */

import { and, eq, lt, desc, isNotNull } from "drizzle-orm";
import { db, schema } from "./db";
import { fanout } from "./webhooks";
import { reputon, reputonAddress } from "./genlayer";

export type JobStatus = "queued" | "running" | "done" | "failed";

export async function enqueueEvaluation(opts: {
  userId?: string;
  address: string;
  chain?: string;
  signals: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(schema.evaluationJobs)
    .values({
      userId: opts.userId,
      address: opts.address,
      chain: opts.chain ?? "genlayer",
      signals: opts.signals,
      status: "queued",
    })
    .returning();
  return row;
}

export async function listJobs(limit = 25) {
  return db
    .select()
    .from(schema.evaluationJobs)
    .orderBy(desc(schema.evaluationJobs.createdAt))
    .limit(limit);
}

export async function getJob(id: string) {
  const [row] = await db
    .select()
    .from(schema.evaluationJobs)
    .where(eq(schema.evaluationJobs.id, id))
    .limit(1);
  return row;
}

/**
 * Pulled by scheduler. In the user-signed model, the backend no longer
 * submits any on-chain transaction. It only watches "running" jobs that
 * the frontend has already attached a tx hash to, and flips them to
 * "done" + fans out a webhook once the on-chain score reflects the
 * evaluation. Pure-queued jobs (still awaiting the user to sign) are
 * left alone.
 */
export async function processQueue(batch = 5): Promise<number> {
  const jobs = await db
    .select()
    .from(schema.evaluationJobs)
    .where(
      and(
        eq(schema.evaluationJobs.status, "running"),
        isNotNull(schema.evaluationJobs.onchainTxHash)
      )
    )
    .limit(batch);
  if (jobs.length === 0) return 0;
  let processed = 0;
  for (const j of jobs) {
    await db
      .update(schema.evaluationJobs)
      .set({ attempts: j.attempts + 1, updatedAt: new Date() })
      .where(eq(schema.evaluationJobs.id, j.id));

    try {
      await runJob(j);
      // runJob only flips the job to "done" if the on-chain read shows
      // the user's evaluation count has advanced. Otherwise it stays
      // "running" and we'll re-check next tick.
    } catch (e) {
      await db
        .update(schema.evaluationJobs)
        .set({
          status: "failed",
          error: (e as Error).message?.slice(0, 500) ?? "unknown error",
          updatedAt: new Date(),
        })
        .where(eq(schema.evaluationJobs.id, j.id));
    }
    processed++;
  }
  return processed;
}

// Signal compaction lives in the frontend now (the user signs, the user
// compacts what they sign). See frontend/src/lib/server/compactSignals.ts.

/**
 * In the user-signed model this is a *poller*, not a signer.
 *
 * The frontend signed evaluate_and_update from the user's wallet and
 * gave us its EVM tx hash. We watch the on-chain Reputon profile for
 * the user's address; once its evaluation count is non-zero we flip
 * the job to "done" and fan a `score.updated` webhook. Any caller
 * who wants per-tx receipt details can fetch the tx hash directly.
 */
async function runJob(job: typeof schema.evaluationJobs.$inferSelect) {
  if (!job.onchainTxHash) {
    // Nothing for us to watch yet. Caller shouldn't even have picked
    // this row up, but be defensive.
    return;
  }

  let profile: Awaited<ReturnType<typeof reputon.profile>> | null = null;
  try {
    profile = await reputon.profile(job.address);
  } catch {
    // Profile may not exist yet — consensus hasn't reached it. Try again
    // on the next sweep. The stale-job sweeper will eventually kill jobs
    // that never settle.
    return;
  }

  const evaluations = Number(profile?.evaluations ?? 0);
  if (evaluations <= 0) {
    return; // still pending consensus
  }

  await db
    .update(schema.evaluationJobs)
    .set({ status: "done", updatedAt: new Date() })
    .where(eq(schema.evaluationJobs.id, job.id));

  // Best-effort fanout. If this throws, the job is still marked done
  // (the user's score is real on-chain whether the webhook fires or not).
  try {
    await fanout("score.updated", {
      address: job.address,
      score: profile?.score ?? null,
      tx_hash: job.onchainTxHash,
      job_id: job.id,
    });
  } catch {
    /* webhook delivery failures don't block job completion */
  }
  void reputonAddress; // keep import live for future read-path tooling
}

/** Stale-job sweeper. Marks "running" jobs older than 10 minutes as failed. */
export async function sweepStaleJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - 10 * 60_000);
  const r = await db
    .update(schema.evaluationJobs)
    .set({ status: "failed", error: "stale: exceeded execution window", updatedAt: new Date() })
    .where(and(eq(schema.evaluationJobs.status, "running"), lt(schema.evaluationJobs.updatedAt, cutoff)))
    .returning({ id: schema.evaluationJobs.id });
  return r.length;
}

/** Snapshot reputation cache refresh — best-effort. */
export async function refreshScoreCache(addresses: string[]): Promise<number> {
  let n = 0;
  for (const a of addresses) {
    try {
      await reputon.score(a);
      n++;
    } catch {
      // ignore; profile likely doesn't exist on-chain yet
    }
  }
  return n;
}

/** Webhook fanout helper used by inline routes. */
export const emit = fanout;
