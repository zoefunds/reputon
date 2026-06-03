/**
 * API key issuance + verification.
 *
 * Key format:  rk_<env>_<24-char base32>
 * Stored as:   SHA-256 hex of the full key (idempotent, fast, sufficient
 *              because keys themselves are 120+ bits of randomness).
 *
 * The full key is shown to the user EXACTLY ONCE on creation.
 */

import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { getCached, setCached, invalidate } from "./cache";

const PREFIX = "rk_";
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export type Env = "test" | "live";

export type IssuedKey = {
  id: string;
  key: string; // shown ONCE
  prefix: string;
  name: string;
  env: Env;
  scopes: string[];
  createdAt: Date;
};

function randomBase32(n: number): string {
  const buf = crypto.randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += BASE32[buf[i] & 31];
  return out;
}

export function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function issue(opts: {
  userId: string;
  name: string;
  env?: Env;
  scopes?: string[];
}): Promise<IssuedKey> {
  const env: Env = opts.env ?? "test";
  const secret = randomBase32(24);
  const full = `${PREFIX}${env}_${secret}`;
  const prefix = full.slice(0, 12);
  const hashed = sha256Hex(full);

  const [row] = await db
    .insert(schema.apiKeys)
    .values({
      userId: opts.userId,
      name: opts.name,
      env,
      prefix,
      hashedSecret: hashed,
      scopes: opts.scopes ?? ["read:profile", "read:score", "read:history"],
    })
    .returning();

  return {
    id: row.id,
    key: full,
    prefix,
    name: row.name,
    env,
    scopes: (row.scopes as string[]) ?? [],
    createdAt: row.createdAt,
  };
}

export async function verify(
  key: string
): Promise<{ userId: string; id: string; scopes: string[] } | null> {
  if (!key.startsWith(PREFIX)) return null;
  const hashed = sha256Hex(key);
  const cacheKey = `api_key:${hashed}`;
  const cached = await getCached<{
    userId: string;
    id: string;
    scopes: string[];
    revoked: boolean;
  }>(cacheKey);
  if (cached) {
    if (cached.revoked) return null;
    return cached;
  }

  const [row] = await db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.hashedSecret, hashed))
    .limit(1);
  if (!row || row.revokedAt) {
    await setCached(
      cacheKey,
      { userId: "", id: "", scopes: [], revoked: true },
      60
    );
    return null;
  }

  // touch last_used_at async (best-effort)
  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, row.id))
    .catch(() => {});

  const out = {
    userId: row.userId,
    id: row.id,
    scopes: (row.scopes as string[]) ?? [],
  };
  await setCached(cacheKey, { ...out, revoked: false }, 60);
  return out;
}

export async function listForUser(userId: string) {
  return db
    .select({
      id: schema.apiKeys.id,
      name: schema.apiKeys.name,
      env: schema.apiKeys.env,
      prefix: schema.apiKeys.prefix,
      scopes: schema.apiKeys.scopes,
      lastUsedAt: schema.apiKeys.lastUsedAt,
      createdAt: schema.apiKeys.createdAt,
      revokedAt: schema.apiKeys.revokedAt,
    })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.userId, userId));
}

export async function revoke(userId: string, id: string): Promise<boolean> {
  const [row] = await db
    .select({ hashedSecret: schema.apiKeys.hashedSecret })
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.userId, userId), isNull(schema.apiKeys.revokedAt)))
    .limit(1);
  if (!row) return false;
  await db
    .update(schema.apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(schema.apiKeys.id, id));
  await invalidate(`api_key:${row.hashedSecret}`);
  return true;
}
