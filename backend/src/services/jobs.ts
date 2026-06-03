/**
 * Evaluation job queue (Postgres-backed, polled by scheduler).
 *
 * In Phase 6 the actual on-chain write happens only when
 * GENLAYER_ACCOUNT_PRIVATE_KEY is set on the backend. Without a signer,
 * jobs are accepted and recorded but marked `failed: no-signer` after one
 * attempt — the engine team / user runs the contract write manually.
 */

import { and, eq, lt, desc } from "drizzle-orm";
import { db, schema } from "./db";
import { fanout } from "./webhooks";
import { reputon, reputonAddress, writeReputon } from "./genlayer";

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

/** Pulled by scheduler. Picks N queued jobs, marks running, runs, marks final. */
export async function processQueue(batch = 5): Promise<number> {
  const jobs = await db
    .select()
    .from(schema.evaluationJobs)
    .where(eq(schema.evaluationJobs.status, "queued"))
    .limit(batch);
  if (jobs.length === 0) return 0;
  let processed = 0;
  for (const j of jobs) {
    await db
      .update(schema.evaluationJobs)
      .set({ status: "running", attempts: j.attempts + 1, updatedAt: new Date() })
      .where(eq(schema.evaluationJobs.id, j.id));

    try {
      await runJob(j);
      await db
        .update(schema.evaluationJobs)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(schema.evaluationJobs.id, j.id));
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

async function runJob(job: typeof schema.evaluationJobs.$inferSelect) {
  const hasSigner = Boolean(process.env.GENLAYER_ACCOUNT_PRIVATE_KEY);
  if (!hasSigner) {
    throw new Error(
      "no on-chain signer configured (set GENLAYER_ACCOUNT_PRIVATE_KEY)"
    );
  }

  const signalsJson = JSON.stringify(job.signals ?? {});
  const txHash = await writeReputon("evaluate_and_update", [job.address, signalsJson]);

  await db
    .update(schema.evaluationJobs)
    .set({ onchainTxHash: txHash, updatedAt: new Date() })
    .where(eq(schema.evaluationJobs.id, job.id));

  // Best-effort: fetch the new score and emit a webhook
  try {
    const score = await reputon.score(job.address);
    await fanout("score.updated", {
      address: job.address,
      score: score?.score ?? null,
      tx_hash: txHash,
      job_id: job.id,
    });
  } catch {
    /* ignore — score may not be readable yet */
  }
  void reputonAddress; // keep import live
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
