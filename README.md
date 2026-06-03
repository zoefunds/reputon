# Reputon

> The Universal On-Chain Reputation Layer — powered by Genlayer Intelligent Contracts.

Reputon is a decentralized reputation protocol that continuously evaluates wallet
behavior, governance participation, community contributions, historical actions,
cross-protocol activity, and trust relationships to produce a dynamic, AI-powered
reputation score. The score is portable across Web3 applications.

## Status

🚧 Under active development.

## Workspaces

| Path                       | Stack                                              | Purpose                                  |
| -------------------------- | -------------------------------------------------- | ---------------------------------------- |
| `frontend/`                | Next.js 15 · TS · Tailwind · Auth.js v5            | Web app (landing, dashboard, admin)      |
| `backend/`                 | Hono · TS · Drizzle · Postgres · Redis · MinIO     | REST API, webhooks, jobs                 |
| `packages/db/`             | Drizzle ORM · shared schema                        | Single source of truth for DB schema     |
| `intelligent-contracts/`   | Python · Genlayer SDK                              | On-chain reputation, NFT, sybil oracle   |
| `infra/`                   | Docker Compose                                     | Postgres + Redis + MinIO for local dev   |
| `scripts/`                 | Python                                             | Repo-wide automation                     |
| `docs/`                    | Markdown                                           | Architecture, API, deployment            |

## Quick start

```bash
# 1) Verify your machine has the required tools (Node 20, Python 3.11, Docker)
python3 scripts/env_check.py

# 2) Copy env template and add a secret
cp .env.example .env
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env

# 3) Boot Postgres + Redis + MinIO
npm run infra:up

# 4) Install all workspace deps
npm install

# 5) Migrate + seed the database
npm run db:migrate
npm run db:seed

# 6) Run backend and frontend (two terminals)
npm run dev:backend       # http://localhost:4001
npm run dev:frontend      # http://localhost:3000
```

Confirm the stack is healthy any time:

```bash
npm --workspace backend run check
# postgres   ok ...
# redis      ok (PONG)
# storage    ok (bucket=reputon-assets)
```

## Auth (Auth.js v5)

Three providers are wired; each turns on automatically when its env vars are set:

| Provider | Required env                                          |
| -------- | ----------------------------------------------------- |
| Wallet (SIWE) | none — works out of the box with any EVM wallet |
| Google   | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`                |
| Email    | `SMTP_HOST` (+ `SMTP_USER`/`SMTP_PASSWORD` if needed) |

## Documentation

| Doc                                       | What it covers                              |
| ----------------------------------------- | ------------------------------------------- |
| [`docs/architecture.md`](./docs/architecture.md) | System diagram, request flows, caching, scheduler |
| [`docs/api.md`](./docs/api.md)                   | Full REST reference with curl examples + webhook signature verification |
| [`docs/contracts.md`](./docs/contracts.md)       | Per-method access control, input clamps, sign-off checklist |
| [`docs/security.md`](./docs/security.md)         | Threat model, scope matrix, CSRF, CSP, rate limits |
| [`docs/runbook.md`](./docs/runbook.md)           | Incident-response playbook                  |
| [`docs/env-setup.md`](./docs/env-setup.md)       | Every env var, defaults, production checklist |
| [`docs/deployment.md`](./docs/deployment.md)     | Production deploy: infra → reverse proxy → backups → zero-downtime |

## Deployed contracts (Genlayer StudioNet)

| Contract            | Address                                       |
| ------------------- | --------------------------------------------- |
| Reputon (main)      | `0xD7975CeA5549459d6eF0913a9fd919d17DE3d911`  |
| Reputon NFT         | `0xEC90A80be181Cb2F839A855B2db73406FCbaF34d`  |
| Sybil Oracle        | `0x3E2cCF5a85217b00B5EFBC499922ec0EC5841408`  |

## Tests

```bash
npm test                  # all suites (backend + frontend + contracts)
npm run test:backend      # 14 vitest cases
npm run test:frontend     # 8 vitest cases
npm run test:contracts    # 10 python unittest cases
```

## Phase progress

- [x] Phase 0 — Foundations
- [x] Phase 1 — Design system & frontend shell
- [x] Phase 2 — Marketing site
- [x] Phase 3 — Postgres / Redis / Auth.js wiring
- [x] Phase 4 — Reputon intelligent contract
- [x] Phase 5 — NFT + Sybil contracts
- [x] Phase 6 — Backend API (full surface)
- [x] Phase 7 — User dashboard
- [x] Phase 8 — Contribution analyzer
- [x] Phase 9 — Reputation NFT UI
- [x] Phase 10 — Governance reputation
- [x] Phase 11 — Admin dashboard
- [x] Phase 12 — Security hardening
- [x] Phase 13 — Testing
- [x] Phase 14 — Documentation
- [ ] Phase 15 — Production build

## License

UNLICENSED — internal build.
