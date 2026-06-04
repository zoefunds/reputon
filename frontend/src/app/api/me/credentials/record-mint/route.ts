/**
 * Record-only endpoint for user-signed credential mints.
 *
 * The actual mint() is now signed by the user's wallet and submitted
 * directly to the consensus contract — no server signer involved. This
 * endpoint just lets us (a) audit-log the EVM tx hash, (b) bump our
 * local "last activity" timestamp so the dashboard knows to revalidate.
 *
 * If you're looking for the old server-signed mint path, it lived at
 * /api/me/credentials/mint and is gone on purpose. The contract's
 * mint_self(...) is permissionless for self-mintable tiers (genesis),
 * so the protocol no longer needs to act as proxy.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/user";
import { sameOrigin } from "@/lib/server/csrf";

const Body = z.object({
  tier: z.enum(["genesis", "bronze", "silver", "gold", "eternal"]),
  tx_hash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/u, "tx_hash must be a 0x-prefixed 32-byte hex"),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: { message: "csrf check failed" } }, { status: 403 });
  }
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "invalid body" } }, { status: 400 });
  }

  // No DB write here for now — the credential surfaces via the on-chain
  // read once consensus reaches it. We only log so deploy operators can
  // trace from a tx hash back to a user if needed.
  console.log(
    `[record-mint] user=${u.id ?? "unknown"} wallet=${u.primaryWallet?.address ?? "?"} ` +
      `tier=${parsed.data.tier} tx=${parsed.data.tx_hash}`
  );

  return NextResponse.json({ ok: true, tx_hash: parsed.data.tx_hash });
}
