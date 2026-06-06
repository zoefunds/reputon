/**
 * Per-user "connected accounts" surface.
 *
 * Reads from the Auth.js `accounts` table (oauth tokens + provider handles)
 * and from the user's primaryWallet. Used by the Analyzer to render the
 * connector cards and by the signal builder to decide which sources to
 * pull from when assembling an evaluation bundle.
 */
import "server-only";
import { eq, and } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { accounts } from "@reputon/db/schema";

const db = getDb();

export type ProviderId = "github" | "google" | "twitter";

export type ConnectedAccount = {
  provider: ProviderId;
  providerAccountId: string;
  /** Provider-side username/handle if we have it cached. */
  handle: string | null;
  accessToken: string | null;
  /** Unix seconds when the access_token expires, if the provider gave one. */
  expiresAt: number | null;
};

/** Returns all OAuth connections for the user. */
export async function getConnections(userId: string): Promise<ConnectedAccount[]> {
  const rows = await db.select().from(accounts).where(eq(accounts.userId, userId));
  return rows
    .filter((r): r is typeof r & { provider: ProviderId } =>
      ["github", "google", "twitter"].includes(r.provider)
    )
    .map((r) => ({
      provider: r.provider,
      providerAccountId: r.providerAccountId,
      // Auth.js doesn't store the handle directly; for GitHub we use the
      // providerAccountId (numeric user id) and the access token will give
      // us the handle on demand. Callers that need the username should
      // call `githubHandle(userId)` or use the per-provider scan helpers.
      handle: null,
      accessToken: (r as { access_token?: string | null }).access_token ?? null,
      expiresAt: (r as { expires_at?: number | null }).expires_at ?? null,
    }));
}

/** Resolves a user's GitHub handle by hitting /user with their token. */
export async function githubHandle(userId: string): Promise<{ login: string; followers: number; public_repos: number; created_at: string } | null> {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "github")))
    .limit(1);
  const token = (row as { access_token?: string | null } | undefined)?.access_token;
  if (!token) return null;
  try {
    const r = await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "user-agent": "reputon-analyzer",
      },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      login: string;
      followers: number;
      public_repos: number;
      created_at: string;
    };
    return {
      login: j.login,
      followers: j.followers,
      public_repos: j.public_repos,
      created_at: j.created_at,
    };
  } catch {
    return null;
  }
}

/** Whether the user has a connection for the given provider. */
export async function hasConnection(userId: string, provider: ProviderId): Promise<boolean> {
  const [row] = await db
    .select({ id: accounts.providerAccountId })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)))
    .limit(1);
  return Boolean(row);
}
