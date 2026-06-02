import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export const errorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof HTTPException) {
      return c.json(
        { error: { message: err.message, code: err.status } },
        err.status
      );
    }
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[error]", err);
    return c.json({ error: { message, code: 500 } }, 500);
  }
};
