/**
 * GET /api/me/connections
 *
 * Returns the user's current connector state for the Analyzer's
 * connector cards: which OAuth accounts are linked, what wallet is set
 * for wallet-scoped scanners, and which providers we've configured
 * server-side (env-gated buttons that aren't wired won't render as
 * clickable on the UI).
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/user";
import { hasConnection, githubHandle, getHandle } from "@/lib/server/connections";
import { enabledProviders } from "../../../../../auth";

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });

  const [githubLinked, twitterLinked, telegramLinked] = await Promise.all([
    hasConnection(u.id, "github"),
    hasConnection(u.id, "twitter"),
    hasConnection(u.id, "telegram"),
  ]);
  const [gh, tgHandle] = await Promise.all([
    githubLinked ? githubHandle(u.id) : Promise.resolve(null),
    telegramLinked ? getHandle(u.id, "telegram") : Promise.resolve(null),
  ]);

  return NextResponse.json({
    wallet: u.primaryWallet?.address ?? null,
    providers: {
      github: {
        configured: enabledProviders.github,
        connected: githubLinked,
        handle: gh?.login ?? null,
      },
      twitter: {
        configured: enabledProviders.twitter,
        connected: twitterLinked,
        handle: null,
      },
      telegram: {
        configured: enabledProviders.telegram,
        connected: telegramLinked,
        handle: tgHandle,
      },
    },
  });
}
