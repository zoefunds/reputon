/**
 * Telegram Login Widget verify endpoint.
 *
 * Telegram's official Login Widget posts an auth_data payload to a URL
 * you specify. The integrity of that payload is HMAC-SHA256-signed
 * with sha256(BOT_TOKEN) as the key. We verify the signature, then
 * stash the verified handle on the user record (so the analyzer can
 * include it in the next bundle).
 *
 * Docs: https://core.telegram.org/widgets/login#receiving-authorization-data
 *
 * POST  /api/me/connections/telegram   { id, first_name, last_name,
 *                                        username, photo_url, auth_date,
 *                                        hash }
 */

import { NextResponse } from "next/server";
import { createHash, createHmac } from "crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { accounts } from "@reputon/db/schema";
import { getCurrentUser } from "@/lib/server/user";
import { sameOrigin } from "@/lib/server/csrf";

const db = getDb();

const Body = z.object({
  id: z.number().int().or(z.string()),
  first_name: z.string().max(80).optional(),
  last_name: z.string().max(80).optional(),
  username: z.string().max(80).optional(),
  photo_url: z.string().max(400).optional(),
  auth_date: z.number().int().or(z.string()),
  hash: z.string().min(32),
});

function verifyTelegram(payload: Record<string, unknown>, botToken: string): boolean {
  const { hash, ...rest } = payload as { hash: string; [k: string]: unknown };
  const dataCheckString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");
  const secretKey = createHash("sha256").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return computed === hash;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: { message: "csrf check failed" } }, { status: 403 });
  }
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: { message: "TELEGRAM_BOT_TOKEN not configured" } },
      { status: 503 }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "invalid body" } }, { status: 400 });
  }
  const data = parsed.data;

  // Reject stale auth payloads (>1 hr old).
  const now = Math.floor(Date.now() / 1000);
  const authDate = typeof data.auth_date === "string" ? Number(data.auth_date) : data.auth_date;
  if (!Number.isFinite(authDate) || now - authDate > 3600) {
    return NextResponse.json(
      { error: { message: "telegram auth payload expired" } },
      { status: 400 }
    );
  }

  const ok = verifyTelegram(data as Record<string, unknown>, token);
  if (!ok) {
    return NextResponse.json(
      { error: { message: "telegram signature mismatch" } },
      { status: 400 }
    );
  }

  // Persist as an Auth.js account row so getConnections() picks it up.
  await db
    .insert(accounts)
    .values({
      userId: u.id,
      type: "oidc",
      provider: "telegram",
      providerAccountId: String(data.id),
      // Auth.js's accounts table accepts arbitrary extra columns; store
      // the username as the display handle.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(data.username ? ({ id_token: data.username } as any) : {}),
    })
    .onConflictDoUpdate({
      target: [accounts.provider, accounts.providerAccountId],
      set: { userId: u.id },
    });

  return NextResponse.json({
    ok: true,
    username: data.username ?? null,
    first_name: data.first_name ?? null,
  });
}

export async function DELETE() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
  await db.delete(accounts).where(eq(accounts.userId, u.id));
  return NextResponse.json({ ok: true });
}
