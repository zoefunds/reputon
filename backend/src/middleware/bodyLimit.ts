import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

/** Reject requests whose Content-Length exceeds `maxBytes` (default 256 KB). */
export function bodyLimit(maxBytes = 256 * 1024): MiddlewareHandler {
  return async (c, next) => {
    const len = Number(c.req.header("content-length") ?? 0);
    if (len > maxBytes) {
      throw new HTTPException(413, {
        message: `payload too large (>${maxBytes} bytes)`,
      });
    }
    await next();
  };
}
