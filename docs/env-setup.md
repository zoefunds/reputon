# Environment Setup

Reputon reads a single `.env` at the repo root. Both `frontend/next.config.ts`
and `backend/src/env.ts` load it via `dotenv` so workspace-local config isn't
needed.

```bash
cp .env.example .env
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env
```

Below: every variable, why it matters, and the safe default.

---

## Postgres

| Variable             | Default                                          | Notes                                  |
| -------------------- | ------------------------------------------------ | -------------------------------------- |
| `POSTGRES_HOST`      | `localhost`                                      |                                        |
| `POSTGRES_PORT`      | `55432`                                          | Bumped off 5432 to avoid Mac conflicts |
| `POSTGRES_USER`      | `reputon`                                        |                                        |
| `POSTGRES_PASSWORD`  | `reputon`                                        | Change in production                   |
| `POSTGRES_DB`        | `reputon`                                        |                                        |
| `DATABASE_URL`       | `postgres://reputon:reputon@localhost:55432/reputon` | Auth.js + Drizzle + backend all use this |

## Redis

| Variable        | Default                            | Notes                                |
| --------------- | ---------------------------------- | ------------------------------------ |
| `REDIS_HOST`    | `localhost`                        |                                      |
| `REDIS_PORT`    | `6380`                             | Bumped off 6379                      |
| `REDIS_URL`     | `redis://localhost:6380`           | Used by ioredis client               |

## MinIO (S3 API)

| Variable               | Default                  |
| ---------------------- | ------------------------ |
| `MINIO_ROOT_USER`      | `reputon`                |
| `MINIO_ROOT_PASSWORD`  | `reputonsecret`          |
| `S3_ENDPOINT`          | `http://localhost:9000`  |
| `S3_REGION`            | `us-east-1`              |
| `S3_ACCESS_KEY`        | `reputon`                |
| `S3_SECRET_KEY`        | `reputonsecret`          |
| `S3_BUCKET`            | `reputon-assets`         |
| `S3_FORCE_PATH_STYLE`  | `true`                   |

Web console: http://localhost:9001 (auto-creates the bucket via the
`minio-init` one-shot in `infra/docker-compose.yml`).

## Auth.js (v5)

| Variable             | Required?                | Notes                                          |
| -------------------- | ------------------------ | ---------------------------------------------- |
| `AUTH_SECRET`        | **YES**                  | `openssl rand -base64 32`. Rotating invalidates all sessions. |
| `AUTH_URL`           | yes                      | `http://localhost:3000` locally                |
| `AUTH_TRUST_HOST`    | yes                      | `true` for self-host                           |
| `AUTH_GOOGLE_ID`     | optional                 | When set, Google sign-in appears               |
| `AUTH_GOOGLE_SECRET` | optional                 |                                                |
| `AUTH_EMAIL_FROM`    | optional                 | e.g. `"Reputon <no-reply@reputon.local>"`      |
| `SMTP_HOST`          | optional                 | When set with `AUTH_EMAIL_FROM`, magic-link sign-in appears |
| `SMTP_PORT`          | `587`                    |                                                |
| `SMTP_USER` `SMTP_PASSWORD` | optional          |                                                |

Wallet sign-in (SIWE) works out of the box — no env config needed.

## Backend API

| Variable                    | Default                       | Notes                            |
| --------------------------- | ----------------------------- | -------------------------------- |
| `BACKEND_PORT`              | `4001`                        | Hono server port                 |
| `NEXT_PUBLIC_API_BASE_URL`  | `http://localhost:4001`       | Frontend → backend base URL      |
| `API_RATE_LIMIT_PER_MIN`    | `120`                         | Default key quota                |

## Genlayer

| Variable                                | Default                                          | Notes                                   |
| --------------------------------------- | ------------------------------------------------ | --------------------------------------- |
| `NEXT_PUBLIC_GENLAYER_RPC_URL`          | `https://studio.genlayer.com/api`                | Switch via `genlayer network set …`     |
| `NEXT_PUBLIC_GENLAYER_CHAIN_ID`         | `61999`                                          | studionet                               |
| `GENLAYER_ACCOUNT_PRIVATE_KEY`          | unset                                            | Required for on-chain WRITES (eval, mint) |
| `GENLAYER_ACCOUNT_ADDRESS`              | unset                                            | Informational                           |
| `NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS`  | `0xD7975CeA…`                                    | Set by `set_contract_address.py reputon` |
| `NEXT_PUBLIC_REPUTON_NFT_CONTRACT_ADDRESS` | `0xEC90A80b…`                                 | Set by `set_contract_address.py nft`    |
| `NEXT_PUBLIC_SYBIL_ORACLE_CONTRACT_ADDRESS` | `0x3E2cCF5a…`                                | Set by `set_contract_address.py sybil`  |

## App

| Variable                | Default                | Notes                          |
| ----------------------- | ---------------------- | ------------------------------ |
| `NEXT_PUBLIC_APP_URL`   | `http://localhost:3000`|                                |
| `NEXT_PUBLIC_APP_NAME`  | `Reputon`              |                                |
| `NODE_ENV`              | `development`          | `production` flips CSP strict  |
| `GITHUB_TOKEN`          | optional               | Raises GitHub rate-limit on analyzer ingestion |

---

## Verifying

```bash
# Tool versions
python3 scripts/env_check.py

# Stack reachable
npm --workspace backend run check
# postgres   ok ...
# redis      ok (PONG)
# storage    ok (bucket=reputon-assets)

# Build everything
npm run typecheck && npm test
```

## Production checklist

- [ ] `AUTH_SECRET` is fresh and stored in a secret manager (not in git).
- [ ] `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, `S3_SECRET_KEY` rotated.
- [ ] `NEXT_PUBLIC_API_BASE_URL` and `AUTH_URL` point at the production host.
- [ ] `NEXT_PUBLIC_GENLAYER_RPC_URL` and chain ID match the deployment target.
- [ ] `GENLAYER_ACCOUNT_PRIVATE_KEY` is the protocol-runner key (funded).
- [ ] `NODE_ENV=production` (strips dev CSP loosenings).
- [ ] Contract addresses match the canonical deploy ledger in `.contract-addresses.json`.
