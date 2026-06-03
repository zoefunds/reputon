# Reputon — Security Model

This document captures the threat model, mitigations and review checklist
across the four layers: contracts, backend, frontend, and infra.

---

## Authentication

| Surface              | Mechanism                                            |
| -------------------- | ---------------------------------------------------- |
| Web app (browser)    | Auth.js v5 — session JWT in SameSite=Lax cookie      |
| Wallet sign-in       | SIWE (EIP-4361); nonce one-shot; signature verified  |
| Backend `/v1/api/*`  | `Authorization: Bearer rk_<env>_<24>` (API key)      |
| Backend `/v1/me/*`   | API key (same format)                                |
| Frontend `/api/me/*` | Auth.js cookie session + same-origin CSRF check      |

API keys are stored as **SHA-256 of the full key**. The plaintext is shown
exactly once on creation; nothing logs it. Revocation invalidates the Redis
cache entry so it takes effect within seconds.

## Authorization (scope matrix)

Scopes attached to an API key (`apiKeys.scopes`):

| Scope                      | Routes gated                                    |
| -------------------------- | ----------------------------------------------- |
| `read:profile`             | `GET /v1/api/profile`                           |
| `read:score`               | `GET /v1/api/score`                             |
| `read:history`             | `GET /v1/api/history`                           |
| `read:endorsements`        | `GET /v1/api/endorsements`                      |
| `read:nft`                 | `GET /v1/onchain/nft/*`                         |
| `read:sybil`               | `GET /v1/onchain/sybil/*`                       |
| `write:evaluate`           | `POST /v1/api/evaluate`                         |
| `write:endorse`            | reserved — Phase 13+                            |
| `write:mint`               | reserved — admin minting via API                |
| `admin:*`                  | superuser                                       |
| `*`                        | wildcard (issued only via internal scripts)     |

User role (`users.role`):
- `user` — default; sees `/dashboard/*`.
- `admin` — also sees `/admin/*`. Set via `npm --workspace backend run promote-admin -- <email>`.

## Rate limiting

Redis sliding-window, keyed by API-key ID (authed) or IP (anon).

| Surface                | Authed limit (/min) | Anon limit (/min) |
| ---------------------- | -------------------:| -----------------:|
| Default `/v1/*`        |                 120 |                30 |
| `POST /v1/api/evaluate`|                  10 |                 0 |

429 responses include `X-RateLimit-Limit` and `X-RateLimit-Remaining`.

## CSRF

- Auth.js sets session cookies `SameSite=Lax` → blocks cross-site form POSTs.
- Frontend `/api/me/*` state-changing methods additionally verify the
  `Origin` (or `Referer`) header equals `AUTH_URL`. See
  `frontend/src/lib/server/csrf.ts`.
- Backend `/v1/*` only accepts Bearer tokens (no cookies), so CSRF doesn't
  apply.

## SQL injection

All DB access goes through **Drizzle ORM** parameterized queries — no string
concatenation. The single hand-rolled `db.execute(sql\`…\`)` calls in
`frontend/src/lib/server/admin.ts` use the `sql` tagged-template helper,
which parameterizes table identifiers via Drizzle's table refs (no user
input is interpolated).

## XSS / CSP

`Content-Security-Policy` is set in `frontend/next.config.ts`:
- `default-src 'self'`
- `connect-src` whitelists the backend, Genlayer RPC, GitHub, Snapshot.org,
  and Google OAuth.
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`.
- `style-src` includes `'unsafe-inline'` (Tailwind utility classes occasionally
  need it; we do not insert untrusted strings into style attributes).

## Webhook signatures

Outbound webhooks are HMAC-SHA256 signed with the per-hook secret.
Header format: `X-Reputon-Signature: t=<unixSec>,v1=<hex>` over `<t>.<body>`.
Consumers MUST verify both the signature and check `|now - t|` ≤ 5 min to
defeat replays.

## Secrets handling

- `.env` is git-ignored. `.env.example` lives in-tree as a template.
- `AUTH_SECRET` is random 32 bytes; rotation invalidates all sessions.
- `GENLAYER_ACCOUNT_PRIVATE_KEY` (server-side) is required only to write
  on-chain (eval jobs, NFT mints). Reads work without it.
- `apiKeys.hashedSecret` is the only persistent secret material; the
  database compromise scenario doesn't expose live API keys.

## Body-size limit

Backend rejects any request with `Content-Length > 256 KB` (HTTP 413).

## Contract security checklist

See [`contracts.md`](./contracts.md).

## Incident-response runbook

See [`runbook.md`](./runbook.md).

## Reporting a vulnerability

PGP-encrypted email to `security@reputon.xyz`. We acknowledge within 24
hours and aim to disclose / patch within 14 days for high-severity issues.
