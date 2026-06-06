/**
 * Server-only helpers for resolving the current user's wallet + profile.
 * Use inside Server Components, Route Handlers, and Server Actions.
 */
import "server-only";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { users, wallets } from "@reputon/db/schema";
import { auth } from "@/lib/auth";

const db = getDb();

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  primaryWallet: {
    address: string;
    chain: string;
    isPrimary: boolean;
    linkedAt: string | null;
  } | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [u] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!u) return null;

  const linked = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, u.id))
    .orderBy(desc(wallets.isPrimary), desc(wallets.createdAt));

  const primary = linked[0] ?? null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    primaryWallet: primary
      ? {
          address: primary.address,
          chain: primary.chain,
          isPrimary: primary.isPrimary,
          // `createdAt` is when the wallet was first linked to this account
          // on Reputon. We use it as the displayed "On-chain age" since the
          // contract itself can't record a real created_at timestamp on
          // this Genlayer SDK (gl.block.timestamp isn't exposed).
          linkedAt: primary.createdAt ? new Date(primary.createdAt).toISOString() : null,
        }
      : null,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("unauthorized");
  return u;
}
