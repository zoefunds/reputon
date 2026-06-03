/**
 * Resolves the caller from an `Authorization: Bearer <api-key>` header.
 *
 * Two modes:
 *   - apiAuth({ required: true })   — 401 if no key
 *   - apiAuth()                     — populates context but allows anon
 *
 * Once resolved, ctx.set("apiCaller", { userId, keyId, scopes })
 */

import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { verify } from "../services/apiKeys";

export type ApiCaller = {
  userId: string;
  keyId: string;
  scopes: string[];
} | null;

declare module "hono" {
  interface ContextVariableMap {
    apiCaller: ApiCaller;
  }
}

export function apiAuth(opts?: { required?: boolean; scope?: string }): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header("authorization") ?? c.req.header("Authorization");
    let caller: ApiCaller = null;
    if (header) {
      const m = /^Bearer\s+(.+)$/.exec(header);
      if (m) {
        const key = m[1].trim();
        const v = await verify(key);
        if (v) caller = { userId: v.userId, keyId: v.id, scopes: v.scopes };
      }
    }
    c.set("apiCaller", caller);

    if (opts?.required && !caller) {
      throw new HTTPException(401, { message: "API key required" });
    }
    if (opts?.scope && caller && !caller.scopes.includes(opts.scope) && !caller.scopes.includes("*")) {
      throw new HTTPException(403, { message: `missing scope: ${opts.scope}` });
    }

    await next();
  };
}
