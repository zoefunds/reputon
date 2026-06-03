# Reputon API Reference

> Base URL (local): `http://localhost:4001`
> OpenAPI spec: `GET /v1/openapi.json`

All routes return JSON. Errors share the shape:

```json
{ "error": { "message": "human-readable", "code": 400 } }
```

---

## Authentication

Most public reads work without a key but get a stricter rate limit. Writes
and per-user routes need an API key:

```
Authorization: Bearer rk_<env>_<24-char-base32>
```

Create one from the dashboard (`/dashboard/api-keys`) or via curl once you
have a session cookie:

```bash
curl -X POST http://localhost:3000/api/me/api-keys \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"name":"my-app","env":"test"}'
```

The plaintext `key` is shown **once**. Store it.

---

## Reputation (`/v1/api/*`)

### `GET /v1/api/profile`

Get the full on-chain profile for a wallet.

```bash
curl "http://localhost:4001/v1/api/profile?address=0xada...000"
```

```json
{
  "address": "0xada...000",
  "display_name": "Ada Lovelace",
  "bio": "Long-time governance voter.",
  "score": 932,
  "confidence": 940,
  "category": "eminent",
  "last_evaluated_at": 1780000000,
  "created_at": 1779000000,
  "evaluations": 12
}
```

Errors: `400` invalid address · `404` profile not found · `503` contract not configured

### `GET /v1/api/score`

The lean projection — just the integer + category. Best for high-volume gating.

```bash
curl "http://localhost:4001/v1/api/score?address=0xada...000"
```

### `GET /v1/api/history?address=&limit=`

Newest-first score updates, capped at 200.

```bash
curl "http://localhost:4001/v1/api/history?address=0xada...000&limit=10"
```

Each entry carries `score`, `delta`, `category`, `reason`, AI `explanation`,
and a 4-component `breakdown` (`activity` · `governance` · `contribution` · `trust`).

### `GET /v1/api/endorsements?address=&direction=given|received`

```bash
curl "http://localhost:4001/v1/api/endorsements?address=0xada...000&direction=received"
```

### `POST /v1/api/evaluate`  *(auth · scope `write:evaluate` · 10/min)*

Queue an AI evaluation. Returns `202 Accepted` with a job id.

```bash
curl -X POST http://localhost:4001/v1/api/evaluate \
  -H "Authorization: Bearer rk_test_XXX" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xada...000",
    "signals": {
      "activity": "high",
      "governance": "consistent",
      "contributions": ["github:foo/bar#42"]
    }
  }'
```

```json
{ "job_id": "b0420eb6-...", "status": "queued", "address": "0xada...000" }
```

Poll for completion:

```bash
curl http://localhost:4001/v1/api/evaluate/b0420eb6-... \
  -H "Authorization: Bearer rk_test_XXX"
```

When the backend has a Genlayer signer configured the job moves to `done`
and the new score is reflected in `/score` / `/history` on the next read.

### `POST /v1/api/verify`

Server-signed proof that an address has a given score. Useful when a relayer
or off-chain service needs to vouch for the value without re-querying.

```bash
curl -X POST http://localhost:4001/v1/api/verify \
  -H "Content-Type: application/json" \
  -d '{"address":"0xada...000","score":932}'
```

```json
{
  "address": "0xada...000",
  "expected_score": 932,
  "verified": true,
  "ts": 1780446581,
  "signature": "38ecb0859be5..."
}
```

The signature is `HMAC-SHA256(AUTH_SECRET, JSON.stringify(payload))`. Consumers
verify by recomputing.

---

## On-chain read-through (`/v1/onchain/*`)

These bypass the Redis cache and read straight from the contract. Useful when
you need the freshest possible value.

| Route                                                          | Method | Reads |
| -------------------------------------------------------------- | ------ | ----- |
| `/v1/onchain/info`                                             | GET    | `reputon.get_contract_info` |
| `/v1/onchain/profile?address=`                                 | GET    | `reputon.get_profile` |
| `/v1/onchain/score?address=`                                   | GET    | `reputon.get_score` |
| `/v1/onchain/history?address=&limit=`                          | GET    | `reputon.get_history` |
| `/v1/onchain/verify?address=&score=`                           | GET    | `reputon.verify_score` |
| `/v1/onchain/endorsements/given?address=`                      | GET    | `reputon.get_endorsements_given` |
| `/v1/onchain/endorsements/received?address=`                   | GET    | `reputon.get_endorsements_received` |
| `/v1/onchain/nft/info`                                         | GET    | `reputon_nft.get_contract_info` |
| `/v1/onchain/nft/supply`                                       | GET    | `reputon_nft.total_supply` |
| `/v1/onchain/nft/credential/:id`                               | GET    | `reputon_nft.get_credential` |
| `/v1/onchain/nft/of?address=`                                  | GET    | `reputon_nft.get_credentials_of` |
| `/v1/onchain/nft/has?address=&tier=`                           | GET    | `reputon_nft.has_credential` |
| `/v1/onchain/nft/self-mint-allowed/:tier`                      | GET    | `reputon_nft.is_self_mint_allowed` |
| `/v1/onchain/nft/minter/:address`                              | GET    | `reputon_nft.is_authorized_minter` |
| `/v1/onchain/sybil/info`                                       | GET    | `sybil_oracle.get_contract_info` |
| `/v1/onchain/sybil/flags?address=`                             | GET    | `sybil_oracle.get_flags` |
| `/v1/onchain/sybil/active-flags?address=`                      | GET    | `sybil_oracle.get_active_flags` |
| `/v1/onchain/sybil/severity?address=`                          | GET    | `sybil_oracle.get_severity` |
| `/v1/onchain/sybil/is-suspicious?address=&min=low\|medium\|high\|critical` | GET | `sybil_oracle.is_suspicious` |
| `/v1/onchain/sybil/flagged?limit=`                             | GET    | `sybil_oracle.list_flagged_addresses` |

---

## User management (`/v1/me/*`) — Bearer auth required

### API keys

```bash
# list
curl -H "Authorization: Bearer rk_test_XXX" http://localhost:4001/v1/me/api-keys

# create — returns plaintext ONCE
curl -X POST -H "Authorization: Bearer rk_test_XXX" \
     -H "Content-Type: application/json" \
     -d '{"name":"production","env":"live","scopes":["read:score","write:evaluate"]}' \
     http://localhost:4001/v1/me/api-keys

# revoke
curl -X DELETE -H "Authorization: Bearer rk_test_XXX" \
     http://localhost:4001/v1/me/api-keys/<key-uuid>
```

### Webhooks

```bash
# register — returns signing secret ONCE
curl -X POST -H "Authorization: Bearer rk_test_XXX" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://your.app/hooks/reputon","eventTypes":["score.updated"]}' \
     http://localhost:4001/v1/me/webhooks

# list (secret stripped)
curl -H "Authorization: Bearer rk_test_XXX" http://localhost:4001/v1/me/webhooks

# delete
curl -X DELETE -H "Authorization: Bearer rk_test_XXX" \
     http://localhost:4001/v1/me/webhooks/<id>
```

#### Webhook signature verification (consumer side, Node)

```ts
import crypto from "node:crypto";

function verify(secret: string, body: string, header: string, skewSec = 300) {
  const map = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const t = Number(map.t);
  if (Math.abs(Date.now() / 1000 - t) > skewSec) return false; // replay defense
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${body}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(map.v1), Buffer.from(expected));
}
```

Events emitted today:

| Event                 | Trigger                                    |
| --------------------- | ------------------------------------------ |
| `profile.created`     | First on-chain registration                |
| `score.updated`       | After `evaluate_and_update` settles        |
| `endorsement.added`   | New endorsement on-chain                   |
| `endorsement.revoked` | Endorsement revoked                        |
| `evaluation.completed`| Job queue completion (success or failure)  |
| `sybil.flagged`       | Severity ≥ medium recorded                 |
| `nft.minted`          | New credential minted                      |

---

## Rate limits

Sliding window, 60 seconds, Redis-backed. Headers:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 117
```

| Surface                    | Authed (key) | Anonymous |
| -------------------------- | -----------: | --------: |
| Default `/v1/*`            |          120 |        30 |
| `POST /v1/api/evaluate`    |           10 |         0 |
| Body cap (any request)     |           — | 256 KB → 413 |

Exceeding limits returns `429 Too Many Requests`.

---

## OpenAPI

```bash
curl http://localhost:4001/v1/openapi.json
```

Import into Swagger UI / Stoplight / Postman for an interactive surface.
