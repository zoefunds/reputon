#!/usr/bin/env python3
"""
Wire a freshly deployed contract address into the repo.

Usage:
    python3 scripts/set_contract_address.py reputon  0x<address>
    python3 scripts/set_contract_address.py nft      0x<address>
    python3 scripts/set_contract_address.py sybil    0x<address>

Effects:
  * Updates the matching NEXT_PUBLIC_*_CONTRACT_ADDRESS key in .env.
  * Appends a record to .contract-addresses.json so we have an audit trail.

Idempotent: re-running with the same args is a no-op.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / ".env"
LEDGER = ROOT / ".contract-addresses.json"

ENV_KEYS = {
    "reputon": "NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS",
    "nft": "NEXT_PUBLIC_REPUTON_NFT_CONTRACT_ADDRESS",
    "sybil": "NEXT_PUBLIC_SYBIL_ORACLE_CONTRACT_ADDRESS",
}


def set_env_var(path: Path, key: str, value: str) -> None:
    text = path.read_text() if path.exists() else ""
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    line = f"{key}={value}"
    if pattern.search(text):
        text = pattern.sub(line, text)
    else:
        text += ("\n" if text and not text.endswith("\n") else "") + line + "\n"
    path.write_text(text)


def append_ledger(name: str, address: str) -> None:
    data = []
    if LEDGER.exists():
        try:
            data = json.loads(LEDGER.read_text())
            if not isinstance(data, list):
                data = []
        except Exception:
            data = []
    data.append({
        "name": name,
        "address": address,
        "deployed_at": datetime.now(timezone.utc).isoformat(),
    })
    LEDGER.write_text(json.dumps(data, indent=2) + "\n")


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: set_contract_address.py <reputon|nft|sybil> <0xaddress>",
              file=sys.stderr)
        return 2
    kind, address = sys.argv[1].lower(), sys.argv[2].strip()
    if kind not in ENV_KEYS:
        print(f"unknown contract kind: {kind!r}", file=sys.stderr)
        return 2
    if not address.startswith("0x") or len(address) < 10:
        print(f"invalid address: {address!r}", file=sys.stderr)
        return 2

    set_env_var(ENV, ENV_KEYS[kind], address)
    append_ledger(kind, address)

    print(f"[ok] {ENV_KEYS[kind]} = {address}")
    print(f"[ok] appended to {LEDGER.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
