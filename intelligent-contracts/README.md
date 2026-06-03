# Reputon — Intelligent Contracts

Genlayer Python contracts that run on Genlayer StudioNet.

## Contracts

| File                       | Status              | Address                                                                          |
| -------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| `reputon.py`               | ✅ deployed (Phase 4) | `0xD7975CeA5549459d6eF0913a9fd919d17DE3d911`                                     |
| `reputon_nft.py`           | ✅ deployed (Phase 5) | `0xEC90A80be181Cb2F839A855B2db73406FCbaF34d`                                     |
| `sybil_oracle.py`          | ✅ deployed (Phase 5) | `0x3E2cCF5a85217b00B5EFBC499922ec0EC5841408`                                     |

---

## `reputon.py` — main reputation contract

Profile, scoring, history, endorsements, AI evaluation. (See Phase 4 commit.)

## `reputon_nft.py` — credential NFTs

Mintable on-chain credentials (achievements, milestones, badges) bound to a
wallet. Soulbound by default; per-tier transferability is configurable by the
contract owner.

### Surface

| Kind  | Method                                                              | Notes                                  |
| ----- | ------------------------------------------------------------------- | -------------------------------------- |
| write | `mint(to, name, desc, image_uri, tier, metadata_json, transferable)` | Authorized minters / owner            |
| write | `mint_self(name, desc, image_uri, tier, metadata_json)`             | Any wallet, only for self-mint tiers   |
| write | `revoke(token_id)`                                                  | Owner or original minter               |
| write | `transfer(token_id, to)`                                            | Only if tier is `transferable`         |
| write | `set_authorized_minter(addr, allowed)` / `set_self_mint_allowed(...)` | Owner-only configuration             |
| view  | `get_contract_info()` · `total_supply()`                            |                                        |
| view  | `get_credential(token_id)` · `get_credentials_of(addr)`             |                                        |
| view  | `has_credential(addr, tier)` · `is_self_mint_allowed(tier)`         |                                        |
| view  | `is_authorized_minter(addr)`                                        |                                        |

Tiers: `genesis` · `bronze` · `silver` · `gold` · `eternal` (genesis is
self-mintable on deploy; others are admin-gated).

## `sybil_oracle.py` — LLM-backed sybil detector

Given an evidence bundle about a wallet (cluster siblings, endorsement graph,
timing patterns), records a severity verdict produced by a Genlayer LLM under
the equivalence principle. The main contract / backend consume this to gate
risky behavior.

### Surface

| Kind  | Method                                                | Notes                                            |
| ----- | ----------------------------------------------------- | ------------------------------------------------ |
| write | `analyze(target, evidence_json)`                      | Anyone may call; LLM verdict (`low`…`critical`)  |
| write | `manual_flag(target, severity, reason, summary)`      | Owner / authorized reporters                     |
| write | `resolve_flag(target, index)`                         | Owner-only                                       |
| write | `set_authorized_reporter(addr, allowed)`              | Owner-only                                       |
| view  | `get_contract_info()`                                 |                                                  |
| view  | `get_flags(addr)` · `get_active_flags(addr)`          |                                                  |
| view  | `get_severity(addr)`                                  | Highest active severity (`""` if none)           |
| view  | `is_suspicious(addr, min_severity)`                   | Gating helper                                    |
| view  | `list_flagged_addresses(limit)`                       |                                                  |

---

## Your deploy step (Genlayer Studio)

```bash
# Copy each file to your clipboard, paste into Studio, hit Deploy:
cat intelligent-contracts/reputon_nft.py   | pbcopy   # → Studio → Deploy → copy address
cat intelligent-contracts/sybil_oracle.py  | pbcopy   # → Studio → Deploy → copy address
```

Both constructors take no arguments. Paste both addresses back in chat. I'll:

```bash
python3 scripts/set_contract_address.py nft   0x…
python3 scripts/set_contract_address.py sybil 0x…
genlayer call 0x… get_contract_info        # verify each
```

…then wire backend services + routes (`/v1/onchain/nft/*`, `/v1/onchain/sybil/*`)
and re-test end-to-end.

---

## CLI deploy (optional)

If you ever want to deploy from the terminal instead of Studio web UI:

```bash
genlayer deploy intelligent-contracts/reputon_nft.py
genlayer deploy intelligent-contracts/sybil_oracle.py
```

(Defaults to whatever network is selected — `genlayer network info` to check.
Set with `genlayer network set studionet`.)
