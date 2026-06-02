#!/usr/bin/env python3
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
