# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json


# ---------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------

SEV_LOW = "low"
SEV_MEDIUM = "medium"
SEV_HIGH = "high"
SEV_CRITICAL = "critical"
VALID_SEVERITIES = (SEV_LOW, SEV_MEDIUM, SEV_HIGH, SEV_CRITICAL)

SEV_WEIGHT = {
    SEV_LOW: 1,
    SEV_MEDIUM: 2,
    SEV_HIGH: 3,
    SEV_CRITICAL: 4,
}

MAX_REASON_LEN = 400
MAX_EVIDENCE_LEN = 4000
MAX_SUMMARY_LEN = 800
MAX_FLAGS_PER_ADDR = 100

LLM_EQUIVALENCE_CRITERIA = (
    "The two outputs are equivalent if both parse as JSON with the same keys "
    "(severity, reason, summary) and the `severity` string is identical."
)


def _clamp_str(s: str, n: int) -> str:
    return s[:n]


def _is_valid_severity(s: str) -> bool:
    return s in VALID_SEVERITIES


def _max_severity(a: str, b: str) -> str:
    wa = SEV_WEIGHT.get(a, 0)
    wb = SEV_WEIGHT.get(b, 0)
    return a if wa >= wb else b


# ---------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------

@allow_storage
@dataclass
class SybilFlag:
    severity: str
    reason: str
    summary: str
    evidence_hash: str        # short hash so we can dedup later
    reporter: Address
    automated: bool           # true when produced by analyze()
    resolved: bool
    created_at: u256
    resolved_at: u256


# ---------------------------------------------------------------------
# Contract
# ---------------------------------------------------------------------

class Contract(gl.Contract):
    # --- singletons ---
    owner: Address
    version: u256
    total_flags: u256
    total_resolved: u256

    # --- authorization ---
    authorized_reporters: TreeMap[Address, bool]

    # --- flag store ---
    # Flat-storage layout (same fix pattern we already use elsewhere):
    # nested TreeMap[Address, DynArray[SybilFlag]] is unusable because
    # Genlayer's TreeMap raises KeyError on missing keys and DynArray
    # cannot be instantiated by user code. So we keep each per-address
    # flag list as a JSON string on disk and parse on read/write.
    flags_json: TreeMap[Address, str]
    flagged_addresses: DynArray[Address]
    flagged_seen: TreeMap[Address, bool]

    # =================================================================
    # Constructor
    # =================================================================

    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.version = u256(1)
        self.total_flags = u256(0)
        self.total_resolved = u256(0)

    # =================================================================
    # Admin
    # =================================================================

    @gl.public.write
    def transfer_ownership(self, new_owner: Address) -> None:
        if gl.message.sender_address != self.owner:
            raise Exception("only owner")
        self.owner = new_owner

    @gl.public.write
    def set_authorized_reporter(self, addr: Address, allowed: bool) -> None:
        if gl.message.sender_address != self.owner:
            raise Exception("only owner")
        self.authorized_reporters[addr] = allowed

    def _is_authorized(self, addr: Address) -> bool:
        if addr == self.owner:
            return True
        if addr in self.authorized_reporters:
            return bool(self.authorized_reporters[addr])
        return False

    # =================================================================
    # LLM-backed analyze (write)
    # =================================================================

    @gl.public.write
    def analyze(self, target: Address, evidence_json: str) -> None:
        """
        Run a Genlayer LLM evaluation against the supplied evidence bundle.
        Anyone may call analyze() — the equivalence principle keeps the
        verdict trustworthy. Records a flag with severity 'low' or higher.
        Returns nothing; read the result via get_flags().
        """
        if len(evidence_json) > MAX_EVIDENCE_LEN:
            raise Exception("evidence payload too large")
        if target in self.flags_json:
            existing = self._load_flag_list(self.flags_json[target])
            if len(existing) >= MAX_FLAGS_PER_ADDR:
                raise Exception("flag cap reached for target")

        prompt = (
            "You are the Reputon Sybil Oracle. Given the following evidence "
            "bundle about a wallet, decide whether the wallet shows signs of "
            "sybil / coordinated / bot-like activity.\n\n"
            "Output ONLY valid JSON (no prose, no markdown) with this schema:\n"
            '{\n'
            '  "severity": <"low"|"medium"|"high"|"critical">,\n'
            '  "reason":   <short reason string, <=400 chars>,\n'
            '  "summary":  <plain-English explanation, <=800 chars>\n'
            "}\n\n"
            "Severity guidance:\n"
            "- low:      negligible / inconclusive signals\n"
            "- medium:   suspicious patterns but plausibly innocent\n"
            "- high:     strong sybil / farming indicators\n"
            "- critical: clear coordinated attack / bot ring\n\n"
            "Be conservative — only escalate when evidence is strong.\n\n"
            f"Evidence:\n{evidence_json}\n\n"
            "Respond with the JSON object only."
        )

        def _ask_llm() -> str:
            return gl.nondet.exec_prompt(prompt)

        raw = gl.eq_principle.prompt_comparative(_ask_llm, LLM_EQUIVALENCE_CRITERIA)

        try:
            decoded = json.loads(raw)
        except Exception:
            raise Exception("LLM produced non-JSON output")

        severity = str(decoded.get("severity", "")).lower()
        if not _is_valid_severity(severity):
            severity = SEV_LOW
        reason = _clamp_str(str(decoded.get("reason", "")), MAX_REASON_LEN)
        summary = _clamp_str(str(decoded.get("summary", "")), MAX_SUMMARY_LEN)

        # Cheap content hash for dedup (sum of chars + length — non-crypto)
        h = 0
        i = 0
        while i < len(evidence_json):
            h = (h * 131 + ord(evidence_json[i])) & 0xFFFFFFFF
            i += 1
        evidence_hash = _clamp_str(hex(h), 16)

        self._record_flag(
            target=target,
            severity=severity,
            reason=reason,
            summary=summary,
            evidence_hash=evidence_hash,
            reporter=gl.message.sender_address,
            automated=True,
        )

    # =================================================================
    # Manual flag (write — owner / authorized reporters)
    # =================================================================

    @gl.public.write
    def manual_flag(
        self,
        target: Address,
        severity: str,
        reason: str,
        summary: str,
    ) -> None:
        sender = gl.message.sender_address
        if not self._is_authorized(sender):
            raise Exception("not authorized to file manual flag")
        sev = severity.lower()
        if not _is_valid_severity(sev):
            raise Exception("invalid severity")
        self._record_flag(
            target=target,
            severity=sev,
            reason=_clamp_str(reason, MAX_REASON_LEN),
            summary=_clamp_str(summary, MAX_SUMMARY_LEN),
            evidence_hash="manual",
            reporter=sender,
            automated=False,
        )

    @gl.public.write
    def resolve_flag(self, target: Address, index: int) -> None:
        """Mark a flag as resolved (false positive / fixed). Owner only."""
        if gl.message.sender_address != self.owner:
            raise Exception("only owner")
        if target not in self.flags_json:
            raise Exception("no flags for target")
        arr = self._load_flag_list(self.flags_json[target])
        if index < 0 or index >= len(arr):
            raise Exception("index out of range")
        rec = arr[index]
        if not isinstance(rec, dict):
            raise Exception("malformed flag entry")
        if rec.get("resolved"):
            raise Exception("already resolved")
        rec["resolved"] = True
        rec["resolved_at"] = 0
        arr[index] = rec
        self.flags_json[target] = json.dumps(arr)
        self.total_resolved = u256(self.total_resolved + 1)

    # =================================================================
    # Internal
    # =================================================================

    def _load_flag_list(self, raw: str) -> list:
        """Parse the JSON-encoded per-address flag list; never raises."""
        if not raw:
            return []
        try:
            v = json.loads(raw)
        except Exception:
            return []
        return v if isinstance(v, list) else []

    def _record_flag(
        self,
        target: Address,
        severity: str,
        reason: str,
        summary: str,
        evidence_hash: str,
        reporter: Address,
        automated: bool,
    ) -> None:
        # Append to the per-target flag list, serialized as JSON. We can't
        # use a nested DynArray here because user code can't instantiate
        # one and the storage layer doesn't auto-create empty containers.
        prev = self.flags_json[target] if target in self.flags_json else ""
        arr = self._load_flag_list(prev)
        arr.append({
            "severity": severity,
            "reason": reason,
            "summary": summary,
            "evidence_hash": evidence_hash,
            "reporter": str(reporter),
            "automated": bool(automated),
            "resolved": False,
            "created_at": 0,
            "resolved_at": 0,
        })
        self.flags_json[target] = json.dumps(arr)

        if target not in self.flagged_seen:
            self.flagged_seen[target] = True
            self.flagged_addresses.append(target)

        self.total_flags = u256(self.total_flags + 1)

    # =================================================================
    # Views
    # =================================================================

    @gl.public.view
    def get_contract_info(self) -> dict:
        return {
            "name": "Reputon Sybil Oracle",
            "version": int(self.version),
            "owner": str(self.owner),
            "total_flags": int(self.total_flags),
            "total_resolved": int(self.total_resolved),
            "active_flags": int(self.total_flags) - int(self.total_resolved),
            "flagged_addresses": len(self.flagged_addresses),
        }

    @gl.public.view
    def is_authorized_reporter(self, addr: Address) -> bool:
        return self._is_authorized(addr)

    @gl.public.view
    def get_flags(self, addr: Address) -> list:
        out: list = []
        if addr not in self.flags_json:
            return out
        arr = self._load_flag_list(self.flags_json[addr])
        i = 0
        while i < len(arr):
            f = arr[i]
            if isinstance(f, dict):
                out.append(_flag_dict_with_index(f, i))
            i += 1
        return out

    @gl.public.view
    def get_active_flags(self, addr: Address) -> list:
        out: list = []
        if addr not in self.flags_json:
            return out
        arr = self._load_flag_list(self.flags_json[addr])
        i = 0
        while i < len(arr):
            f = arr[i]
            if isinstance(f, dict) and not f.get("resolved"):
                out.append(_flag_dict_with_index(f, i))
            i += 1
        return out

    @gl.public.view
    def get_severity(self, addr: Address) -> str:
        """Return the highest active severity for `addr`, or empty string."""
        if addr not in self.flags_json:
            return ""
        worst = ""
        arr = self._load_flag_list(self.flags_json[addr])
        i = 0
        while i < len(arr):
            f = arr[i]
            if isinstance(f, dict) and not f.get("resolved"):
                sev = str(f.get("severity", ""))
                if worst == "":
                    worst = sev
                else:
                    worst = _max_severity(worst, sev)
            i += 1
        return worst

    @gl.public.view
    def is_suspicious(self, addr: Address, min_severity: str) -> bool:
        """True if `addr` has an active flag at min_severity or higher."""
        if not _is_valid_severity(min_severity):
            return False
        worst = self.get_severity(addr)
        if worst == "":
            return False
        return SEV_WEIGHT[worst] >= SEV_WEIGHT[min_severity]

    @gl.public.view
    def list_flagged_addresses(self, limit: int) -> list:
        out: list = []
        n = len(self.flagged_addresses)
        cap = limit if limit > 0 and limit < n else n
        i = 0
        while i < cap:
            out.append(str(self.flagged_addresses[i]))
            i += 1
        return out


# ---------------------------------------------------------------------
# Module helpers
# ---------------------------------------------------------------------

def _flag_dict_with_index(f: dict, index: int) -> dict:
    """Attach the index to a JSON-stored flag dict for API consumers."""
    return {
        "index": index,
        "severity": str(f.get("severity", "")),
        "reason": str(f.get("reason", "")),
        "summary": str(f.get("summary", "")),
        "evidence_hash": str(f.get("evidence_hash", "")),
        "reporter": str(f.get("reporter", "")),
        "automated": bool(f.get("automated", False)),
        "resolved": bool(f.get("resolved", False)),
        "created_at": int(f.get("created_at", 0)),
        "resolved_at": int(f.get("resolved_at", 0)),
    }