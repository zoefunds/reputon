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
import { addr, reputon, reputonAddress, writeReputon } from "./genlayer";

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

// Contract-side cap (see intelligent-contracts/reputon.py MAX_SIGNALS_LEN).
const MAX_ONCHAIN_SIGNALS = 4000;
// Headroom for JSON delimiters / commas added when we re-serialize.
const SAFE_BUDGET = 3500;

function clip(s: unknown, n: number): string {
  const str = typeof s === "string" ? s : s == null ? "" : String(s);
  return str.length > n ? str.slice(0, n) : str;
}

/**
 * Reduce a freeform signals object to the small, LLM-scorable surface the
 * contract expects, and guarantee the serialized payload fits under the
 * on-chain MAX_SIGNALS_LEN limit. Drops the bloated GitHub fields (URL
 * templates, repo owner sub-objects, full PR bodies) that have no scoring
 * value but blow the budget by 30×.
 */
function compactSignals(raw: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = raw ?? {};
  const compact: Record<string, unknown> = {};

  if (typeof r.notes === "string" && r.notes.length > 0) {
    compact.notes = clip(r.notes, 600);
  }
  if (typeof r.source === "string") compact.source = clip(r.source, 60);
  if (typeof r.address === "string") compact.address = r.address;
  if (typeof r.generated_at === "string") compact.generated_at = r.generated_at;
  if (typeof r.endorsements_count === "number") {
    compact.endorsements_count = r.endorsements_count;
  }

  // GitHub: keep totals + a thin slice of recent PRs / repos.
  if (r.github && typeof r.github === "object") {
    const g = r.github;
    const gh: Record<string, unknown> = {};
    if (g.user && typeof g.user === "object") {
      gh.user = {
        login: clip(g.user.login, 60),
        followers: typeof g.user.followers === "number" ? g.user.followers : 0,
        public_repos: typeof g.user.public_repos === "number" ? g.user.public_repos : 0,
        created_at: clip(g.user.created_at, 40),
      };
    }
    if (g.totals && typeof g.totals === "object") {
      gh.totals = {
        stars: g.totals.stars ?? 0,
        pr_count: g.totals.pr_count ?? 0,
        merged_pr_count: g.totals.merged_pr_count ?? 0,
        repos_inspected: g.totals.repos_inspected ?? 0,
      };
    }
    if (Array.isArray(g.recent_prs)) {
      gh.recent_prs = g.recent_prs.slice(0, 5).map((p: any) => ({
        title: clip(p?.title, 120),
        state: clip(p?.state, 16),
        merged: Boolean(p?.merged_at),
        repo: clip(p?.base?.repo?.full_name ?? p?.head?.repo?.full_name, 80),
      }));
    }
    if (Array.isArray(g.recent_repos)) {
      gh.recent_repos = g.recent_repos.slice(0, 5).map((repo: any) => ({
        name: clip(repo?.full_name ?? repo?.name, 80),
        language: clip(repo?.language, 32),
        stars: typeof repo?.stargazers_count === "number" ? repo.stargazers_count : 0,
      }));
    }
    compact.github = gh;
  }

  // Governance: dao + role only; drop empty proposal arrays from the wire.
  if (Array.isArray(r.governance)) {
    compact.governance = r.governance.slice(0, 12).map((g: any) => ({
      dao: clip(g?.dao, 80),
      role: clip(g?.role, 24),
    }));
  }

  // Contributions: title + source + (clipped) url.
  if (Array.isArray(r.contributions)) {
    compact.contributions = r.contributions.slice(0, 8).map((c: any) => ({
      source: clip(c?.source, 24),
      title: clip(c?.title, 120),
      url: clip(c?.url, 160),
    }));
  }

  let json = JSON.stringify(compact);
  if (json.length <= SAFE_BUDGET) return json;

  // Still too fat — start shedding lowest-signal sections.
  delete compact.contributions;
  json = JSON.stringify(compact);
  if (json.length <= SAFE_BUDGET) return json;

  delete (compact.github as any)?.recent_repos;
  delete (compact.github as any)?.recent_prs;
  json = JSON.stringify(compact);
  if (json.length <= SAFE_BUDGET) return json;

  // Last resort — hard truncate. The contract still accepts opaque text
  // up to MAX_ONCHAIN_SIGNALS; the LLM will work with whatever it sees.
  return json.slice(0, MAX_ONCHAIN_SIGNALS - 8) + '"}';
}

async function runJob(job: typeof schema.evaluationJobs.$inferSelect) {
  const hasSigner = Boolean(process.env.GENLAYER_ACCOUNT_PRIVATE_KEY);
  if (!hasSigner) {
    throw new Error(
      "no on-chain signer configured (set GENLAYER_ACCOUNT_PRIVATE_KEY)"
    );
  }

  // The contract caps signals at MAX_SIGNALS_LEN (4000 chars). Raw GitHub
  // API dumps recurse into owner objects, URL templates, and full PR
  // bodies — easily 100KB+. Compact to the fields the LLM actually scores
  // and then hard-truncate string values to keep the envelope safe.
  const signalsJson = compactSignals((job.signals ?? {}) as Record<string, unknown>);
  const txHash = await writeReputon("evaluate_and_update", [addr(job.address), signalsJson]);

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
