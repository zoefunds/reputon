/**
 * Lightweight CSRF protection for session-cookie-authed Route Handlers.
 *
 * Strategy:
 *   - Session cookies are SameSite=Lax (Auth.js v5 default) → blocks
 *     cross-site form submissions for state-changing methods.
 *   - In addition, this helper rejects state-changing requests whose
 *     `Origin` header doesn't match our `AUTH_URL` (or, for browsers that
 *     omit Origin, requires a matching `Referer`).
 *   - GET / HEAD are exempt (safe methods).
 *
 *     if (!sameOrigin(req)) return NextResponse.json(..., { status: 403 });
 */
import "server-only";

function envOrigin(): string {
  const url = process.env.AUTH_URL ?? "http://localhost:3000";
  try {
    const u = new URL(url);
    return u.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function sameOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const expected = envOrigin();
  const origin = req.headers.get("origin");
  if (origin) return origin === expected;
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === expected;
    } catch {
      return false;
    }
  }
  // Neither Origin nor Referer → reject defensively.
  return false;
}
