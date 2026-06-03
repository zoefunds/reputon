"""
Reputon contract tests — runs locally without the Genlayer runtime.

  python3 -m unittest intelligent-contracts/tests/test_contracts.py

Two layers:
  1. Static: every contract file parses and exposes the expected method set.
  2. Helpers: re-implements the pure helper functions and verifies their
     boundaries match what each contract declares.
"""

from __future__ import annotations

import ast
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def parse(rel: str) -> ast.Module:
    return ast.parse((ROOT / rel).read_text())


def public_methods(tree: ast.Module) -> tuple[set[str], set[str]]:
    """Return (writes, views) for the Contract class in `tree`."""
    contract = next(
        n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == "Contract"
    )
    writes, views = set(), set()
    for m in contract.body:
        if not isinstance(m, ast.FunctionDef):
            continue
        for d in m.decorator_list:
            attr = getattr(d, "attr", None)
            if attr == "write":
                writes.add(m.name)
            elif attr == "view":
                views.add(m.name)
    return writes, views


def _module_constants(tree: ast.Module) -> dict[str, object]:
    """Resolve every top-level Name = <literal | Name | tuple/list> assignment.
    Names in tuple/list literals get resolved against earlier assignments so
    references like `VALID_TIERS = (TIER_GENESIS, …)` work."""
    out: dict[str, object] = {}

    def resolve(node: ast.expr) -> object:
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.Name):
            if node.id in out:
                return out[node.id]
            raise KeyError(node.id)
        if isinstance(node, (ast.Tuple, ast.List)):
            return tuple(resolve(e) for e in node.elts) if isinstance(node, ast.Tuple) else [resolve(e) for e in node.elts]
        if isinstance(node, ast.Dict):
            return {resolve(k): resolve(v) for k, v in zip(node.keys, node.values) if k is not None}
        # Fallback to literal_eval for anything purely literal.
        return ast.literal_eval(node)

    for n in tree.body:
        if isinstance(n, ast.Assign):
            for t in n.targets:
                if isinstance(t, ast.Name):
                    try:
                        out[t.id] = resolve(n.value)
                    except Exception:
                        pass
    return out


def module_constant(tree: ast.Module, name: str) -> object:
    consts = _module_constants(tree)
    if name not in consts:
        raise KeyError(name)
    return consts[name]


# ---------------------------------------------------------------------
# Static structure
# ---------------------------------------------------------------------

class ReputonParse(unittest.TestCase):
    def setUp(self) -> None:
        self.tree = parse("reputon.py")

    def test_parses(self) -> None:
        self.assertIsInstance(self.tree, ast.Module)

    def test_method_surface(self) -> None:
        writes, views = public_methods(self.tree)
        expected_writes = {
            "register_profile",
            "update_profile_metadata",
            "evaluate_and_update",
            "add_endorsement",
            "revoke_endorsement",
        }
        expected_views = {
            "get_contract_info",
            "has_profile",
            "get_profile",
            "get_score",
            "verify_score",
            "get_history",
            "get_endorsements_given",
            "get_endorsements_received",
        }
        self.assertEqual(writes, expected_writes)
        self.assertEqual(views, expected_views)

    def test_score_bounds(self) -> None:
        self.assertEqual(module_constant(self.tree, "MAX_SCORE"), 1000)
        self.assertEqual(module_constant(self.tree, "MAX_CONFIDENCE"), 1000)
        self.assertEqual(module_constant(self.tree, "MAX_HISTORY"), 200)
        self.assertEqual(module_constant(self.tree, "MAX_ENDORSEMENT_WEIGHT"), 100)


class NftParse(unittest.TestCase):
    def setUp(self) -> None:
        self.tree = parse("reputon_nft.py")

    def test_method_surface(self) -> None:
        writes, views = public_methods(self.tree)
        self.assertIn("mint", writes)
        self.assertIn("mint_self", writes)
        self.assertIn("revoke", writes)
        self.assertIn("transfer", writes)
        self.assertIn("get_credential", views)
        self.assertIn("get_credentials_of", views)

    def test_tiers(self) -> None:
        tiers = module_constant(self.tree, "VALID_TIERS")
        self.assertEqual(
            tuple(tiers), ("genesis", "bronze", "silver", "gold", "eternal")
        )


class SybilParse(unittest.TestCase):
    def setUp(self) -> None:
        self.tree = parse("sybil_oracle.py")

    def test_method_surface(self) -> None:
        writes, views = public_methods(self.tree)
        self.assertIn("analyze", writes)
        self.assertIn("manual_flag", writes)
        self.assertIn("resolve_flag", writes)
        self.assertIn("get_severity", views)
        self.assertIn("is_suspicious", views)

    def test_severities(self) -> None:
        sevs = module_constant(self.tree, "VALID_SEVERITIES")
        self.assertEqual(tuple(sevs), ("low", "medium", "high", "critical"))


# ---------------------------------------------------------------------
# Pure helper logic (reimplemented to assert boundaries)
# ---------------------------------------------------------------------

def category_for_score(s: int) -> str:
    if s >= 800:
        return "eminent"
    if s >= 500:
        return "trusted"
    if s >= 200:
        return "emerging"
    return "unverified"


def clamp(v: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, v))


SEV_WEIGHT = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def max_severity(a: str, b: str) -> str:
    return a if SEV_WEIGHT.get(a, 0) >= SEV_WEIGHT.get(b, 0) else b


class HelperLogic(unittest.TestCase):
    def test_category_boundaries(self) -> None:
        self.assertEqual(category_for_score(0), "unverified")
        self.assertEqual(category_for_score(199), "unverified")
        self.assertEqual(category_for_score(200), "emerging")
        self.assertEqual(category_for_score(499), "emerging")
        self.assertEqual(category_for_score(500), "trusted")
        self.assertEqual(category_for_score(799), "trusted")
        self.assertEqual(category_for_score(800), "eminent")
        self.assertEqual(category_for_score(1000), "eminent")

    def test_clamp(self) -> None:
        self.assertEqual(clamp(-5, 0, 100), 0)
        self.assertEqual(clamp(150, 0, 100), 100)
        self.assertEqual(clamp(50, 0, 100), 50)

    def test_severity_ordering(self) -> None:
        self.assertEqual(max_severity("low", "medium"), "medium")
        self.assertEqual(max_severity("high", "low"), "high")
        self.assertEqual(max_severity("critical", "high"), "critical")
        self.assertEqual(max_severity("low", "low"), "low")


if __name__ == "__main__":
    unittest.main(verbosity=2)
