# Deployment

Reputon has four moving parts:

1. **Contracts** — already deployed on Genlayer StudioNet.
2. **Infra** — Postgres + Redis + MinIO.
3. **Backend** — Hono service (`backend/`).
4. **Frontend** — Next.js app (`frontend/`).

This guide walks the production deploy. Localhost is covered by the root
[`README.md`](../README.md) Quick start.

---

## 0. Prereqs

| Tool                | Version   | Why                              |
| ------------------- | --------- | -------------------------------- |
| Node.js             | ≥ 20      | Backend + frontend runtime       |
| npm                 | ≥ 10      | Workspace orchestration          |
| Python              | ≥ 3.11    | Repo scripts                     |
| Docker + Compose v2 | latest    | Infra services                   |
| `genlayer` CLI      | ≥ 0.39    | Schema audits, manual deploys    |
| `openssl`           | any       | Generating `AUTH_SECRET`         |

Run `python3 scripts/env_check.py` to verify.

---

## 1. Provision infra

```bash
cp .env.example .env
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env

# Bring Postgres + Redis + MinIO up
npm run infra:up

# Schema + seed
npm run db:migrate
npm run db:seed
```

For production, replace the Docker volumes with managed services:

- **Postgres** — RDS, Crunchy, Supabase. Set `DATABASE_URL` and **disable**
  the `postgres` service in `infra/docker-compose.yml`.
- **Redis** — Upstash, ElastiCache. Set `REDIS_URL`.
- **S3** — AWS S3 / R2 / B2. Set `S3_ENDPOINT`, keys, and `S3_BUCKET`. The
  app talks any S3-compatible API.

---

## 2. Set contract addresses

If you redeploy any contract, re-wire it:

```bash
python3 scripts/set_contract_address.py reputon 0x...
python3 scripts/set_contract_address.py nft     0x...
python3 scripts/set_contract_address.py sybil   0x...

# Verify
genlayer network set studionet
genlayer call 0x<reputon> get_contract_info
```

---

## 3. Build

```bash
npm install --omit=dev=false
npm run db:generate                       # if schema changed
npm run typecheck
npm test
npm run build:frontend
npm run build:backend
```

Backend output: `backend/dist/index.js`.
Frontend output: `frontend/.next/`.

---

## 4. Run

### Frontend

```bash
NODE_ENV=production npm --workspace frontend run start
```

Listens on `:3000` by default. Put a reverse proxy (Caddy, Nginx, Cloudflare)
in front for TLS termination.

### Backend

```bash
NODE_ENV=production node backend/dist/index.js
```

Listens on `:4001` by default. The scheduler boots inside the same process.

### Process supervisor

Either workspace is a long-running Node process. Use:

- **systemd** units (one per service).
- **pm2** / **supervisord** for multi-process boxes.
- **Kubernetes** Deployment + Service if going container-orchestrated.

Sample systemd unit:

```ini
# /etc/systemd/system/reputon-backend.service
[Unit]
Description=Reputon backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
WorkingDirectory=/srv/reputon
ExecStart=/usr/bin/node /srv/reputon/backend/dist/index.js
Restart=always
RestartSec=2
EnvironmentFile=/srv/reputon/.env
User=reputon
Group=reputon

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now reputon-backend
```

---

## 5. Reverse proxy

Minimal Caddyfile for `https://reputon.example`:

```
reputon.example {
  encode zstd gzip
  reverse_proxy /api/* localhost:3000
  reverse_proxy localhost:3000
}

api.reputon.example {
  encode zstd gzip
  reverse_proxy localhost:4001
}
```

Set:
```
AUTH_URL=https://reputon.example
NEXT_PUBLIC_APP_URL=https://reputon.example
NEXT_PUBLIC_API_BASE_URL=https://api.reputon.example
```

---

## 6. Health checks

Wire your uptime monitor to all three:

```
GET https://reputon.example/                       → 200
GET https://api.reputon.example/v1/health          → 200 (all 3 ok)
GET https://api.reputon.example/v1/onchain/info    → 200
```

Alert if any returns 5xx for ≥ 2 consecutive samples — see
[`runbook.md`](./runbook.md).

---

## 7. Logging / observability

- Backend uses Hono's built-in `logger()` middleware (stdout structured).
- Frontend Next.js logs to stdout in production.
- Pipe both into your log aggregator (Loki, Datadog, etc.) via systemd's
  `journalctl` or container stdout.
- Postgres slow-query log + Redis `MONITOR` only for short diagnostics.

---

## 8. Backups

| Asset                 | Frequency  | Method                                  |
| --------------------- | ---------- | --------------------------------------- |
| Postgres              | hourly     | `pg_dump` to S3 / managed snapshots     |
| MinIO bucket          | daily      | `mc mirror` to cold storage             |
| `.env` + private keys | once       | Sealed (Vault / 1Password / KMS)        |
| `.contract-addresses.json` | per deploy | Committed to repo                  |

Snapshot.org and GitHub data are best-effort and recomputable; no backup needed.

---

## 9. Zero-downtime deploys

Strategy depends on infra. The portable pattern:

1. `npm install && npm test` on the deploy host.
2. Generate Drizzle migrations: `npm run db:generate`.
3. Apply migrations (forward-compatible): `npm run db:migrate`.
4. Build new artifacts.
5. Boot the **new** backend process on `:4002`; once `/v1/health` returns
   200, swap reverse-proxy upstream.
6. Stop the old backend on `:4001`.
7. Repeat for the frontend.

Migrations should be additive (new columns nullable, new tables with defaults).
Destructive migrations need a two-step rollout: deploy app reading both shapes,
then drop columns in the next release.

---

## 10. Disaster recovery

See [`runbook.md`](./runbook.md) — covers signer compromise, DB corruption,
Redis loss, contract bugs, and rotation of every secret.
