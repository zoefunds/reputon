import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/user";
import { fetchSnapshotActivity, persistActivity } from "@/lib/server/governance";
import { sameOrigin } from "@/lib/server/csrf";

function emptyActivity(address: string) {
  return {
    address: address.toLowerCase(),
    fetchedAt: new Date().toISOString(),
    votes: [],
    proposals: [],
    daos: [],
  };
}

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
  if (!u.primaryWallet?.address) {
    return NextResponse.json({ error: { message: "link a wallet first" } }, { status: 412 });
  }
  try {
    const activity = await fetchSnapshotActivity(u.primaryWallet.address);
    return NextResponse.json({ activity });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[reputon] snapshot fetch failed:", e);
    return NextResponse.json({
      activity: emptyActivity(u.primaryWallet.address),
      warning: "Snapshot.org is currently unreachable. Showing empty results.",
    });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: { message: "csrf check failed" } }, { status: 403 });
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
  if (!u.primaryWallet?.address) {
    return NextResponse.json({ error: { message: "link a wallet first" } }, { status: 412 });
  }
  try {
    const activity = await fetchSnapshotActivity(u.primaryWallet.address);
    const persisted = await persistActivity(u.primaryWallet.address, activity);
    return NextResponse.json({ activity, persisted });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[reputon] snapshot persist failed:", e);
    return NextResponse.json({
      activity: emptyActivity(u.primaryWallet.address),
      persisted: 0,
      warning: "Snapshot.org is currently unreachable.",
    });
  }
}
