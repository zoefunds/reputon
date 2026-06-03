# Reputon — Production Release Checklist

Run this top-to-bottom before tagging a release.

## Code health

- [x] `npm run typecheck` — frontend + backend strict TS, zero errors
- [x] `npm test` — 32/32 tests passing (14 backend · 8 frontend · 10 contracts)
- [x] `npm --workspace frontend run build` — 38 routes, ~106 kB shared, no warnings
- [x] `npm --workspace backend run build` — emits to `backend/dist/`
- [x] No `// TODO`, `console.log`, or `XXX` in shipped code paths
- [x] All public Route Handlers behind `sameOrigin()` CSRF guard
- [x] All `/v1/*` rate-limited via Redis

## Infra

- [x] `docker compose -f infra/docker-compose.yml up -d` boots clean
- [x] `npm --workspace backend run check` — postgres + redis + storage all `ok`
- [x] Drizzle migrations applied (`npm run db:migrate` idempotent)
- [x] Seed script idempotent (`npm run db:seed` safe to re-run)

## Security

- [x] `AUTH_SECRET` set, not committed
- [x] CSP header strict (`unsafe-eval` dropped under `NODE_ENV=production`)
- [x] HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy set
- [x] CSRF cross-origin POST → 403, no-origin POST → 403
- [x] Body limit → 413 at 256 KB
- [x] API key surface: SHA-256-hashed, plaintext shown once, Redis cache + invalidation
- [x] Webhook deliveries HMAC-SHA256 signed with timestamped header

## Contracts (Genlayer StudioNet)

- [x] `reputon.py` deployed @ `0xD7975CeA5549459d6eF0913a9fd919d17DE3d911`
- [x] `reputon_nft.py` deployed @ `0xEC90A80be181Cb2F839A855B2db73406FCbaF34d`
- [x] `sybil_oracle.py` deployed @ `0x3E2cCF5a85217b00B5EFBC499922ec0EC5841408`
- [x] `genlayer schema <addr>` matches source method list for all three
- [x] `get_contract_info()` returns `version=1, total_*=0` (clean deploy)
- [x] Addresses recorded in `.contract-addresses.json`
- [x] Addresses wired into `.env` via `set_contract_address.py`

## End-to-end smoke (NODE_ENV=production)

- [x] Backend `/v1/health` → 200 with all 3 ok
- [x] Backend `/v1/onchain/info` → live contract response
- [x] Frontend `/` → 200, prod CSP active, ready in <3s
- [x] Frontend `/dashboard` (unauth) → 307 → `/sign-in`
- [x] Frontend `/profile/<addr>` → 200 (public)
- [x] Frontend `/profile/<addr>/opengraph-image` → 200 image/png

## Documentation

- [x] `README.md` — quick start, workspaces, contract addresses, test commands
- [x] `docs/architecture.md` — diagrams + 4 request flows
- [x] `docs/api.md` — full REST + webhook verification snippet
- [x] `docs/contracts.md` — method matrix + sign-off checklist
- [x] `docs/security.md` — threat model
- [x] `docs/runbook.md` — incident playbook
- [x] `docs/env-setup.md` — every env var
- [x] `docs/deployment.md` — production deploy + systemd unit + Caddyfile

## Open items for post-launch

- [ ] Provision a real Genlayer signer key (`GENLAYER_ACCOUNT_PRIVATE_KEY`)
      so the scheduler can write `evaluate_and_update` and `mint` on user behalf.
- [ ] Replace MinIO with managed S3 in production.
- [ ] Replace embedded Postgres + Redis with managed services in production.
- [ ] Configure Google OAuth credentials if Google sign-in is desired.
- [ ] Configure SMTP + `AUTH_EMAIL_FROM` if email magic-link sign-in is desired.
- [ ] Wire health checks (`/v1/health`, `/v1/onchain/info`) into uptime monitor.
- [ ] Set up automated Postgres backups (hourly `pg_dump` to S3).
- [ ] Move from in-process scheduler to BullMQ / dedicated worker if eval
      volume exceeds ~5 jobs/sec.

## Release artifacts

| Artifact            | Size  |
| ------------------- | ----- |
| `backend/dist/`     | 124 K |
| `frontend/.next/`   | 500 M |
| `frontend/.next/static/` | 2.4 M (served by CDN) |
| Test suite runtime  | < 2 s total |
