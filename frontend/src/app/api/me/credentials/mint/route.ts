import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/user";
import { writeNft, hasSigner, addr } from "@/lib/server/genlayer";
import { sameOrigin } from "@/lib/server/csrf";

const Body = z.object({
 tier: z.enum(["genesis", "bronze", "silver", "gold", "eternal"]).default("genesis"),
 name: z.string().min(1).max(80).default("Reputon Genesis"),
 description: z
 .string()
 .max(400)
 .default("Early member of the Reputon reputation protocol."),
 image_uri: z.string().max(400).default(""),
 metadata_json: z.string().max(4000).default("{}"),
});

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
 if (!hasSigner()) {
 return NextResponse.json(
 {
 error: {
 message:
 "minting is paused , backend signer not configured (GENLAYER_ACCOUNT_PRIVATE_KEY).",
 },
 },
 { status: 503 }
 );
 }
 const parsed = Body.safeParse(await req.json().catch(() => ({})));
 if (!parsed.success) {
 return NextResponse.json({ error: { message: "invalid body" } }, { status: 400 });
 }
 const { tier, name, description, image_uri, metadata_json } = parsed.data;

 try {
 // Owner-only `mint(to, name, desc, image_uri, tier, metadata_json, transferable)`
 const txHash = await writeNft("mint", [
 addr(u.primaryWallet.address),
 name,
 description,
 image_uri,
 tier,
 metadata_json,
 false, // soulbound by default
 ]);
 return NextResponse.json({
 minted: true,
 tier,
 to: u.primaryWallet.address,
 tx_hash: txHash,
 });
 } catch (e) {
 return NextResponse.json(
 { error: { message: (e as Error).message } },
 { status: 502 }
 );
 }
}
