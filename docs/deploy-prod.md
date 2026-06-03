# Production Deploy — Vercel + Fly.io

This walks you through deploying:

- **Frontend** (`frontend/`) → Vercel
- **Backend** (`backend/`) → Fly.io
- **Postgres** → Neon (managed, free tier)
- **Redis** → Upstash (managed, free tier)
- **S3 storage** → optional; keep MinIO local or use Cloudflare R2 / AWS S3

Contracts are already live on Genlayer StudioNet — no changes there.

---

## 0. One-time provisioning (browser)

You'll need three external services. All have generous free tiers and no
credit card required.

| Service     | Purpose                  | URL                                  | Time |
| ----------- | ------------------------ | ------------------------------------ | ---- |
| Neon        | Managed Postgres         | https://console.neon.tech            | 2 min |
| Upstash     | Managed Redis            | https://console.upstash.com          | 2 min |
| Vercel      | Frontend hosting         | https://vercel.com/new                | 3 min |
| Fly.io      | Backend hosting          | install `flyctl` + `flyctl auth signup` | 3 min |

### Neon

1. New project → name "reputon" → region near your Fly region.
2. Copy the **connection string** (shape: `postgres://user:pass@host/db?sslmode=require`).
3. Run migrations against it from your laptop:
   ```bash
   DATABASE_URL='<paste connection string>' npm run db:migrate
   DATABASE_URL='<paste connection string>' npm run db:seed   # optional
   ```

### Upstash

1. New Redis database → name "reputon" → choose region.
2. Copy the **TLS connection string** (shape: `rediss://default:pass@host:port`).

### Fly + Vercel accounts

```bash
brew install flyctl   # or  curl -L https://fly.io/install.sh | sh
flyctl auth signup    # or  flyctl auth login

npm install -g vercel
vercel login
```

---

## 1. Deploy the backend to Fly.io

From the repo root:

```bash
# First time only — create the app on Fly.
flyctl launch --no-deploy \
  -c backend/fly.toml \
  --copy-config \
  --name reputon-backend \
  --region iad

# Set secrets (these don't go in fly.toml).
flyctl secrets set --app reputon-backend \
  DATABASE_URL='<neon connection string>' \
  REDIS_URL='<upstash connection string>' \
  AUTH_SECRET="$(openssl rand -base64 32)" \
  AUTH_URL='https://reputon.vercel.app'

# (Optional) On-chain signer — required for evaluate + mint writes.
# Without this the backend serves reads happily and queues writes as 'failed: no signer'.
flyctl secrets set --app reputon-backend \
  GENLAYER_ACCOUNT_PRIVATE_KEY='0x<your funded studionet key>'

# Deploy.
flyctl deploy -c backend/fly.toml

# Verify.
flyctl status --app reputon-backend
curl https://reputon-backend.fly.dev/v1/health
curl https://reputon-backend.fly.dev/v1/onchain/info
```

You'll get a URL like `https://reputon-backend.fly.dev`. Note it for step 2.

> The included `backend/Dockerfile` is multi-stage: deps in alpine + tsx
> runtime. No build step required since tsx executes the TS source directly.

---

## 2. Deploy the frontend to Vercel

Two ways: dashboard (point-and-click) or CLI. Pick one.

### A. Dashboard (recommended first time)

1. https://vercel.com/new → Import Git Repository → pick `zoefunds/reputon`.
2. **Root Directory:** `frontend`
3. Framework Preset: Next.js (auto-detected)
4. Build / Install / Output Directory: leave **default** (the bundled
   `frontend/vercel.json` overrides them to use the monorepo correctly).
5. Add **Environment Variables**:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | (same Neon URL as Fly) |
   | `AUTH_SECRET` | (same 32-byte secret as Fly) |
   | `AUTH_URL` | `https://<your-vercel-domain>.vercel.app` |
   | `AUTH_TRUST_HOST` | `true` |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://reputon-backend.fly.dev` |
   | `NEXT_PUBLIC_APP_URL` | `https://<your-vercel-domain>.vercel.app` |
   | `NEXT_PUBLIC_APP_NAME` | `Reputon` |
   | `NEXT_PUBLIC_GENLAYER_RPC_URL` | `https://studio.genlayer.com/api` |
   | `NEXT_PUBLIC_GENLAYER_CHAIN_ID` | `61999` |
   | `NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS` | `0xD7975CeA5549459d6eF0913a9fd919d17DE3d911` |
   | `NEXT_PUBLIC_REPUTON_NFT_CONTRACT_ADDRESS` | `0xEC90A80be181Cb2F839A855B2db73406FCbaF34d` |
   | `NEXT_PUBLIC_SYBIL_ORACLE_CONTRACT_ADDRESS` | `0x3E2cCF5a85217b00B5EFBC499922ec0EC5841408` |
   | `GENLAYER_ACCOUNT_PRIVATE_KEY` | (optional — only if frontend should mint NFTs) |
   | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | optional |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `AUTH_EMAIL_FROM` | optional |

6. Click **Deploy**. First build takes ~3 minutes.

### B. CLI

```bash
cd frontend
vercel link --yes
vercel env add DATABASE_URL production
vercel env add AUTH_SECRET production
# ...add the rest from the table above
vercel --prod
```

### After first deploy

Copy your final Vercel URL (e.g. `https://reputon-xyz.vercel.app`) and:

```bash
# Tell the backend its real frontend origin (CORS).
flyctl secrets set --app reputon-backend \
  CORS_ORIGIN='https://reputon-xyz.vercel.app'

# Tell Vercel the same.
vercel env add AUTH_URL production   # paste the URL
vercel env add NEXT_PUBLIC_APP_URL production
vercel --prod                        # redeploy
```

---

## 3. End-to-end smoke (production)

```bash
# Backend
curl -s https://reputon-backend.fly.dev/v1/health        | jq .
curl -s https://reputon-backend.fly.dev/v1/onchain/info  | jq .

# Frontend
curl -s -o /dev/null -w "%{http_code}\n" https://reputon-xyz.vercel.app/
curl -s -o /dev/null -w "%{http_code}\n" https://reputon-xyz.vercel.app/sign-in
curl -s -o /dev/null -w "%{http_code}\n" https://reputon-xyz.vercel.app/dashboard
#   ^ 307 → /sign-in is correct (auth gate)

# Public profile (uses the backend you just stood up)
curl -s -o /dev/null -w "%{http_code}\n" \
  https://reputon-xyz.vercel.app/profile/0x7401c129EDfc26E68FE19309fE461eb3Db1058Eb
```

Sign in via wallet at `https://reputon-xyz.vercel.app/sign-in` to verify
the full session flow.

---

## 4. Custom domain (optional)

### Vercel
Dashboard → Settings → Domains → Add `reputon.xyz`. Follow DNS prompts.

### Fly
```bash
flyctl certs add api.reputon.xyz --app reputon-backend
# then add the CNAME/A records Fly prints to your DNS
```

Update `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`,
`CORS_ORIGIN` once domains are pointed.

---

## 5. Ongoing ops

```bash
# Backend logs
flyctl logs --app reputon-backend

# Restart backend
flyctl machines restart --app reputon-backend

# Postgres schema changes — run from your laptop against Neon.
DATABASE_URL='<neon url>' npm run db:generate
DATABASE_URL='<neon url>' npm run db:migrate

# Promote an admin user in production
DATABASE_URL='<neon url>' npm --workspace backend run promote-admin -- you@example.com

# Set a freshly deployed contract address everywhere
python3 scripts/set_contract_address.py reputon 0x...
flyctl secrets set --app reputon-backend NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS=0x...
vercel env rm NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS production --yes
vercel env add NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS production
vercel --prod
```

For incidents, follow [`runbook.md`](./runbook.md).
