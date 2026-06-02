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
}): MiddlewareHandler {
  const window = opts?.windowSec ?? 60;
  const max = opts?.max ?? env().API_RATE_LIMIT_PER_MIN;
  const prefix = opts?.prefix ?? "rl:api";

  return async (c, next) => {
    const ident =
      c.req.header("x-api-key") ??
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      "anon";
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
