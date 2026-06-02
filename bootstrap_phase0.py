#!/usr/bin/env python3
"""
Reputon — Phase 0 bootstrap.

Creates the full folder skeleton and the foundation files:
  - root package.json (npm workspaces: frontend, backend)
  - .gitignore
  - .env.example
  - README.md
  - scripts/env_check.py
  - scripts/_helpers.py
  - .gitkeep markers in every empty folder so git tracks them later

Idempotent: safe to re-run. Existing non-empty files are NOT overwritten
unless --force is passed.

Usage:
    python3 bootstrap_phase0.py
    python3 bootstrap_phase0.py --force
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Folder tree (relative to repo root)
# ---------------------------------------------------------------------------
DIRS = [
    # frontend
    "frontend",
    "frontend/public/og",
    "frontend/src/app",
    "frontend/src/app/features",
    "frontend/src/app/engine",
    "frontend/src/app/use-cases",
    "frontend/src/app/docs",
    "frontend/src/app/roadmap",
    "frontend/src/app/team",
    "frontend/src/app/contact",
    "frontend/src/app/(auth)/sign-in",
    "frontend/src/app/(auth)/sign-up",
    "frontend/src/app/dashboard",
    "frontend/src/app/dashboard/analyzer",
    "frontend/src/app/dashboard/endorsements",
    "frontend/src/app/dashboard/nfts",
    "frontend/src/app/dashboard/history",
    "frontend/src/app/dashboard/settings",
    "frontend/src/app/profile/[address]",
    "frontend/src/app/admin",
    "frontend/src/app/admin/users",
    "frontend/src/app/admin/evaluations",
    "frontend/src/app/admin/metrics",
    "frontend/src/components/ui",
    "frontend/src/components/landing",
    "frontend/src/components/dashboard",
    "frontend/src/components/reputation",
    "frontend/src/components/analyzer",
    "frontend/src/components/nft",
    "frontend/src/components/admin",
    "frontend/src/components/auth",
    "frontend/src/components/common",
    "frontend/src/lib/firebase",
    "frontend/src/lib/genlayer",
    "frontend/src/lib/api",
    "frontend/src/hooks",
    "frontend/src/stores",
    "frontend/src/styles",
    "frontend/src/types",
    "frontend/tests/unit",
    "frontend/tests/e2e",
    # backend
    "backend/src/api",
    "backend/src/webhooks",
    "backend/src/jobs",
    "backend/src/services",
    "backend/src/middleware",
    "backend/src/lib",
    "backend/src/types",
    "backend/tests",
    # intelligent contracts
    "intelligent-contracts/deploy",
    "intelligent-contracts/scripts",
    "intelligent-contracts/tests",
    "intelligent-contracts/abi",
    # firebase
    "firebase",
    # scripts
    "scripts",
    # cross-cutting tests
    "tests/integration",
    "tests/e2e",
    # docs
    "docs",
    # assets
    "assets/brand",
    "assets/screenshots",
    "assets/nft-templates",
]

# ---------------------------------------------------------------------------
# File contents
# ---------------------------------------------------------------------------
PACKAGE_JSON = r"""{
  "name": "reputon",
  "version": "0.1.0",
  "private": true,
  "description": "Reputon — Universal On-Chain Reputation Layer powered by Genlayer Intelligent Contracts.",
  "license": "UNLICENSED",
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "env:check": "python3 scripts/env_check.py",
    "dev": "python3 scripts/dev.py",
    "install:all": "python3 scripts/install_all.py",
    "deploy:all": "python3 scripts/deploy_all.py",
    "frontend": "npm --workspace frontend run dev",
    "backend": "npm --workspace backend run serve"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
"""

GITIGNORE = r"""# ---- Node / npm ----
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# ---- Next.js ----
.next/
out/
.vercel/
*.tsbuildinfo
next-env.d.ts

# ---- Build output ----
dist/
build/
lib/
*.log

# ---- Environment ----
.env
.env.local
.env.*.local
.env.development
.env.production
.env.test
!.env.example

# ---- Firebase ----
.firebase/
firebase-debug.log*
firestore-debug.log*
ui-debug.log*
.firebaserc

# ---- Python ----
__pycache__/
*.py[cod]
*$py.class
*.egg-info/
.venv/
venv/
.python-version
.pytest_cache/
.mypy_cache/
.ruff_cache/

# ---- Genlayer ----
.genlayer/
intelligent-contracts/abi/*.json
!intelligent-contracts/abi/.gitkeep

# ---- Testing ----
coverage/
.nyc_output/
playwright-report/
test-results/

# ---- OS ----
.DS_Store
Thumbs.db
desktop.ini

# ---- Editor (just in case) ----
.idea/
.vscode/
*.swp
*.swo

# ---- Local addresses written by deploy scripts ----
.contract-addresses.json
"""

ENV_EXAMPLE = r"""# =====================================================================
# Reputon — Environment variables template
# Copy this file to `.env` (root) or to workspace-specific `.env.local`.
# NEVER commit the real .env.
# =====================================================================

# ----- Firebase (client / public) -----
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# ----- Firebase (server / admin) -----
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# ----- Genlayer StudioNet -----
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com:8443/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61_999
GENLAYER_ACCOUNT_PRIVATE_KEY=
GENLAYER_ACCOUNT_ADDRESS=

# ----- Deployed contract addresses (filled after Phase 4/5) -----
NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS=
NEXT_PUBLIC_REPUTON_NFT_CONTRACT_ADDRESS=
NEXT_PUBLIC_SYBIL_ORACLE_CONTRACT_ADDRESS=

# ----- Backend API -----
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
API_RATE_LIMIT_PER_MIN=60

# ----- External (optional, used by analyzer) -----
GITHUB_TOKEN=

# ----- App config -----
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Reputon
NODE_ENV=development
"""

README = r"""# Reputon

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
"""

HELPERS_PY = r'''"""Shared helpers used by every Reputon Python automation script.

Keep this file dependency-free (stdlib only) so it always runs on a fresh Mac.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Iterable

# ANSI color codes
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
GREEN = "\033[32m"
RED = "\033[31m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
CYAN = "\033[36m"


def repo_root() -> Path:
    """Return the repo root (the directory that contains this scripts/ folder)."""
    here = Path(__file__).resolve()
    # scripts/_helpers.py -> parents[1] is repo root
    return here.parents[1]


def info(msg: str) -> None:
    print(f"{CYAN}[i]{RESET} {msg}")


def ok(msg: str) -> None:
    print(f"{GREEN}[ok]{RESET} {msg}")


def warn(msg: str) -> None:
    print(f"{YELLOW}[warn]{RESET} {msg}")


def fail(msg: str) -> None:
    print(f"{RED}[fail]{RESET} {msg}", file=sys.stderr)


def header(msg: str) -> None:
    bar = "─" * max(8, len(msg) + 4)
    print(f"\n{BOLD}{bar}{RESET}")
    print(f"{BOLD}  {msg}{RESET}")
    print(f"{BOLD}{bar}{RESET}")


def which(cmd: str) -> str | None:
    return shutil.which(cmd)


def run(cmd: list[str] | str, cwd: Path | None = None, check: bool = True,
        capture: bool = False) -> subprocess.CompletedProcess:
    """Run a shell command. Streams output by default."""
    if isinstance(cmd, str):
        shell = True
        printable = cmd
    else:
        shell = False
        printable = " ".join(cmd)
    info(f"$ {printable}")
    return subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        check=check,
        shell=shell,
        capture_output=capture,
        text=True,
    )


def write_file(path: Path, content: str, force: bool = False) -> bool:
    """Create or overwrite a file. Returns True if written, False if skipped."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not force:
        if path.read_text(encoding="utf-8") == content:
            return False
        # exists with different content and not forcing
        warn(f"exists, skipping (use --force to overwrite): {path}")
        return False
    path.write_text(content, encoding="utf-8")
    ok(f"wrote {path}")
    return True


def ensure_dirs(root: Path, dirs: Iterable[str]) -> None:
    for d in dirs:
        p = root / d
        p.mkdir(parents=True, exist_ok=True)
        gitkeep = p / ".gitkeep"
        if not any(p.iterdir()):
            gitkeep.touch()
'''

ENV_CHECK_PY = r'''#!/usr/bin/env python3
"""Verify the local machine has the tools Reputon needs.

Checks (warns on missing optional tools, fails on missing required ones):

  Required:
    - python3 >= 3.11
    - node    >= 20
    - npm     >= 10
    - git

  Recommended (warn-only at this phase):
    - firebase (Firebase CLI)
    - genlayer (Genlayer CLI)

Exit code 0 on success, 1 on any required tool missing.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from dataclasses import dataclass

# Re-use helpers if available; otherwise inline minimal colors so this script
# is safe to run standalone before the rest of the repo is bootstrapped.
try:
    from _helpers import ok, fail, warn, info, header  # type: ignore
except Exception:  # pragma: no cover
    RESET = "\033[0m"; GREEN = "\033[32m"; RED = "\033[31m"
    YELLOW = "\033[33m"; CYAN = "\033[36m"; BOLD = "\033[1m"
    def ok(m): print(f"{GREEN}[ok]{RESET} {m}")
    def fail(m): print(f"{RED}[fail]{RESET} {m}", file=sys.stderr)
    def warn(m): print(f"{YELLOW}[warn]{RESET} {m}")
    def info(m): print(f"{CYAN}[i]{RESET} {m}")
    def header(m):
        bar = "─" * max(8, len(m) + 4)
        print(f"\n{BOLD}{bar}{RESET}\n{BOLD}  {m}{RESET}\n{BOLD}{bar}{RESET}")


@dataclass
class Tool:
    name: str
    cmd: list[str]
    min_version: tuple[int, ...] | None
    required: bool
    hint: str


TOOLS: list[Tool] = [
    Tool("python3", ["python3", "--version"], (3, 11), True,
         "Install Python 3.11+ from https://www.python.org/downloads/macos/ or `brew install python@3.12`"),
    Tool("node", ["node", "--version"], (20, 0), True,
         "Install Node 20+: `brew install node@20` then `brew link --overwrite --force node@20`"),
    Tool("npm", ["npm", "--version"], (10, 0), True,
         "npm ships with node. Upgrade via `npm install -g npm@latest`."),
    Tool("git", ["git", "--version"], None, True,
         "Install with `xcode-select --install` or `brew install git`."),
    Tool("firebase", ["firebase", "--version"], None, False,
         "Install with `npm install -g firebase-tools`. Needed in Phase 3."),
    Tool("genlayer", ["genlayer", "--version"], None, False,
         "Install per Genlayer docs (https://docs.genlayer.com/). Needed in Phase 4."),
]


VERSION_RE = re.compile(r"(\d+)\.(\d+)(?:\.(\d+))?")


def parse_version(s: str) -> tuple[int, ...] | None:
    m = VERSION_RE.search(s)
    if not m:
        return None
    return tuple(int(x) for x in m.groups(default="0"))


def version_ok(actual: tuple[int, ...], minimum: tuple[int, ...]) -> bool:
    return actual >= minimum


def check_tool(t: Tool) -> bool:
    exe = shutil.which(t.cmd[0])
    if not exe:
        if t.required:
            fail(f"{t.name}: NOT FOUND. {t.hint}")
            return False
        warn(f"{t.name}: not found (optional for this phase). {t.hint}")
        return True
    try:
        out = subprocess.run(t.cmd, capture_output=True, text=True, check=False)
        raw = (out.stdout or out.stderr).strip().splitlines()[0]
    except Exception as e:
        if t.required:
            fail(f"{t.name}: invocation failed: {e}")
            return False
        warn(f"{t.name}: invocation failed (optional): {e}")
        return True

    ver = parse_version(raw)
    if t.min_version:
        if not ver:
            warn(f"{t.name}: could not parse version from `{raw}`")
            return True
        if not version_ok(ver, t.min_version):
            need = ".".join(map(str, t.min_version))
            have = ".".join(map(str, ver))
            if t.required:
                fail(f"{t.name}: version {have} < required {need}. {t.hint}")
                return False
            warn(f"{t.name}: version {have} < recommended {need}. {t.hint}")
            return True
    ok(f"{t.name}: {raw}  ({exe})")
    return True


def main() -> int:
    header("Reputon — environment check")
    info("Required: python3>=3.11, node>=20, npm>=10, git")
    info("Recommended: firebase, genlayer (needed in later phases)")
    print()

    all_ok = True
    for t in TOOLS:
        if not check_tool(t):
            all_ok = False

    print()
    if all_ok:
        ok("Environment looks good. You can proceed to Phase 1.")
        return 0
    fail("Environment is missing required tools. Fix the items marked [fail] above and re-run.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
'''

FILES = {
    "package.json": PACKAGE_JSON,
    ".gitignore": GITIGNORE,
    ".env.example": ENV_EXAMPLE,
    "README.md": README,
    "scripts/_helpers.py": HELPERS_PY,
    "scripts/env_check.py": ENV_CHECK_PY,
}


def write(path: Path, content: str, force: bool) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not force:
        if path.read_text(encoding="utf-8") == content:
            return "unchanged"
        return "skipped (exists; pass --force to overwrite)"
    path.write_text(content, encoding="utf-8")
    return "wrote"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Overwrite existing files.")
    args = parser.parse_args()

    print(f"Reputon — Phase 0 bootstrap @ {ROOT}")
    print("=" * 60)

    # 1. Folders
    for d in DIRS:
        p = ROOT / d
        p.mkdir(parents=True, exist_ok=True)
    print(f"[ok] created {len(DIRS)} directories")

    # 2. .gitkeep in every empty dir (so git tracks layout)
    keep_count = 0
    for d in DIRS:
        p = ROOT / d
        if not any(p.iterdir()):
            (p / ".gitkeep").touch()
            keep_count += 1
    print(f"[ok] placed {keep_count} .gitkeep markers")

    # 3. Foundation files
    for rel, content in FILES.items():
        status = write(ROOT / rel, content, args.force)
        print(f"[{status}] {rel}")

    # 4. Make scripts executable
    for s in ("scripts/env_check.py", "bootstrap_phase0.py"):
        p = ROOT / s
        if p.exists():
            mode = p.stat().st_mode
            p.chmod(mode | 0o111)

    print("=" * 60)
    print("Phase 0 bootstrap complete.")
    print()
    print("Next steps:")
    print("  1. cd ~/Reputon")
    print("  2. python3 scripts/env_check.py")
    print("  3. git init && git add -A && git commit -m 'phase 0: foundations'")
    print()
    print("If env_check.py reports any [fail], fix those before Phase 1.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
