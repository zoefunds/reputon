# Reputon — Incident-Response Runbook

How to act during a live incident. Keep this lean — read top-to-bottom.

---

## 0. Triage (60 seconds)

1. **Confirm the symptom.** `curl http://localhost:4001/v1/health` from the
   backend host. Note which of `postgres / redis / storage` report bad.
2. **Check container state.** `npm run infra:up` won't hurt; `docker compose -f infra/docker-compose.yml ps` shows status.
3. **Open the admin dashboard** at `/admin` — note Jobs queued/failed, sybil
   active flags, webhook failure rate. Snapshots get you context fast.

---

## 1. Compromised API key

- Find the key prefix from logs: it appears in `X-RateLimit-*` headers and
  in `apiKeys.prefix` (12 chars).
- Open `/admin/users` → find the user → tell them to revoke from
  `/dashboard/api-keys`. Or revoke directly:
  ```sql
  UPDATE api_key SET revoked_at = now() WHERE prefix = 'rk_live_XX...';
  ```
- Cache TTL is 60s; effective immediately after that.
- If the key was used for any `POST /v1/api/evaluate`, audit
  `evaluation_job` rows by `user_id` and the resulting on-chain tx hashes.

## 2. Webhook secret leaked

- Delete the webhook (admin can `DELETE /v1/me/webhooks/:id` on behalf;
  user can do it from `/dashboard/webhooks`).
- Re-register the endpoint — a new secret is minted and shown ONCE.
- Audit recent `webhook_delivery` rows for unexpected destinations.

## 3. AUTH_SECRET leaked

This invalidates every session everywhere.

1. Generate a new secret: `openssl rand -base64 32`.
2. Replace `AUTH_SECRET` in `.env`.
3. Restart the frontend and backend processes.
4. All users will be signed out; SIWE / OAuth / email links still work.

## 4. Database compromise

- `apiKeys.hashedSecret` is SHA-256; live keys cannot be derived from a
  dump. Still, rotate every key (run a bulk revoke query).
- `webhooks.secret` IS stored plaintext (required for HMAC signing) —
  rotate every webhook.
- `sessions.sessionToken` exposure invalidates as soon as `AUTH_SECRET` is
  rotated.

## 5. Genlayer signer compromise

- `GENLAYER_ACCOUNT_PRIVATE_KEY` (if used by backend) controls the contract
  owner role on all three contracts. If leaked:
  - Transfer ownership on NFT + Sybil contracts to a fresh key:
    ```
    genlayer write 0xEC90A8...F34d transfer_ownership --args 0x<new>
    genlayer write 0x3E2cCF...1408 transfer_ownership --args 0x<new>
    ```
  - The main `reputon.py` contract has no ownership concept (any wallet
    can call evaluations).
  - Update `.env` with the new key, restart backend.

## 6. Contract bug (any of the three)

1. Pause writes by setting `GENLAYER_ACCOUNT_PRIVATE_KEY=""` and
   restarting the backend — the scheduler will mark new eval jobs as
   `failed: no signer`. Mints will return 503.
2. Communicate via status page / Discord.
3. Patch the contract source in `intelligent-contracts/<name>.py`. Run
   `python3 -c "import ast; ast.parse(open('intelligent-contracts/<name>.py').read())"` to verify it parses.
4. Deploy the new contract version on Studio. Capture the new address.
5. `python3 scripts/set_contract_address.py <kind> 0x<new>`.
6. Verify: `genlayer call 0x<new> get_contract_info`.
7. Restart backend.
8. File a post-mortem in `docs/postmortems/<date>-<short>.md`.

## 7. Snapshot.org / GitHub outage

These are best-effort enrichment sources. The adapters return empty arrays
on upstream failure (HTTP 5xx / timeout). UI shows "no activity found".
Recovery is automatic; no action required.

## 8. Redis outage

- Rate limiter and webhook retries depend on it. Failed
  rate-limit operations turn into 500s.
- `docker compose restart redis` is the fast path; persistence is enabled
  (`appendonly yes`), so no data loss for queued retries unless the volume
  is corrupted.

## 9. Postgres outage

- Everything dies. Boot it: `npm run infra:up`.
- If the volume is corrupted, restore from the most recent backup, then
  run `npm run db:migrate` to bring schema to head.

---

## Health probes for monitoring

| URL                                        | Expected                |
| ------------------------------------------ | ----------------------- |
| `GET /v1/health`                           | 200 with all 3 `ok`     |
| `GET /v1/onchain/info`                     | 200 with contract info  |
| `GET /v1/openapi.json`                     | 200, 3.1.0 spec         |
| `GET http://localhost:3000/`               | 200                     |

Alert if any of these returns 5xx for >2 consecutive samples.
