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

## Phase progress

- [x] Phase 0 — Foundations
- [x] Phase 1 — Design system & frontend shell
- [x] Phase 2 — Marketing site
- [x] Phase 3 — Postgres / Redis / Auth.js wiring
- [x] Phase 4 — Reputon intelligent contract
- [ ] Phase 5 — NFT + Sybil contracts
- [ ] Phase 6 — Backend API (full surface)
- [ ] Phase 7 — User dashboard
- [ ] Phase 8 — Contribution analyzer
- [ ] Phase 9 — Reputation NFT UI
- [ ] Phase 10 — Governance reputation
- [ ] Phase 11 — Admin dashboard
- [ ] Phase 12 — Security hardening
- [ ] Phase 13 — Testing
- [ ] Phase 14 — Documentation
- [ ] Phase 15 — Production build

## License

UNLICENSED — internal build.
