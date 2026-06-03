import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/user";
import { fetchSnapshotActivity, persistActivity } from "@/lib/server/governance";
import { sameOrigin } from "@/lib/server/csrf";

export async function GET() {
 const u = await getCurrentUser();
 if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
 if (!u.primaryWallet?.address) {
 return NextResponse.json({ error: { message: "link a wallet first" } }, { status: 412 });
 }
 const activity = await fetchSnapshotActivity(u.primaryWallet.address);
 return NextResponse.json({ activity });
}

export async function POST() {
 const u = await getCurrentUser();
 if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
 if (!u.primaryWallet?.address) {
 return NextResponse.json({ error: { message: "link a wallet first" } }, { status: 412 });
 }
 const activity = await fetchSnapshotActivity(u.primaryWallet.address);
 const persisted = await persistActivity(u.primaryWallet.address, activity);
 return NextResponse.json({ activity, persisted });
}
