# Contract Security Checklist

Three contracts on Genlayer StudioNet:

| Contract            | Address                                       |
| ------------------- | --------------------------------------------- |
| `reputon.py`        | `0xD7975CeA5549459d6eF0913a9fd919d17DE3d911`  |
| `reputon_nft.py`    | `0xEC90A80be181Cb2F839A855B2db73406FCbaF34d`  |
| `sybil_oracle.py`   | `0x3E2cCF5a85217b00B5EFBC499922ec0EC5841408`  |

---

## Access control

| Method                          | Caller restriction                          |
| ------------------------------- | ------------------------------------------- |
| `register_profile`              | self-write only (sender → own profile)      |
| `update_profile_metadata`       | self-write only                             |
| `evaluate_and_update`           | open (LLM equivalence enforces honesty)     |
| `add_endorsement`               | profile must exist; cannot endorse self     |
| `revoke_endorsement`            | only original endorser                      |
| `mint`                          | owner OR authorized minter                  |
| `mint_self`                     | open, gated by `self_mint_allowed[tier]`    |
| `transfer`                      | owner of token, only if tier transferable   |
| `revoke` (NFT)                  | contract owner OR minter                    |
| `manual_flag` (sybil)           | owner OR authorized reporter                |
| `analyze` (sybil)               | open                                        |
| `resolve_flag`                  | owner only                                  |
| `transfer_ownership`            | owner only                                  |
| `set_authorized_minter/reporter`| owner only                                  |
| `set_self_mint_allowed`         | owner only                                  |

## Input validation

Every string input is length-clamped at the contract level:

- `display_name` ≤ 80  ·  `bio` ≤ 280
- `note` ≤ 200  ·  `signals_json` ≤ 4000
- `nft.name` ≤ 80  ·  `nft.description` ≤ 400
- `image_uri` ≤ 400  ·  `metadata_json` ≤ 4000
- `evidence_json` ≤ 4000

Integers (`weight`, `score`, `confidence`, `breakdown`) are clamped to their
documented ranges before any storage write.

## Reentrancy / external calls

The contracts only make one kind of external call: Genlayer LLMs via
`gl.eq_principle.prompt_comparative`. There are no value transfers, no
`call`/`delegatecall`, no untrusted contract calls — so reentrancy is N/A.

## Overflow

All arithmetic is on Python integers within u256 storage cells. The standard
bounds:
- `score` ≤ 1000, clamped.
- `confidence` ≤ 1000, clamped.
- History trimmed to `MAX_HISTORY=200` per profile.
- `MAX_FLAGS_PER_ADDR=100` for sybil flags.

## LLM equivalence

`evaluate_and_update` and `analyze` both run their LLM call through
`gl.eq_principle.prompt_comparative(callable, criteria)`. The criteria:

- Reputon: JSON keys identical, score Δ≤25, confidence Δ≤100, category
  string identical.
- Sybil: JSON keys identical, severity string identical.

Validators that disagree force re-evaluation; the consensus output wins.

## Upgradeability

None. The contracts are deployed once. If we need to migrate, we deploy a
new contract and update `.env` via
`python3 scripts/set_contract_address.py reputon 0x…`. The new contract
re-imports state from off-chain mirrors (Postgres) when possible.

## Audit log of state-changing operations

- `total_profiles`, `total_evaluations`, `total_endorsements` (Reputon)
- `total_supply`, `total_revoked` (NFT)
- `total_flags`, `total_resolved` (Sybil Oracle)

All three contracts expose these via `get_contract_info()` for monitoring.

## Known limitations

- LLM equivalence loosens guarantees when validator quorum is small. On
  StudioNet today this is acceptable for the protocol's launch phase.
- The Sybil Oracle's `_record_flag` hash function is non-cryptographic (a
  cheap rolling sum); it's used for dedup, NOT for integrity, and that's
  intentional.
- Owner-controlled mint allowlists & authorized-reporter sets are MUTABLE
  by the contract owner. A renounce-ownership operation isn't implemented
  — add one before mainnet deploy if the protocol decides to decentralize
  fully.

## Sign-off checklist (run before every contract change)

- [ ] `python3 -c "import ast; ast.parse(open('intelligent-contracts/reputon.py').read())"`
- [ ] `genlayer schema <addr>` matches the source method list.
- [ ] No new untrusted external calls introduced.
- [ ] Input length / range clamps in place on every new parameter.
- [ ] All `*_ownership` and `set_*` mutators owner-gated.
- [ ] `total_*` counters incremented in every new write path.
- [ ] AI-derived outputs run under `gl.eq_principle.*`.
