# Reputon — Local Infrastructure

Docker Compose stack used by the backend in development.

| Service  | Image               | Host port           | Purpose                           |
| -------- | ------------------- | ------------------- | --------------------------------- |
| postgres | `postgres:16-alpine`| `${POSTGRES_PORT}`  | Primary datastore                 |
| redis    | `redis:7-alpine`    | `${REDIS_PORT}`     | Cache, rate-limits, jobs          |
| minio    | `minio/minio:latest`| `9000` (api), `9001` (web) | S3-compatible blob storage |

The exact host ports come from the repo-root `.env` file. The current dev
machine has the following conflict-free defaults:

```
POSTGRES_PORT=55432
REDIS_PORT=6380
MinIO API=9000  /  console=9001
```

## Common commands (from repo root)

```bash
npm run infra:up        # start everything detached
npm run infra:logs      # tail logs
npm run infra:down      # stop containers (keeps data)
npm run infra:reset     # stop + remove volumes (DESTROYS DATA)
```

## First-run schema

```bash
npm run db:generate     # regenerate SQL when @reputon/db schema changes
npm run db:migrate      # apply migrations to Postgres
npm run db:seed         # insert sample profiles/scores/endorsements/NFTs
```

## Connectivity smoke test

```bash
npm --workspace backend run check
```

Should print `ok` for postgres, redis, and storage.

## MinIO web console

http://localhost:9001 — log in with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
from `.env`.

The `reputon-assets` bucket is auto-created on first start by the
`minio-init` one-shot service.
