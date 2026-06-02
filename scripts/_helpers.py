"""Shared helpers used by every Reputon Python automation script.

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
