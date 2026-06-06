/**
 * GET /api/me/connections/scan?source=credentials|protocols
 *
 * Public-API scanners that operate on the user's connected wallet.
 * Used by the "Preview" buttons inside the Credentials and Protocols
 * connector cards on the Analyzer page.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/user";
import { scanPassport, scanSnapshot, scanTally } from "@/lib/server/scanners";

export async function GET(req: Request) {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
  if (!u.primaryWallet?.address) {
    return NextResponse.json(
      { error: { message: "link a wallet first" } },
      { status: 412 }
    );
  }
  const address = u.primaryWallet.address;
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");

  if (source === "credentials") {
    const passport = await scanPassport(address);
    return NextResponse.json({ source: "credentials", address, passport });
  }
  if (source === "protocols") {
    const [snapshot, tally] = await Promise.all([scanSnapshot(address), scanTally(address)]);
    // Combined ok if either source returned data; surface both so the
    // Analyzer's preview card can summarise governance + delegation in
    // one line.
    return NextResponse.json({
      source: "protocols",
      address,
      snapshot,
      tally,
      summary: {
        ok: snapshot.ok || tally.ok,
        vote_count: snapshot.vote_count,
        spaces: snapshot.spaces,
        delegated_daos: tally.daos,
      },
    });
  }
  return NextResponse.json(
    { error: { message: "source must be credentials | protocols" } },
    { status: 400 }
  );
}
