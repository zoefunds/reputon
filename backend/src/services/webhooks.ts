/**
 * Outbound webhook registration + HMAC-signed delivery with retry.
 *
 * Signature header:
 *   X-Reputon-Signature: t=<unixSec>,v1=<sha256hex(secret, "<t>.<body>")>
 */

import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db, schema } from "./db";
import { redis } from "./redis";

const RETRY_KEY = "wh:retry"; // Redis ZSET: score = next attempt epoch, member = JSON

const MAX_ATTEMPTS = 5;
const BACKOFF_SEC = [10, 60, 300, 1800, 7200]; // 10s, 1m, 5m, 30m, 2h

export type WebhookEvent =
  | "profile.created"
  | "score.updated"
  | "endorsement.added"
  | "endorsement.revoked"
  | "evaluation.completed"
  | "sybil.flagged"
  | "nft.minted";

export function newSecret(): string {
  return "whsec_" + crypto.randomBytes(24).toString("base64url");
}

export function sign(secret: string, body: string): string {
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${body}`)
    .digest("hex");
  return `t=${t},v1=${sig}`;
}

export async function register(opts: {
  userId: string;
  url: string;
  eventTypes: WebhookEvent[];
}) {
  const [row] = await db
    .insert(schema.webhooks)
    .values({
      userId: opts.userId,
      url: opts.url,
      secret: newSecret(),
      eventTypes: opts.eventTypes,
    })
    .returning();
  return row;
}

export async function listForUser(userId: string) {
  return db
    .select()
    .from(schema.webhooks)
    .where(eq(schema.webhooks.userId, userId));
}

export async function remove(userId: string, id: string): Promise<boolean> {
  const r = await db
    .delete(schema.webhooks)
    .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, userId)))
    .returning({ id: schema.webhooks.id });
  return r.length > 0;
}

export async function fanout(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const hooks = await db
    .select()
    .from(schema.webhooks)
    .where(eq(schema.webhooks.active, true));
  for (const hook of hooks) {
    const subscribed =
      (hook.eventTypes as string[])?.length === 0 ||
      (hook.eventTypes as string[]).includes(event);
    if (!subscribed) continue;
    await deliver(hook, event, payload, 1).catch(() => {});
  }
}

async function deliver(
  hook: typeof schema.webhooks.$inferSelect,
  event: WebhookEvent,
  payload: Record<string, unknown>,
  attempt: number
): Promise<void> {
  const body = JSON.stringify({ event, payload, attempt, ts: new Date().toISOString() });
  const signature = sign(hook.secret, body);
  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let error: string | null = null;
  let ok = false;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Reputon-Signature": signature,
        "X-Reputon-Event": event,
        "User-Agent": "Reputon-Webhooks/1.0",
      },
      body,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    statusCode = res.status;
    responseBody = (await res.text().catch(() => "")).slice(0, 2000);
    ok = res.ok;
  } catch (e) {
    error = (e as Error).message;
  }

  await db.insert(schema.webhookDeliveries).values({
    webhookId: hook.id,
    event,
    payload,
    statusCode,
    responseBody,
    attempt,
    deliveredAt: ok ? new Date() : null,
    error,
  });

  await db
    .update(schema.webhooks)
    .set({
      lastDeliveryAt: new Date(),
      lastStatus: statusCode,
      failCount: ok ? 0 : hook.failCount + 1,
    })
    .where(eq(schema.webhooks.id, hook.id));

  if (!ok && attempt < MAX_ATTEMPTS) {
    const delay = BACKOFF_SEC[attempt - 1] ?? BACKOFF_SEC.at(-1)!;
    const next = Math.floor(Date.now() / 1000) + delay;
    await redis().zadd(
      RETRY_KEY,
      next,
      JSON.stringify({ hookId: hook.id, event, payload, attempt: attempt + 1 })
    );
  }
}

/** Called by the in-process scheduler tick. */
export async function processRetries(): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const due = await redis().zrangebyscore(RETRY_KEY, "-inf", now, "LIMIT", 0, 25);
  if (due.length === 0) return 0;
  await redis().zrem(RETRY_KEY, ...due);
  let processed = 0;
  for (const raw of due) {
    try {
      const job = JSON.parse(raw) as {
        hookId: string;
        event: WebhookEvent;
        payload: Record<string, unknown>;
        attempt: number;
      };
      const [hook] = await db
        .select()
        .from(schema.webhooks)
        .where(eq(schema.webhooks.id, job.hookId))
        .limit(1);
      if (hook && hook.active) {
        await deliver(hook, job.event, job.payload, job.attempt);
      }
      processed++;
    } catch {
      // discard malformed entries
    }
  }
  return processed;
}
