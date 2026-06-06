# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json


# ---------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------

CATEGORY_UNVERIFIED = "unverified"
CATEGORY_EMERGING = "emerging"
CATEGORY_TRUSTED = "trusted"
CATEGORY_EMINENT = "eminent"

MAX_SCORE = 1000
MAX_CONFIDENCE = 1000   # represented in per-mille (0..1000) to stay integer
MAX_HISTORY = 200       # per-profile rolling cap
MAX_ENDORSEMENT_WEIGHT = 100
MAX_BIO_LEN = 280
MAX_DISPLAY_NAME_LEN = 80
MAX_NOTE_LEN = 200
MAX_REASON_LEN = 200
MAX_EXPLANATION_LEN = 800
MAX_SIGNALS_LEN = 4000

LLM_EQUIVALENCE_CRITERIA = (
    "The two outputs are equivalent if both parse as JSON containing a numeric "
    "`score` field. Differences in confidence, category, breakdown, or "
    "explanation are acceptable, since LLM reasoning naturally varies for "
    "sparse signals. Equivalence is about structural shape, not value parity."
)


def _category_for_score(score: int) -> str:
    """Map a numeric 0-1000 score onto a trust category bucket."""
    if score >= 800:
        return CATEGORY_EMINENT
    if score >= 500:
        return CATEGORY_TRUSTED
    if score >= 200:
        return CATEGORY_EMERGING
    return CATEGORY_UNVERIFIED


def _clamp(value: int, lo: int, hi: int) -> int:
    if value < lo:
        return lo
    if value > hi:
        return hi
    return value


# ---------------------------------------------------------------------
# Storage records
# ---------------------------------------------------------------------

@allow_storage
@dataclass
class Profile:
    display_name: str
    bio: str
    score: u256
    confidence: u256          # 0..1000
    category: str
    last_evaluated_at: u256
    created_at: u256
    exists: bool
    # JSON-encoded score history (newest entries appended, oldest trimmed
    # past MAX_HISTORY). Stored on Profile rather than as a nested
    # TreeMap[Address, DynArray[ScoreEntry]] because Genlayer storage
    # rejects user-instantiated nested collections.
    history_json: str
    eval_count: u256


@allow_storage
@dataclass
class ScoreEntry:
    score: u256
    confidence: u256
    category: str
    delta_abs: u256
    delta_negative: bool
    reason: str
    explanation: str
    activity: u256
    governance: u256
    contribution: u256
    trust: u256
    created_at: u256


@allow_storage
@dataclass
class EndorsementRecord:
    from_addr: Address
    to_addr: Address
    weight: u256
    note: str
    created_at: u256
    revoked_at: u256
    revoked: bool


# ---------------------------------------------------------------------
# Contract
# ---------------------------------------------------------------------

class Contract(gl.Contract):
    # --- single-value storage ---
    owner: Address
    version: u256
    total_profiles: u256
    total_evaluations: u256
    total_endorsements: u256

    # --- mappings ---
    profiles: TreeMap[Address, Profile]
    # history + eval_count are stored on Profile (history_json + eval_count fields)

    # Endorsements use FLAT storage. Genlayer's TreeMap raises KeyError
    # on missing keys and DynArray cannot be instantiated by user code,
    # so nested TreeMap[Addr, TreeMap[Addr, X]] and TreeMap[Addr, DynArray[Addr]]
    # are both unusable. Same pattern we already use for Profile history.
    #
    #   endorsement_keys_given_json[endorser]  → JSON list of target hex strings
    #   endorsement_keys_received_json[target] → JSON list of endorser hex strings
    #   endorsement_records[composite_key]      → EndorsementRecord
    #
    # composite_key = "{endorser_lowercase}|{target_lowercase}"
    endorsement_keys_given_json: TreeMap[Address, str]
    endorsement_keys_received_json: TreeMap[Address, str]
    endorsement_records: TreeMap[str, EndorsementRecord]

    # =================================================================
    # Constructor
    # =================================================================

    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.version = u256(1)
        self.total_profiles = u256(0)
        self.total_evaluations = u256(0)
        self.total_endorsements = u256(0)

    # =================================================================
    # Profile lifecycle (write)
    # =================================================================

    @gl.public.write
    def register_profile(self, display_name: str, bio: str) -> None:
        """Create a profile for the caller. Idempotent: errors if already set."""
        sender = gl.message.sender_address
        if sender in self.profiles:
            raise Exception("profile already exists for sender")

        display_name = display_name[:MAX_DISPLAY_NAME_LEN]
        bio = bio[:MAX_BIO_LEN]

        now = u256(0)
        self.profiles[sender] = Profile(
            display_name=display_name,
            bio=bio,
            score=u256(0),
            confidence=u256(0),
            category=CATEGORY_UNVERIFIED,
            last_evaluated_at=u256(0),
            created_at=now,
            exists=True,
            history_json="[]",
            eval_count=u256(0),
        )
        self.total_profiles = u256(self.total_profiles + 1)

    @gl.public.write
    def update_profile_metadata(self, display_name: str, bio: str) -> None:
        """Update the caller's display name / bio. Profile must exist."""
        sender = gl.message.sender_address
        if sender not in self.profiles:
            raise Exception("profile not found")

        p = self.profiles[sender]
        p.display_name = display_name[:MAX_DISPLAY_NAME_LEN]
        p.bio = bio[:MAX_BIO_LEN]
        self.profiles[sender] = p

    # =================================================================
    # AI evaluation (write — invokes Genlayer LLM under equivalence)
    # =================================================================

    @gl.public.write
    def evaluate_and_update(self, target: Address, signals_json: str) -> None:
        """
        Run the reputation engine over the supplied signal bundle and write
        a fresh score entry on-chain.

        `signals_json` is a JSON string the caller (typically the backend)
        assembled from wallet activity, governance, contributions, endorsements.

        The LLM call runs under the Genlayer equivalence principle so every
        validator independently re-derives a comparable score.
        """
        # Coerce target to an Address instance. Genlayer's RPC passes method
        # args as raw strings; TreeMap reads coerce silently but TreeMap
        # writes call `.as_bytes` on the key and would otherwise raise
        # AttributeError on a plain str.
        target_addr = target if hasattr(target, "as_bytes") else Address(target)

        # Auto-register a stub profile for `target_addr` on first evaluation,
        # so an external service (the Reputon backend) can score any wallet
        # without requiring the wallet owner to send a separate
        # register_profile tx first.
        if target_addr not in self.profiles:
            self.profiles[target_addr] = Profile(
                display_name="",
                bio="",
                score=u256(0),
                confidence=u256(0),
                category=CATEGORY_UNVERIFIED,
                last_evaluated_at=u256(0),
                created_at=u256(0),
                exists=True,
                history_json="[]",
                eval_count=u256(0),
            )
            self.total_profiles = u256(self.total_profiles + 1)
        if len(signals_json) > MAX_SIGNALS_LEN:
            raise Exception("signals payload too large")

        prompt = (
            "You are Reputon, an on-chain reputation engine. "
            "Given the following signal bundle for a wallet, output ONLY "
            "valid JSON (no prose, no markdown) with this exact schema:\n"
            '{\n'
            '  "score": <integer 0..1000>,\n'
            '  "confidence": <integer 0..1000>,\n'
            '  "category": <"unverified"|"emerging"|"trusted"|"eminent">,\n'
            '  "breakdown": {\n'
            '    "activity": <integer 0..250>,\n'
            '    "governance": <integer 0..250>,\n'
            '    "contribution": <integer 0..250>,\n'
            '    "trust": <integer 0..250>\n'
            '  },\n'
            '  "explanation": <string, <=800 chars, plain English>\n'
            "}\n\n"
            "Scoring rules:\n"
            "- score must equal the sum of breakdown components, clamped to 0..1000.\n"
            "- category must match the score buckets: <200 unverified, "
            "200-499 emerging, 500-799 trusted, 800+ eminent.\n"
            "- be conservative when signals are sparse or contradictory; "
            "lower the confidence accordingly.\n"
            "- never invent activity that is not present in the signals.\n\n"
            f"Signal bundle:\n{signals_json}\n\n"
            "Respond with the JSON object only."
        )

        def _ask_llm() -> str:
            return gl.nondet.exec_prompt(prompt)

        try:
            raw = gl.eq_principle.prompt_comparative(_ask_llm, LLM_EQUIVALENCE_CRITERIA)
        except Exception:
            raw = ""

        # The LLM occasionally wraps JSON in markdown fences or prefixes
        # prose. Be defensive: strip code fences, then carve out the first
        # JSON object. If nothing parseable comes back, fall through to a
        # baseline so the profile still gets onboarded.
        decoded: dict = {}
        if raw:
            s = str(raw).strip()
            if s.startswith("```"):
                # drop the opening fence line and any trailing fence
                nl = s.find("\n")
                if nl >= 0:
                    s = s[nl + 1 :]
                if s.endswith("```"):
                    s = s[: -3]
                s = s.strip()
            start = s.find("{")
            end = s.rfind("}")
            if start >= 0 and end > start:
                s = s[start : end + 1]
            try:
                parsed = json.loads(s)
                if isinstance(parsed, dict):
                    decoded = parsed
            except Exception:
                decoded = {}

        if not decoded:
            # LLM unavailable or unparseable. Record a low-confidence
            # baseline so the user's profile still gets created on chain.
            decoded = {
                "score": 100,
                "confidence": 100,
                "category": CATEGORY_UNVERIFIED,
                "breakdown": {"activity": 25, "governance": 25, "contribution": 25, "trust": 25},
                "explanation": "LLM output was unavailable; baseline score recorded. Re-run an evaluation to refresh.",
            }

        score = _clamp(int(decoded.get("score", 0)), 0, MAX_SCORE)
        confidence = _clamp(int(decoded.get("confidence", 0)), 0, MAX_CONFIDENCE)
        category = str(decoded.get("category", "")) or _category_for_score(score)
        if category not in (
            CATEGORY_UNVERIFIED, CATEGORY_EMERGING, CATEGORY_TRUSTED, CATEGORY_EMINENT
        ):
            category = _category_for_score(score)

        bd = decoded.get("breakdown", {}) or {}
        activity = _clamp(int(bd.get("activity", 0)), 0, 250)
        governance = _clamp(int(bd.get("governance", 0)), 0, 250)
        contribution = _clamp(int(bd.get("contribution", 0)), 0, 250)
        trust = _clamp(int(bd.get("trust", 0)), 0, 250)

        explanation = str(decoded.get("explanation", ""))[:MAX_EXPLANATION_LEN]

        # Compute delta vs previous score
        prev = self.profiles[target_addr]
        prev_score = int(prev.score)
        if score >= prev_score:
            delta_abs = u256(score - prev_score)
            delta_neg = False
        else:
            delta_abs = u256(prev_score - score)
            delta_neg = True

        now = u256(0)

        # Build the history entry as a plain dict and prepend it to the
        # JSON-encoded history string on the Profile. We store history this
        # way (instead of a nested TreeMap[Address, DynArray[ScoreEntry]])
        # because Genlayer storage rejects user-instantiated nested
        # collections.
        try:
            history_list = json.loads(prev.history_json) if prev.history_json else []
            if not isinstance(history_list, list):
                history_list = []
        except Exception:
            history_list = []

        history_list.insert(0, {
            "score": score,
            "confidence": confidence,
            "category": category,
            "delta": -delta_abs if delta_neg else delta_abs,
            "reason": "evaluate_and_update",
            "explanation": explanation,
            "breakdown": {
                "activity": activity,
                "governance": governance,
                "contribution": contribution,
                "trust": trust,
            },
            "created_at": int(now),
        })
        # Trim to most-recent MAX_HISTORY entries
        history_list = history_list[:MAX_HISTORY]

        # High-water-mark scoring: the public profile.score is monotonic —
        # re-running the analyzer can only improve it, never reduce it.
        # The history above still records every actual LLM-returned score
        # (positive or negative delta), so the on-chain audit trail stays
        # fully transparent. Confidence / category / breakdown always
        # reflect the latest run because they describe what the LLM saw
        # this time, not the historical best.
        new_score = u256(score)
        if int(new_score) > int(prev.score):
            prev.score = new_score
        prev.confidence = u256(confidence)
        prev.category = category
        prev.last_evaluated_at = now
        prev.history_json = json.dumps(history_list)
        prev.eval_count = u256(int(prev.eval_count) + 1)
        self.profiles[target_addr] = prev

        self.total_evaluations = u256(self.total_evaluations + 1)

    # =================================================================
    # Endorsements (write)
    # =================================================================

    def _endorsement_key(self, endorser: Address, target: Address) -> str:
        """Composite key used in the flat endorsement_records TreeMap."""
        return str(endorser).lower() + "|" + str(target).lower()

    def _load_key_list(self, raw: str) -> list:
        """Best-effort parse of a JSON list-of-hex-strings; never raises."""
        if not raw:
            return []
        try:
            v = json.loads(raw)
        except Exception:
            return []
        return v if isinstance(v, list) else []

    @gl.public.write
    def add_endorsement(self, target: Address, weight: int, note: str) -> None:
        """Caller endorses `target`. Repeated calls overwrite the prior entry."""
        sender = gl.message.sender_address
        target_addr = target if hasattr(target, "as_bytes") else Address(target)
        if sender == target_addr:
            raise Exception("cannot endorse self")
        if sender not in self.profiles:
            raise Exception("endorser has no profile")
        if target_addr not in self.profiles:
            raise Exception("target has no profile")

        w = _clamp(int(weight), 1, MAX_ENDORSEMENT_WEIGHT)
        note = note[:MAX_NOTE_LEN]
        now = u256(0)

        key = self._endorsement_key(sender, target_addr)
        sender_hex = str(sender).lower()
        target_hex = str(target_addr).lower()

        if key in self.endorsement_records:
            rec = self.endorsement_records[key]
            rec.weight = u256(w)
            rec.note = note
            rec.revoked = False
            self.endorsement_records[key] = rec
            return

        # First time this endorser endorses this target: write the record
        # and maintain the per-side index lists (JSON arrays on disk).
        self.endorsement_records[key] = EndorsementRecord(
            from_addr=sender,
            to_addr=target_addr,
            weight=u256(w),
            note=note,
            created_at=now,
            revoked_at=u256(0),
            revoked=False,
        )

        given_prev = self.endorsement_keys_given_json[sender] if sender in self.endorsement_keys_given_json else ""
        given_list = self._load_key_list(given_prev)
        if target_hex not in given_list:
            given_list.append(target_hex)
            self.endorsement_keys_given_json[sender] = json.dumps(given_list)

        received_prev = self.endorsement_keys_received_json[target_addr] if target_addr in self.endorsement_keys_received_json else ""
        received_list = self._load_key_list(received_prev)
        if sender_hex not in received_list:
            received_list.append(sender_hex)
            self.endorsement_keys_received_json[target_addr] = json.dumps(received_list)

        self.total_endorsements = u256(self.total_endorsements + 1)

    @gl.public.write
    def revoke_endorsement(self, target: Address) -> None:
        """Caller revokes their existing endorsement for `target`."""
        sender = gl.message.sender_address
        target_addr = target if hasattr(target, "as_bytes") else Address(target)
        key = self._endorsement_key(sender, target_addr)
        if key not in self.endorsement_records:
            raise Exception("no endorsement for target")
        rec = self.endorsement_records[key]
        if rec.revoked:
            raise Exception("already revoked")
        rec.revoked = True
        self.endorsement_records[key] = rec

    # =================================================================
    # Views
    # =================================================================

    @gl.public.view
    def get_contract_info(self) -> dict:
        return {
            "name": "Reputon",
            "version": int(self.version),
            "owner": str(self.owner),
            "total_profiles": int(self.total_profiles),
            "total_evaluations": int(self.total_evaluations),
            "total_endorsements": int(self.total_endorsements),
        }

    @gl.public.view
    def has_profile(self, addr: Address) -> bool:
        return addr in self.profiles

    @gl.public.view
    def get_profile(self, addr: Address) -> dict:
        if addr not in self.profiles:
            raise Exception("profile not found")
        p = self.profiles[addr]
        return {
            "address": str(addr),
            "display_name": p.display_name,
            "bio": p.bio,
            "score": int(p.score),
            "confidence": int(p.confidence),
            "category": p.category,
            "last_evaluated_at": int(p.last_evaluated_at),
            "created_at": int(p.created_at),
            "evaluations": int(p.eval_count),
        }

    @gl.public.view
    def get_score(self, addr: Address) -> dict:
        if addr not in self.profiles:
            raise Exception("profile not found")
        p = self.profiles[addr]
        return {
            "address": str(addr),
            "score": int(p.score),
            "confidence": int(p.confidence),
            "category": p.category,
            "last_evaluated_at": int(p.last_evaluated_at),
        }

    @gl.public.view
    def verify_score(self, addr: Address, expected_score: int) -> bool:
        """Cheap exact-match verifier used by gating contracts off-chain."""
        if addr not in self.profiles:
            return False
        return int(self.profiles[addr].score) == int(expected_score)

    @gl.public.view
    def get_history(self, addr: Address, limit: int) -> list:
        if addr not in self.profiles:
            return []
        p = self.profiles[addr]
        if not p.history_json:
            return []
        try:
            entries = json.loads(p.history_json)
        except Exception:
            return []
        if not isinstance(entries, list):
            return []
        n = _clamp(int(limit), 1, MAX_HISTORY)
        return entries[:n]

    @gl.public.view
    def get_endorsements_given(self, addr: Address) -> list:
        out: list = []
        if addr not in self.endorsement_keys_given_json:
            return out
        targets = self._load_key_list(self.endorsement_keys_given_json[addr])
        endorser_hex = str(addr).lower()
        i = 0
        while i < len(targets):
            t_hex = str(targets[i]).lower()
            key = endorser_hex + "|" + t_hex
            if key in self.endorsement_records:
                out.append(_endorsement_to_dict(self.endorsement_records[key]))
            i += 1
        return out

    @gl.public.view
    def get_endorsements_received(self, addr: Address) -> list:
        out: list = []
        if addr not in self.endorsement_keys_received_json:
            return out
        senders = self._load_key_list(self.endorsement_keys_received_json[addr])
        target_hex = str(addr).lower()
        i = 0
        while i < len(senders):
            s_hex = str(senders[i]).lower()
            key = s_hex + "|" + target_hex
            if key in self.endorsement_records:
                out.append(_endorsement_to_dict(self.endorsement_records[key]))
            i += 1
        return out


# ---------------------------------------------------------------------
# Helpers (module-level — not part of contract storage)
# ---------------------------------------------------------------------

def _endorsement_to_dict(rec: EndorsementRecord) -> dict:
    return {
        "from": str(rec.from_addr),
        "to": str(rec.to_addr),
        "weight": int(rec.weight),
        "note": rec.note,
        "created_at": int(rec.created_at),
        "revoked_at": int(rec.revoked_at),
        "active": not rec.revoked,
    }
