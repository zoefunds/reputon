# Reputon

> The Universal On-Chain Reputation Layer — powered by Genlayer Intelligent Contracts.

Reputon is a decentralized reputation protocol that continuously evaluates wallet
behavior, governance participation, community contributions, historical actions,
cross-protocol activity, and trust relationships to produce a dynamic, AI-powered
reputation score. The score is portable across Web3 applications.

## Status

🚧 Under active development. See [`docs/`](./docs) for architecture and roadmap.

## Workspaces

| Path                       | Stack                                     | Purpose                                  |
| -------------------------- | ----------------------------------------- | ---------------------------------------- |
| `frontend/`                | Next.js 15 · TS · Tailwind · shadcn/ui    | Web app (landing, dashboard, admin)      |
| `backend/`                 | Firebase Functions · TS · Node 20         | REST API, webhooks, jobs                 |
| `intelligent-contracts/`   | Python · Genlayer SDK                     | On-chain reputation, NFT, sybil oracle   |
| `firebase/`                | Firebase config + rules                   | Project config, security, indexes        |
| `scripts/`                 | Python                                    | Repo-wide automation                     |
| `docs/`                    | Markdown                                  | Architecture, API, deployment            |

## Quick start

```bash
# 1) Verify your machine has the required tools
python3 scripts/env_check.py

# 2) (Later phases) Install all workspaces
npm run install:all

# 3) (Later phases) Run local dev
npm run dev
```

## Phase progress

- [x] Phase 0 — Foundations
- [ ] Phase 1 — Design system & frontend shell
- [ ] Phase 2 — Landing site
- [ ] Phase 3 — Firebase wiring
- [ ] Phase 4 — Reputon intelligent contract
- [ ] Phase 5 — NFT + Sybil contracts
- [ ] Phase 6 — Backend API
- [ ] Phase 7 — User dashboard
- [ ] Phase 8 — Contribution analyzer
- [ ] Phase 9 — Reputation NFT UI
- [ ] Phase 10 — Governance reputation
- [ ] Phase 11 — Admin dashboard
- [ ] Phase 12 — Security hardening
- [ ] Phase 13 — Testing
- [ ] Phase 14 — Documentation
- [ ] Phase 15 — Production build

## License

UNLICENSED — internal build.
