# Reputon — Architecture

A self-hosted, terminal-only protocol that turns wallet activity, governance,
contributions and endorsements into a portable, AI-evaluated reputation
score. Reads are open; writes go on-chain via Genlayer StudioNet.

```
┌────────────────────────────── BROWSER / CLI / dAPP ──────────────────────────────┐
│                                                                                  │
│   Next.js Frontend                        3rd-party clients (API key)            │
│   ┌─────────────────────┐                 ┌─────────────────────┐                │
│   │ Landing · Dashboard │                 │ curl / SDK / cron   │                │
│   │ Admin · /profile/*  │                 └──────────┬──────────┘                │
│   └──────────┬──────────┘                            │                           │
│              │  session cookie + CSRF                │  Bearer rk_<env>_<24>     │
└──────────────┼───────────────────────────────────────┼───────────────────────────┘
               ▼                                       ▼
   ┌───────────────────────┐               ┌──────────────────────────┐
   │ Next.js Route Handler │──────────────►│ Hono Backend  :4001      │
   │ /api/me/*             │  same DB +    │ /v1/health · /v1/api/*   │
   │ (session bridge)      │  same Redis   │ /v1/me/*  · /v1/onchain/*│
   └───────────────────────┘               │ /v1/openapi.json         │
                                           └──┬────────┬──────────────┘
                                              │        │
                       ┌──────────────────────┘        └──────────┐
                       ▼                                          ▼
            ┌──────────────────────┐                   ┌──────────────────────┐
            │ Postgres 16          │                   │ Redis 7              │
            │ users · profiles     │                   │ rate-limits          │
            │ scores · history     │                   │ key cache (60s)      │
            │ endorsements · NFTs  │                   │ webhook retry ZSET   │
            │ governance_record    │                   │ short read cache     │
            │ evaluations · jobs   │                   └──────────────────────┘
            │ api_keys · webhooks  │
            └──────────────────────┘                   ┌──────────────────────┐
                                                       │ MinIO (S3 API)       │
                                                       │ reputon-assets       │
                                                       └──────────────────────┘
                       ▼
            ┌─────────────────────────────────────────────────────────────────┐
            │ Genlayer StudioNet  (Python Intelligent Contracts)              │
            │   reputon.py        — profile · score · history · endorsements │
            │   reputon_nft.py    — soulbound credentials                    │
            │   sybil_oracle.py   — LLM-backed severity flags                │
            │   (writes use the equivalence principle for AI determinism)    │
            └─────────────────────────────────────────────────────────────────┘
```

---

## Workspaces

| Path                       | Role                                  |
| -------------------------- | ------------------------------------- |
| `frontend/`                | Next.js 15 · TS · Tailwind · Auth.js  |
| `backend/`                 | Hono + Drizzle + ioredis + minio + genlayer-js |
| `packages/db/`             | Drizzle schema (shared by both)       |
| `intelligent-contracts/`   | 3 Python contracts + deploy/test scripts |
| `infra/`                   | Docker compose (postgres · redis · minio) |
| `scripts/`                 | Python automation (`env_check`, `set_contract_address`) |
| `docs/`                    | This documentation set                |

## Request flows

### 1. Reputation read (public, anyone)

```
client ──GET /v1/api/score?address=0x…──▶ Hono
                                        │
                                        ├── Redis cache (15s TTL)  ─── hit ──▶ JSON
                                        │
                                        └── genlayer-js readContract
                                              get_score(addr)
                                                  ▼
                                            StudioNet contract  ──▶ JSON
```

### 2. Authenticated dashboard read

```
browser ──GET /dashboard──▶ Next.js server component
                              │
                              ├── auth() → DB session lookup
                              │
                              └── onchain.* fetch helpers
                                    │
                                    └── HTTP ──▶ backend /v1/api/*
```

### 3. AI evaluation (write)

```
user (session cookie)
   │
   ├──CSRF check──▶ /api/me/evaluate (Next Route Handler)
   │                 │
   │                 ├── buildBundle(wallet, signals) [GitHub fetch, etc.]
   │                 │
   │                 └── INSERT evaluation_jobs row (status=queued)
   │
   │           ◀── 202 {job_id, bundle}
   │
   ▼
client polls GET /api/me/evaluate?id=<job>

[scheduler tick, every 5s]
   ┌─────────────────────────────────────────────┐
   │ pull queued jobs                            │
   │ mark running                                │
   │ writeReputon("evaluate_and_update", […])    │
   │   ↓ Genlayer LLM (equivalence principle)   │
   │ mark done + store tx hash                   │
   │ emit webhook score.updated                  │
   └─────────────────────────────────────────────┘
```

### 4. Webhook fanout

```
scheduler / route handler ─► fanout("score.updated", payload)
                                    │
                                    ├── enumerate active webhooks subscribed to event
                                    │
                                    └── POST <url> with HMAC-SHA256 sig + 8s timeout
                                          │       headers: X-Reputon-Signature, X-Reputon-Event
                                          │       body: {event, payload, attempt, ts}
                                          │
                                          ├── 2xx ─── log delivery, update last_status
                                          │
                                          └── err  ─── zadd retry ZSET (backoff 10s/1m/5m/30m/2h)

[scheduler tick, every 10s]
   processRetries() — pulls due entries from ZSET, re-delivers
```

## Data layout

15 tables, three layers:

### Auth (Auth.js v5 + Drizzle adapter)
`user`, `account`, `session`, `verificationToken`, `authenticator`, `wallet`

### Reputation
`profile`, `score_history`, `endorsement`, `evaluation`, `evaluation_job`,
`nft_credential`, `sybil_flag`, `governance_record`, `contribution`

### API surface
`api_key`, `webhook`, `webhook_delivery`, `audit_log`

Schema is the source of truth in `packages/db/src/schema.ts`. Migrations live
in `packages/db/migrations/`.

## Caching strategy

| Path                     | Layer       | TTL    | Notes                          |
| ------------------------ | ----------- | ------ | ------------------------------ |
| API key verification     | Redis       | 60s    | Invalidated on revoke          |
| `/v1/api/profile,score,history,endorsements` | Redis | 15s | Per (method,args) memo |
| Snapshot.org fetches     | Next data   | 60s    | `revalidate: 60` on `fetch()`  |
| GitHub fetches           | Next data   | 60s    | Same                           |
| Public `/profile/[addr]` | Next page   | 30s    | `export const revalidate = 30` |

## On-chain contracts

| Contract            | Deployed (StudioNet) |
| ------------------- | -------------------- |
| `reputon.py`        | `0xD7975CeA…d911`    |
| `reputon_nft.py`    | `0xEC90A80b…F34d`    |
| `sybil_oracle.py`   | `0x3E2cCF5a…1408`    |

Surfaces detailed in [`contracts.md`](./contracts.md).

## Scheduler

A single in-process scheduler runs alongside the Hono server:

| Tick      | Job                                           |
| --------- | --------------------------------------------- |
| 5 sec     | `processQueue` — drain up to 5 evaluation jobs |
| 10 sec    | `processRetries` — webhook retry ZSET drain    |
| 60 sec    | `sweepStaleJobs` — fail stuck-running jobs >10m old |

No external job runner / queue server — Postgres + Redis are sufficient.

## Configuration

All env keys are documented in [`env-setup.md`](./env-setup.md). The repo-root
`.env` is the canonical file; `frontend/next.config.ts` and `backend/src/env.ts`
both load it.
