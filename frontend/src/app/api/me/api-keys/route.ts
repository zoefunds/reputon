/**
 * Session-authenticated bootstrap for API keys.
 *
 * The backend `/v1/me/api-keys` route requires an API key in `Authorization`.
 * To create the very first key, the user must authenticate via the web session
 * (cookies) — that's what this Route Handler is for. It runs inside Next.js,
 * checks the Auth.js session, and talks to the database directly using the
 * shared `@reputon/db` schema.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { apiKeys } from "@reputon/db/schema";
import { auth } from "@/lib/auth";
import { sameOrigin } from "@/lib/server/csrf";

const db = getDb();

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function randomBase32(n: number) {
  const buf = crypto.randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += BASE32[buf[i] & 31];
  return out;
}
const sha256Hex = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
  }
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      env: apiKeys.env,
      prefix: apiKeys.prefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id));
  return NextResponse.json({ keys: rows });
}

const Body = z.object({
  name: z.string().min(1).max(80),
  env: z.enum(["test", "live"]).default("test"),
  scopes: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: { message: "csrf check failed" } }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "invalid body" } }, { status: 400 });
  }

  const env = parsed.data.env;
  const secret = randomBase32(24);
  const full = `rk_${env}_${secret}`;
  const prefix = full.slice(0, 12);
  const hashed = sha256Hex(full);

  const [row] = await db
    .insert(apiKeys)
    .values({
      userId: session.user.id,
      name: parsed.data.name,
      env,
      prefix,
      hashedSecret: hashed,
      scopes: parsed.data.scopes ?? ["read:profile", "read:score", "read:history"],
    })
    .returning();

  return NextResponse.json(
    {
      id: row.id,
      key: full, // shown ONCE
      prefix,
      name: row.name,
      env,
      scopes: row.scopes,
      createdAt: row.createdAt,
    },
    { status: 201 }
  );
}
