/**
 * Link an EVM wallet to the current user via SIWE.
 * POST body: { message: <SiweMessage JSON>, signature: "0x..." }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { SiweMessage } from "siwe";
import { eq, and } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { wallets } from "@reputon/db/schema";
import { auth } from "@/lib/auth";

const db = getDb();

const Body = z.object({
  message: z.string().min(20),
  signature: z.string().min(20),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "invalid body" } }, { status: 400 });
  }

  try {
    const siwe = new SiweMessage(JSON.parse(parsed.data.message));
    const result = await siwe.verify({
      signature: parsed.data.signature,
      domain: new URL(process.env.AUTH_URL ?? "http://localhost:3000").host,
      nonce: siwe.nonce,
    });
    if (!result.success) {
      return NextResponse.json({ error: { message: "signature invalid" } }, { status: 400 });
    }
    const address = siwe.address.toLowerCase();

    // Reject if wallet is already linked to a different user.
    const [existing] = await db.select().from(wallets).where(eq(wallets.address, address)).limit(1);
    if (existing && existing.userId && existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: { message: "wallet already linked to another account" } },
        { status: 409 }
      );
    }
    if (!existing) {
      await db.insert(wallets).values({
        userId: session.user.id,
        address,
        chain: "evm",
        isPrimary: true,
      });
    } else {
      await db
        .update(wallets)
        .set({ userId: session.user.id, isPrimary: true })
        .where(eq(wallets.address, address));
    }
    return NextResponse.json({ linked: true, address });
  } catch (e) {
    return NextResponse.json(
      { error: { message: (e as Error).message } },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const address = (searchParams.get("address") ?? "").toLowerCase();
  if (!address) return NextResponse.json({ error: { message: "address required" } }, { status: 400 });
  await db
    .delete(wallets)
    .where(and(eq(wallets.userId, session.user.id), eq(wallets.address, address)));
  return NextResponse.json({ unlinked: true });
}
