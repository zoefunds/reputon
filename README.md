# Reputon

> The Universal On-Chain Reputation Layer, powered by Genlayer Intelligent Contracts.

Reputon turns wallet behavior, governance participation, contributions and
endorsements into a dynamic, AI-evaluated reputation score that lives
on-chain and is portable across every Web3 application.

Live demo:

- **Web app:** [https://reputon-mocha.vercel.app](https://reputon-mocha.vercel.app)
- **API:** [https://reputon-backend.fly.dev](https://reputon-backend.fly.dev)
- **OpenAPI spec:** [https://reputon-backend.fly.dev/v1/openapi.json](https://reputon-backend.fly.dev/v1/openapi.json)

Deployed contracts (Genlayer StudioNet, chain id `61999`):

| Contract            | Purpose                          | Address                                       |
| ------------------- | -------------------------------- | --------------------------------------------- |
| `reputon.py`        | Profiles, scores, history, endorsements, AI evaluation | `0xC64180D391C722CA461c3e492ef07ed084e0f747` |
| `reputon_nft.py`    | Soulbound credential NFTs        | `0x5116CfDB52bd96567777f86ac8d213D0715016C6`  |
| `sybil_oracle.py`   | LLM-backed sybil detection       | `0xe7E900542b54BeF274bE90e999BF6375C9463804`  |

> **Signing model.** Every on-chain write is signed by the user's own wallet
> via RainbowKit + wagmi — `mint_self`, `evaluate_and_update`, and
> `add_endorsement` all originate from the connected wallet. The wallet is
> auto-prompted to add and switch to GenLayer Studionet on first action.
> The protocol's signer key is reserved for admin operations (e.g.
> `set_self_mint_allowed`) and webhook fanout — it never appears in the
> user path.
>
> **Scoring rules.** Re-evaluations are tightly governed so the score
> reflects real change, not LLM noise:
>
> - **High-water mark.** `profile.score` is monotonic — re-running the
>   analyzer can only increase it. Every actual LLM-returned number is
>   still preserved in `history_json` for audit, but the public score
>   never drops.
> - **Deterministic on unchanged signals.** The contract stores
>   `last_signals_hash` and refuses to re-run the LLM if the new bundle
>   hashes to the same value. Connect or update a source to re-score.
> - **30-day cooldown.** Even with changed signals, a wallet can only
>   trigger one successful on-chain evaluation every 30 days, enforced
>   by the Vercel route handler against DB timestamps (since the SDK
>   doesn't expose `gl.block.timestamp`).

---

## Table of contents

1. [What Reputon is](#what-reputon-is)
2. [How it works](#how-it-works)
3. [Architecture](#architecture)
4. [Tech stack](#tech-stack)
5. [Repository layout](#repository-layout)
6. [Local development](#local-development)
7. [Testing](#testing)
8. [Production deploy](#production-deploy)
9. [API quick reference](#api-quick-reference)
10. [Authentication and security](#authentication-and-security)
11. [Documentation](#documentation)
12. [License](#license)

---

## What Reputon is

A self-hosted protocol that produces a portable on-chain reputation score
(0 to 1000) for any EVM wallet. Reputon is built around three Genlayer
Intelligent Contracts that together:

1. **Register and score** a per-wallet profile from a bundle of **verified
   signals** — GitHub activity (via OAuth), Snapshot governance votes
   (scanned from the wallet), Gitcoin Passport stamps, Tally DAO
   delegations, plus optional Telegram and X identity verification. The
   LLM call runs under the **Genlayer equivalence principle**, so every
   validator independently re-derives a comparable score.
2. **Mint soulbound credential NFTs** across a 5-tier ladder — Genesis
   (anyone), Bronze (≥250), Silver (≥500), Gold (≥750), Eternal (≥950).
3. **Endorse other wallets** with a weighted vouch. Endorsements live in
   flat composite-key storage on-chain and are bidirectionally queryable.
4. **Detect sybil / bot-like behavior** with a separate LLM-backed oracle.

Around those contracts, Reputon ships a full product: marketing site,
authenticated dashboard, contribution analyzer (with verified connector
cards instead of free-text inputs), endorsement flows, admin console, a
public REST API with HMAC-signed outbound webhooks, scope-gated API keys,
and production-grade security.

## How it works

```
              1. user connects verified sources from the analyzer
              (GitHub OAuth, X OAuth, Telegram Login Widget,
               Snapshot wallet scan, Gitcoin Passport scan, Tally)
                          |
                          v
              +-----------------------+
              |  Vercel route handler |
              |  - hash 30-day cool-  |
              |    down check        |
              |  - assemble bundle    |
              |  - compact to <4 KB   |
              |  - return signals_json|
              +-----------+-----------+
                          |
              2. user signs evaluate_and_update from their own
                 wallet via RainbowKit + wagmi. The tx hits
                 GenLayer Studionet's consensus contract.
                          |
                          v
              +-----------------------+
              |  Reputon contract     |
              |  - hash check: skip   |
              |    if signals unchanged
              |  - eq.prompt_comparative
              |  - high-water mark on score
              +-----------+-----------+
                          |
              3. validators each run the LLM. Equivalence requires
                 JSON output with a numeric score field — actual
                 number can differ; the leader's run wins.
                          |
                          v
              +-----------------------+
              |  on-chain state       |
              |  score (monotonic),   |
              |  confidence, category,|
              |  explanation, breakdown,
              |  history_json,         |
              |  last_signals_hash    |
              +-----------+-----------+
                          |
              4. backend poller sees the on-chain evaluation count
                 advance, marks the DB job done, and fans
                 `score.updated` webhooks to subscribers
```

Reads are always direct from the contract (with a 15-second Redis cache
on the backend). User-personalised reads on the dashboard bypass the
Next.js data cache (`cache: "no-store"`) so contract redeploys can't
leave stale data on the UI.

Writes are signed by the **user's own wallet** — no backend signer in
the user path. Each on-chain action triggers exactly one wallet popup,
and the wallet is auto-prompted to switch to GenLayer Studionet the
moment a user connects.

## Architecture

```
                                 +------------------+
                                 |  Browser / dApp  |
                                 +--------+---------+
                                          |
                       (session cookie)   |   (Bearer rk_...)
                                          v
   +----------------------------+   +--------------------------------+
   |  Next.js 15 frontend       |   |  Hono backend on Fly.io        |
   |  Auth.js v5 (SIWE + OAuth) |   |  /v1/api, /v1/me, /v1/onchain  |
   |  /api/me bridge handlers   +-->|  OpenAPI 3.1 spec              |
   |  Vercel (us-east)          |   |  In-process scheduler          |
   +-------------+--------------+   +---------+----------+-----------+
                 |                            |          |
                 |                            |          | genlayer-js
                 v                            v          v
        +----------------+         +----------------+   +--------------------+
        |  Neon Postgres |<------> |  Upstash Redis |   | Genlayer StudioNet |
        |  - users       |         |  - rate limit  |   |  reputon.py        |
        |  - profiles    |         |  - api-key TTL |   |  reputon_nft.py    |
        |  - api_keys    |         |  - webhook ZSET|   |  sybil_oracle.py   |
        |  - webhooks    |         +----------------+   +--------------------+
        |  - audit_log   |
        +----------------+
```

15 Postgres tables, 3 Python contracts, two scheduled job loops (evaluation
queue every 5s, webhook retries every 10s, stale-job sweep every 60s).
Architecture detail in [`docs/architecture.md`](./docs/architecture.md).

## Tech stack

### Frontend
- **Next.js 15** (App Router, React 19, strict TypeScript)
- **Tailwind CSS 3.4** for styling, theme tokens in `globals.css`
- **shadcn/ui** style primitives (Button, Container, etc.)
- **Auth.js v5** sign-in via wallet (SIWE / EIP-4361) only; sign-in page
  is wallet-only. Per-user OAuth connectors (GitHub, X/Twitter) live in
  the `accounts` table for analyzer signal verification.
- **RainbowKit + wagmi 2** for the wallet UX (Connect button, chain
  switch, popup). **viem** under the hood; the GenLayer Studionet chain
  is registered in `lib/wagmi.ts` (chain id `61999`).
- **genlayer-js** for both reads and client-signed writes. We build the
  GenLayer-internal calldata via the public `abi.calldata` exports and
  submit through `walletClient.writeContract` on the consensus contract
  — see `lib/genlayer/clientWrite.ts`.
- **Telegram Login Widget** (oauth.telegram.org popup) with HMAC-SHA256
  verification in `/api/me/connections/telegram`.
- **Recharts** for score trend visualisation.
- **Lucide** icons, **Inter** + **JetBrains Mono** via `next/font`.

### Backend
- **Hono** on Node 20, ESM only, tsx as runtime
- **Drizzle ORM** with `postgres` driver
- **ioredis** for the cache, rate limiter, and webhook retry queue
- **MinIO / S3** client for credential image hosting (optional)
- **Zod** for request validation
- In-process scheduler: no external queue server needed

### Contracts
- **Python**, Genlayer SDK (`from genlayer import *`)
- Equivalence-principle LLM calls
- 3 deployable single-file contracts, no Docker required

### Infrastructure
- **Neon** managed Postgres
- **Upstash** managed Redis
- **Fly.io** for the backend (single Docker image, tsx runtime)
- **Vercel** for the frontend
- **GitHub** for the repository, tags release commits

### Testing
- **Vitest** unit suites for backend (14 tests) and frontend (8 tests)
- **Python `unittest`** for contract structure and helper math (10 tests)
- Single `npm test` runner

## Repository layout

```
Reputon/
+-- frontend/                 Next.js 15 web app
+-- backend/                  Hono REST API and scheduler
+-- packages/db/              Drizzle schema and client (shared workspace)
+-- intelligent-contracts/    Genlayer Python contracts
+-- infra/                    docker-compose (Postgres + Redis + MinIO for local dev)
+-- scripts/                  Repo-wide Python automation
+-- docs/                     Architecture, API, deployment, runbook
+-- fly.toml                  Fly.io backend config
+-- vercel.json               Vercel monorepo-aware config
+-- package.json              npm workspaces root
```

## Local development

Requirements: macOS or Linux, Node 20+, npm 10+, Python 3.11+, Docker
Desktop, the `genlayer` CLI (optional).

```bash
# 1. Verify tools
python3 scripts/env_check.py

# 2. Copy env template and generate a session secret
cp .env.example .env
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env

# 3. Boot Postgres + Redis + MinIO via docker-compose
npm run infra:up

# 4. Install all workspace deps
npm install

# 5. Migrate the schema and seed sample data
npm run db:migrate
npm run db:seed

# 6. Run the backend on :4001 and the frontend on :3000
npm run dev:backend
npm run dev:frontend

# 7. Connectivity check anytime
npm --workspace backend run check
```

Open http://localhost:3000.

## Testing

```bash
npm test                  # all three suites (backend, frontend, contracts)
npm run test:backend      # 14 vitest cases (scopes, webhooks signing, body limit, sha256)
npm run test:frontend     # 8 vitest cases (CSRF, class merging)
npm run test:contracts    # 10 python tests (contract structure + helper logic)
npm --workspace backend run test:watch    # local TDD
```

All 32 tests pass on a fresh clone. Tests are dependency-free (no DB required)
and run in under two seconds total.

## Production deploy

Reputon's production stack uses fully-managed services with generous free
tiers:

| Service     | Role                  | Free tier? |
| ----------- | --------------------- | :--------: |
| Neon        | Postgres              | yes        |
| Upstash     | Redis (TLS)           | yes        |
| Fly.io      | Backend Docker host   | yes        |
| Vercel      | Frontend (Next.js)    | yes        |

Step-by-step in [`docs/deploy-prod.md`](./docs/deploy-prod.md). Summary:

```bash
# Provision Neon + Upstash via their dashboards, then:
DATABASE_URL='<neon url>' npm run db:migrate

# Backend on Fly
flyctl launch --no-deploy --copy-config --name reputon-backend --region iad
flyctl secrets set --app reputon-backend \
  DATABASE_URL='<neon>' REDIS_URL='<upstash>' \
  AUTH_SECRET="$(openssl rand -base64 32)" \
  AUTH_URL='https://<your-vercel>.vercel.app'
flyctl deploy

# Frontend on Vercel
vercel link --yes --project reputon
# set the same env vars via `vercel env add`
vercel --prod
```

Contracts are already live on Genlayer StudioNet and do not need re-deploy.

## API quick reference

Base URL in production: `https://reputon-backend.fly.dev`.

### Public reads (no auth)

```bash
# Score for any wallet
curl "https://reputon-backend.fly.dev/v1/api/score?address=0x6f0b4ce7a1872db132b2f6b7743defb30eba698a"

# Full profile (incl. evaluation count and last_signals_hash)
curl "https://reputon-backend.fly.dev/v1/api/profile?address=0x6f0b..."

# Newest-first score history (each entry has score, confidence,
# category, delta, explanation, breakdown — created_at is always
# 0 because the SDK doesn't expose gl.block.timestamp)
curl "https://reputon-backend.fly.dev/v1/api/history?address=0x6f0b...&limit=20"

# Endorsements
curl "https://reputon-backend.fly.dev/v1/api/endorsements?address=0x6f0b...&direction=received"

# Server-signed verification of an expected score
curl -X POST https://reputon-backend.fly.dev/v1/api/verify \
  -H "Content-Type: application/json" \
  -d '{"address":"0x6f0b...","score":387}'

# Live contract info (bypasses cache, reads on-chain directly)
curl https://reputon-backend.fly.dev/v1/onchain/info
curl https://reputon-backend.fly.dev/v1/onchain/nft/info
curl https://reputon-backend.fly.dev/v1/onchain/sybil/info
curl https://reputon-backend.fly.dev/v1/onchain/nft/self-mint-allowed/genesis
```

### Session-authed routes (cookie, same-origin)

| Route | Method | Purpose |
|---|---|---|
| `/api/me/connections` | GET | Connector state for the analyzer cards |
| `/api/me/connections/scan?source=credentials\|protocols` | GET | Wallet-scoped Passport / Snapshot scan |
| `/api/me/connections/telegram` | POST | Verifies Telegram Login Widget payload |
| `/api/me/credentials/record-mint` | POST | Audit-log a user-signed NFT mint |
| `/api/me/evaluate` | POST | Build + compact bundle, return `signals_json` to sign |
| `/api/me/evaluate?id={jobId}` | PATCH | Attach the user's signed EVM tx hash |
| `/api/me/evaluate/cooldown` | GET | 30-day cooldown countdown state |

### Writes via Bearer API key (`write:evaluate` scope) — service-to-service

```bash
# Queue an AI evaluation as a service integration. End users on the
# website don't go through this path — they sign evaluate_and_update
# directly from their wallet via /api/me/evaluate.
curl -X POST https://reputon-backend.fly.dev/v1/api/evaluate \
  -H "Authorization: Bearer rk_test_XXX" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x6f0b...",
    "signals": {
      "github":   { "user": { "login": "alice", "followers": 142 } },
      "protocols":{ "vote_count": 8, "spaces": [{"id":"linea","votes":3}] },
      "credentials": { "score": 36.8, "stamps": 9, "passing": true }
    }
  }'
```

Full reference (with webhook signature verification snippet) in
[`docs/api.md`](./docs/api.md) or via the OpenAPI spec at
`/v1/openapi.json`.

## Authentication and security

Sign-in is **wallet-only** (SIWE / EIP-4361). On first wallet connect we
auto-prompt the wallet to add and switch to GenLayer Studionet so every
subsequent action lands on the right chain. The `ADMIN_WALLETS` env var
(comma-separated, case-insensitive) auto-promotes matching wallets to
`role=admin` on every sign-in.

Per-user **connectors** for signal verification live in the standard
Auth.js `account` table and are wired via env-gated providers:

| Connector | Env vars |
|---|---|
| GitHub OAuth | `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` |
| X (Twitter) OAuth 2.0 | `AUTH_TWITTER_ID`, `AUTH_TWITTER_SECRET` |
| Telegram Login Widget | `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_TELEGRAM_BOT_NAME` |
| Gitcoin Passport scorer | `PASSPORT_API_KEY`, `PASSPORT_SCORER_ID` |
| Tally governance read | `TALLY_API_KEY` |
| Snapshot | public — no key needed |

Other safeguards:

- API keys are SHA-256 hashed at rest; plaintext is shown exactly once on
  creation and cached in Redis for 60 s.
- All `/v1/*` routes carry a Redis-backed sliding-window rate limit, keyed
  by API key (high quota) or IP (low quota).
- All session-cookie-authed Next.js Route Handlers have an
  `Origin / Referer` based CSRF guard.
- CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff,
  Referrer-Policy and Permissions-Policy headers set on every response.
- Backend rejects requests over 256 KB with HTTP 413.
- Outbound webhooks are HMAC-SHA256 signed with a per-hook secret and a
  timestamp in the `X-Reputon-Signature` header to defeat replays.

Full threat model in [`docs/security.md`](./docs/security.md). Incident
response playbook in [`docs/runbook.md`](./docs/runbook.md).

## Documentation

| Doc                                              | What it covers                                        |
| ------------------------------------------------ | ----------------------------------------------------- |
| [`docs/architecture.md`](./docs/architecture.md) | System diagrams, four request flows, data layout, caching, scheduler |
| [`docs/api.md`](./docs/api.md)                   | Full REST reference with curl examples + webhook signature verification |
| [`docs/contracts.md`](./docs/contracts.md)       | Per-method access matrix, input clamps, sign-off checklist |
| [`docs/security.md`](./docs/security.md)         | Threat model, scope matrix, CSRF, CSP, rate limits     |
| [`docs/runbook.md`](./docs/runbook.md)           | Incident-response playbook                            |
| [`docs/env-setup.md`](./docs/env-setup.md)       | Every env var, defaults, production checklist          |
| [`docs/deployment.md`](./docs/deployment.md)     | Generic production deploy (systemd, Caddy, backups)    |
| [`docs/deploy-prod.md`](./docs/deploy-prod.md)   | Vercel + Fly + Neon + Upstash deploy guide             |
| [`docs/release-checklist.md`](./docs/release-checklist.md) | Production-readiness audit               |

## License

UNLICENSED. Internal build until a public release is announced.
