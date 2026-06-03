import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { evaluationJobs } from "@reputon/db/schema";
import { getCurrentUser } from "@/lib/server/user";
import { buildBundle, type SignalInputs } from "@/lib/server/signals";

const db = getDb();

const Body = z.object({
  github_handle: z.string().max(80).optional(),
  governance: z.array(z.any()).max(20).optional(),
  contributions: z.array(z.any()).max(40).optional(),
  endorsements_count: z.number().int().min(0).max(10_000).optional(),
  notes: z.string().max(800).optional(),
});

export async function POST(req: Request) {
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
  const bundle = await buildBundle(u.primaryWallet.address, parsed.data as SignalInputs);
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
      bundle,
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
