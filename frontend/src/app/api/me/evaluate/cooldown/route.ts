/**
 * GET /api/me/evaluate/cooldown
 *
 * Returns whether the current user can evaluate now, and if not, when
 * the cooldown lifts. The Analyzer reads this to render either the
 * Run-evaluation button or a countdown banner.
 */
import { NextResponse } from "next/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { evaluationJobs } from "@reputon/db/schema";
import { getCurrentUser } from "@/lib/server/user";

const db = getDb();
const EVAL_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });

  const [recent] = await db
    .select({
      createdAt: evaluationJobs.createdAt,
      txHash: evaluationJobs.onchainTxHash,
    })
    .from(evaluationJobs)
    .where(and(eq(evaluationJobs.userId, u.id), ne(evaluationJobs.status, "failed")))
    .orderBy(desc(evaluationJobs.createdAt))
    .limit(1);

  if (!recent || !recent.txHash) {
    return NextResponse.json({
      can_evaluate: true,
      last_evaluated_at: null,
      next_available_at: null,
      seconds_remaining: 0,
      days_remaining: 0,
    });
  }

  const last = new Date(recent.createdAt).getTime();
  const elapsed = Date.now() - last;
  if (elapsed >= EVAL_COOLDOWN_MS) {
    return NextResponse.json({
      can_evaluate: true,
      last_evaluated_at: new Date(last).toISOString(),
      next_available_at: null,
      seconds_remaining: 0,
      days_remaining: 0,
    });
  }

  const secondsRemaining = Math.ceil((EVAL_COOLDOWN_MS - elapsed) / 1000);
  return NextResponse.json({
    can_evaluate: false,
    last_evaluated_at: new Date(last).toISOString(),
    next_available_at: new Date(last + EVAL_COOLDOWN_MS).toISOString(),
    seconds_remaining: secondsRemaining,
    days_remaining: Math.ceil(secondsRemaining / 86400),
  });
}
