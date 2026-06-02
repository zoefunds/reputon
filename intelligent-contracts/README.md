# Reputon — Intelligent Contracts

Genlayer Python contracts that run on Genlayer StudioNet.

## Phase 4 — `reputon.py`

The main reputation contract. One deployable file.

### Surface

| Kind  | Method                                            | Notes                          |
| ----- | ------------------------------------------------- | ------------------------------ |
| write | `register_profile(display_name, bio)`             | Caller creates own profile     |
| write | `update_profile_metadata(display_name, bio)`      | Caller-only edit               |
| write | `evaluate_and_update(target, signals_json)`       | Invokes Genlayer LLM (eq.)     |
| write | `add_endorsement(target, weight, note)`           | Caller endorses target         |
| write | `revoke_endorsement(target)`                      |                                |
| view  | `get_contract_info()`                             | version, owner, totals         |
| view  | `has_profile(addr)`                               |                                |
| view  | `get_profile(addr)`                               |                                |
| view  | `get_score(addr)`                                 |                                |
| view  | `verify_score(addr, expected)`                    | Off-chain gating helper        |
| view  | `get_history(addr, limit)`                        | Newest-first, capped at 200    |
| view  | `get_endorsements_given(addr)`                    |                                |
| view  | `get_endorsements_received(addr)`                 |                                |

### LLM safety

`evaluate_and_update` runs its LLM call under
`gl.eq_principle.prompt_comparative(...)`. Every validator re-runs the prompt
and the equivalence criteria require the JSON outputs to agree on category
and on score within ±25 (confidence within ±100). This is what makes the
AI output safe to commit on-chain.

---

## Deploy on Genlayer Studio (web)

You said you'll handle deployment yourself. Steps:

1. Open https://studio.genlayer.com/
2. Click **New Contract** → name it `Reputon`.
3. Open `intelligent-contracts/reputon.py` in your terminal:
   ```bash
   cat intelligent-contracts/reputon.py | pbcopy
   ```
   (copies the whole file to your clipboard on macOS)
4. Paste the contract code into the Studio editor.
5. Hit **Deploy**. The constructor takes no arguments.
6. After deploy completes, copy the **contract address**.
7. Paste the address back in chat — I'll wire it into `.env`, the backend,
   the frontend, and verify the contract from terminal.

That's it for your side.

---

## Optional: terminal deploy

If you ever prefer a CLI deploy instead:

```bash
genlayer deploy \
  --rpc $NEXT_PUBLIC_GENLAYER_RPC_URL \
  --account $GENLAYER_ACCOUNT_ADDRESS \
  --private-key $GENLAYER_ACCOUNT_PRIVATE_KEY \
  --contract intelligent-contracts/reputon.py
```

(Exact flags depend on your `genlayer` CLI version — `genlayer deploy --help`
shows the current syntax. v0.39.x supports the form above.)
