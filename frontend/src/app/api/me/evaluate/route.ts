import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { evaluationJobs } from "@reputon/db/schema";
import { getCurrentUser } from "@/lib/server/user";
import { buildBundle, type SignalInputs } from "@/lib/server/signals";
import { compactSignalsJson } from "@/lib/server/compactSignals";
import { sameOrigin } from "@/lib/server/csrf";

const db = getDb();

const Body = z.object({
 github_handle: z.string().max(80).optional(),
 governance: z.array(z.any()).max(20).optional(),
 contributions: z.array(z.any()).max(40).optional(),
 endorsements_count: z.number().int().min(0).max(10_000).optional(),
 notes: z.string().max(800).optional(),
});

const PatchBody = z.object({
 tx_hash: z
 .string()
 .regex(/^0x[0-9a-fA-F]{64}$/u, "tx_hash must be a 0x-prefixed 32-byte hex"),
});

/**
 * POST /api/me/evaluate
 *
 * Assembles the signals bundle, compacts it to fit the on-chain
 * MAX_SIGNALS_LEN cap, and opens a queued job. Does NOT submit on-chain
 * — the frontend signs and submits evaluate_and_update from the user's
 * wallet, then PATCHes us with the tx hash for tracking.
 */
export async function POST(req: Request) {
 if (!sameOrigin(req)) return NextResponse.json({ error: { message: "csrf check failed" } }, { status: 403 });
 const u = await getCurrentUser();
 if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
 if (!u.primaryWallet?.address) {
 return NextResponse.json(
 { error: { message: "link a wallet first" } },
 { status: 412 }
 );
 }
 const parsed = Body.safeParse(await req.json().catch(() => ({})));
 if (!parsed.success) {
 return NextResponse.json(
 { error: { message: "invalid body" } },
 { status: 400 }
 );
 }
 const bundle = await buildBundle(u.primaryWallet.address, parsed.data as SignalInputs, u.id);
 const signalsJson = compactSignalsJson(bundle as unknown as Record<string, unknown>);
 const [row] = await db
 .insert(evaluationJobs)
 .values({
 userId: u.id,
 address: u.primaryWallet.address,
 chain: u.primaryWallet.chain,
 signals: bundle as unknown as Record<string, unknown>,
 status: "queued",
 })
 .returning();
 return NextResponse.json(
 {
 job_id: row.id,
 status: row.status,
 address: row.address,
 target_address: row.address,
 bundle,
 // Pre-compacted JSON the frontend should pass straight into the
 // on-chain evaluate_and_update(target, signals_json) call so what
 // we accept here and what the user signs are byte-identical.
 signals_json: signalsJson,
 },
 { status: 202 }
 );
}

export async function GET(req: Request) {
 const u = await getCurrentUser();
 if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
 const { searchParams } = new URL(req.url);
 const id = searchParams.get("id");
 if (!id) return NextResponse.json({ error: { message: "id required" } }, { status: 400 });
 const [row] = await db
 .select()
 .from(evaluationJobs)
 .where(eq(evaluationJobs.id, id))
 .limit(1);
 if (!row || row.userId !== u.id) {
 return NextResponse.json({ error: { message: "job not found" } }, { status: 404 });
 }
 return NextResponse.json(row);
}

/**
 * PATCH /api/me/evaluate?id=<jobId> { tx_hash }
 *
 * Records the user-signed EVM tx hash that submitted evaluate_and_update
 * to the consensus contract. The backend scheduler watches this column
 * to know which jobs to poll for consensus finalization (and to fan
 * webhooks out from). Without this, the job stays "queued" forever.
 */
export async function PATCH(req: Request) {
 if (!sameOrigin(req)) return NextResponse.json({ error: { message: "csrf check failed" } }, { status: 403 });
 const u = await getCurrentUser();
 if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
 const { searchParams } = new URL(req.url);
 const id = searchParams.get("id");
 if (!id) return NextResponse.json({ error: { message: "id required" } }, { status: 400 });

 const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
 if (!parsed.success) {
 return NextResponse.json(
 { error: { message: parsed.error.issues[0]?.message ?? "invalid body" } },
 { status: 400 }
 );
 }

 const [existing] = await db
 .select()
 .from(evaluationJobs)
 .where(eq(evaluationJobs.id, id))
 .limit(1);
 if (!existing || existing.userId !== u.id) {
 return NextResponse.json({ error: { message: "job not found" } }, { status: 404 });
 }

 const [row] = await db
 .update(evaluationJobs)
 .set({
 onchainTxHash: parsed.data.tx_hash,
 status: "running",
 updatedAt: new Date(),
 })
 .where(eq(evaluationJobs.id, id))
 .returning();
 return NextResponse.json(row);
}
