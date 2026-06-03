import type { MiddlewareHandler } from "hono";
import { redis } from "../services/redis";
import { env } from "../env";

/**
 * Sliding-window rate limit backed by Redis.
 * Keyed by IP unless a `req.headers.x-api-key` is present, in which case that.
 */
export function rateLimit(opts?: {
  windowSec?: number;
  max?: number;
  prefix?: string;
  anonMax?: number;
}): MiddlewareHandler {
  const window = opts?.windowSec ?? 60;
  const baseMax = opts?.max ?? env().API_RATE_LIMIT_PER_MIN;
  const anonMax = opts?.anonMax ?? Math.max(15, Math.floor(baseMax / 4));
  const prefix = opts?.prefix ?? "rl:api";

  return async (c, next) => {
    const caller = c.get("apiCaller");
    const ident =
      caller?.keyId ??
      c.req.header("authorization")?.slice(0, 24) ??
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      "anon";
    const max = caller ? baseMax : anonMax;
    const key = `${prefix}:${ident}:${Math.floor(Date.now() / 1000 / window)}`;
    const r = redis();
    const count = await r.incr(key);
    if (count === 1) await r.expire(key, window);
    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, max - count)));
    if (count > max) {
      return c.json(
        { error: { message: "Too many requests", code: 429 } },
        429
      );
    }
    await next();
  };
}
