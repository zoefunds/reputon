import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { webhooks } from "@reputon/db/schema";
import { auth } from "@/lib/auth";
import { sameOrigin } from "@/lib/server/csrf";

const db = getDb();

const EVENT_TYPES = [
 "profile.created",
 "score.updated",
 "endorsement.added",
 "endorsement.revoked",
 "evaluation.completed",
 "sybil.flagged",
 "nft.minted",
] as const;

const Body = z.object({
 url: z.string().url(),
 eventTypes: z.array(z.enum(EVENT_TYPES)).default([]),
});

const secret = () => "whsec_" + crypto.randomBytes(24).toString("base64url");

export async function GET() {
 const session = await auth();
 if (!session?.user?.id) {
 return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
 }
 const rows = await db.select().from(webhooks).where(eq(webhooks.userId, session.user.id));
 return NextResponse.json({
 webhooks: rows.map(({ secret, ...h }) => ({
 ...h,
 secret_hint: secret.slice(0, 12) + "…",
 })),
 });
}

export async function POST(req: Request) {
 if (!sameOrigin(req)) return NextResponse.json({ error: { message: "csrf check failed" } }, { status: 403 });
 const session = await auth();
 if (!session?.user?.id) {
 return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
 }
 const parsed = Body.safeParse(await req.json().catch(() => ({})));
 if (!parsed.success) {
 return NextResponse.json({ error: { message: "invalid body" } }, { status: 400 });
 }
 const [row] = await db
 .insert(webhooks)
 .values({
 userId: session.user.id,
 url: parsed.data.url,
 secret: secret(),
 eventTypes: parsed.data.eventTypes,
 })
 .returning();
 return NextResponse.json(row, { status: 201 });
}
