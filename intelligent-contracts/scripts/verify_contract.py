#!/usr/bin/env python3
"""
Verify a deployed Reputon contract against a Genlayer StudioNet RPC.

Usage:
    python3 intelligent-contracts/scripts/verify_contract.py 0x<contract-address>

The script:
  1. Calls get_contract_info() via JSON-RPC.
  2. Prints the on-chain version / owner / totals.

Reads RPC URL from $NEXT_PUBLIC_GENLAYER_RPC_URL (defaults to StudioNet).
"""

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

DEFAULT_RPC = "https://studio.genlayer.com:8443/api"


def _load_root_env():
    """Best-effort: read root .env so $NEXT_PUBLIC_GENLAYER_RPC_URL works."""
    env_file = Path(__file__).resolve().parents[2] / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())


def rpc_call(rpc_url: str, method: str, params: list) -> dict:
    payload = json.dumps(
        {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    ).encode("utf-8")
    req = urllib.request.Request(
        rpc_url, data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: verify_contract.py <contract-address>", file=sys.stderr)
        return 2

    address = sys.argv[1].strip()
    if not address.startswith("0x") or len(address) < 10:
        print(f"invalid contract address: {address!r}", file=sys.stderr)
        return 2

    _load_root_env()
    rpc_url = os.environ.get("NEXT_PUBLIC_GENLAYER_RPC_URL", DEFAULT_RPC)

    print(f"contract : {address}")
    print(f"rpc      : {rpc_url}")
    print()

    payload = {
        "to": address,
        "data": {
            "method": "get_contract_info",
            "args": [],
        },
    }
    try:
        result = rpc_call(rpc_url, "gen_call", [payload])
    except urllib.error.URLError as e:
        print(f"rpc error: {e}", file=sys.stderr)
        return 1

    if "error" in result and result["error"]:
        print("rpc returned error:", json.dumps(result["error"], indent=2),
              file=sys.stderr)
        return 1

    print("get_contract_info():")
    print(json.dumps(result.get("result"), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
