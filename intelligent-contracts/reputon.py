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
    "The two outputs are equivalent if both parse as JSON with the same keys "
    "(score, confidence, category, breakdown, explanation), the integer "
    "`score` values differ by at most 25, the `confidence` values differ by "
    "at most 100, and the `category` strings are identical."
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
    history: TreeMap[Address, DynArray[ScoreEntry]]
    eval_count: TreeMap[Address, u256]

    endorsements_given_keys: TreeMap[Address, DynArray[Address]]
    endorsements_received_keys: TreeMap[Address, DynArray[Address]]
    endorsements: TreeMap[Address, TreeMap[Address, EndorsementRecord]]

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

        raw = gl.eq_principle.prompt_comparative(_ask_llm, LLM_EQUIVALENCE_CRITERIA)

        # Parse and validate
        try:
            decoded = json.loads(raw)
        except Exception:
            raise Exception("LLM produced non-JSON output")

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

        # Update profile snapshot
        prev.score = u256(score)
        prev.confidence = u256(confidence)
        prev.category = category
        prev.last_evaluated_at = now
        self.profiles[target_addr] = prev

        # Append to history (rolling cap)
        if target_addr not in self.history:
            self.history[target_addr] = DynArray[ScoreEntry]()
        entries = self.history[target_addr]
        entries.append(ScoreEntry(
            score=u256(score),
            confidence=u256(confidence),
            category=category,
            delta_abs=delta_abs,
            delta_negative=delta_neg,
            reason="evaluate_and_update",
            explanation=explanation,
            activity=u256(activity),
            governance=u256(governance),
            contribution=u256(contribution),
            trust=u256(trust),
            created_at=now,
        ))
        # Trim head if exceeded cap
        while len(entries) > MAX_HISTORY:
            entries.pop(0)
        self.history[target_addr] = entries

        # Counters
        prev_count = u256(0)
        if target_addr in self.eval_count:
            prev_count = self.eval_count[target_addr]
        self.eval_count[target_addr] = u256(prev_count + 1)
        self.total_evaluations = u256(self.total_evaluations + 1)

    # =================================================================
    # Endorsements (write)
    # =================================================================

    @gl.public.write
    def add_endorsement(self, target: Address, weight: int, note: str) -> None:
        """Caller endorses `target`. Repeated calls overwrite the prior entry."""
        sender = gl.message.sender_address
        if sender == target:
            raise Exception("cannot endorse self")
        if sender not in self.profiles:
            raise Exception("endorser has no profile")
        if target not in self.profiles:
            raise Exception("target has no profile")

        w = _clamp(int(weight), 1, MAX_ENDORSEMENT_WEIGHT)
        note = note[:MAX_NOTE_LEN]
        now = u256(0)

        # Initialize per-sender map
        if sender not in self.endorsements:
            self.endorsements[sender] = TreeMap[Address, EndorsementRecord]()
            self.endorsements_given_keys[sender] = DynArray[Address]()
        if target not in self.endorsements_received_keys:
            self.endorsements_received_keys[target] = DynArray[Address]()

        sender_map = self.endorsements[sender]

        if target in sender_map:
            # update existing
            rec = sender_map[target]
            rec.weight = u256(w)
            rec.note = note
            rec.revoked = False
            sender_map[target] = rec
        else:
            sender_map[target] = EndorsementRecord(
                from_addr=sender,
                to_addr=target,
                weight=u256(w),
                note=note,
                created_at=now,
                revoked_at=u256(0),
                revoked=False,
            )
            self.endorsements_given_keys[sender].append(target)
            self.endorsements_received_keys[target].append(sender)
            self.total_endorsements = u256(self.total_endorsements + 1)

        self.endorsements[sender] = sender_map

    @gl.public.write
    def revoke_endorsement(self, target: Address) -> None:
        """Caller revokes their existing endorsement for `target`."""
        sender = gl.message.sender_address
        if sender not in self.endorsements:
            raise Exception("no endorsements from sender")
        sender_map = self.endorsements[sender]
        if target not in sender_map:
            raise Exception("no endorsement for target")
        rec = sender_map[target]
        if rec.revoked:
            raise Exception("already revoked")
        rec.revoked = True
        sender_map[target] = rec
        self.endorsements[sender] = sender_map

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
            "evaluations": int(self.eval_count[addr]) if addr in self.eval_count else 0,
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
        if addr not in self.history:
            return []
        n = _clamp(int(limit), 1, MAX_HISTORY)
        entries = self.history[addr]
        out: list = []
        count = len(entries)
        start = 0 if count <= n else count - n
        i = count - 1
        while i >= start:
            e = entries[i]
            out.append({
                "score": int(e.score),
                "confidence": int(e.confidence),
                "category": e.category,
                "delta": -int(e.delta_abs) if e.delta_negative else int(e.delta_abs),
                "reason": e.reason,
                "explanation": e.explanation,
                "breakdown": {
                    "activity": int(e.activity),
                    "governance": int(e.governance),
                    "contribution": int(e.contribution),
                    "trust": int(e.trust),
                },
                "created_at": int(e.created_at),
            })
            i -= 1
        return out

    @gl.public.view
    def get_endorsements_given(self, addr: Address) -> list:
        out: list = []
        if addr not in self.endorsements:
            return out
        sender_map = self.endorsements[addr]
        if addr not in self.endorsements_given_keys:
            return out
        keys = self.endorsements_given_keys[addr]
        i = 0
        while i < len(keys):
            target = keys[i]
            if target in sender_map:
                rec = sender_map[target]
                out.append(_endorsement_to_dict(rec))
            i += 1
        return out

    @gl.public.view
    def get_endorsements_received(self, addr: Address) -> list:
        out: list = []
        if addr not in self.endorsements_received_keys:
            return out
        senders = self.endorsements_received_keys[addr]
        i = 0
        while i < len(senders):
            sender = senders[i]
            if sender in self.endorsements:
                sm = self.endorsements[sender]
                if addr in sm:
                    out.append(_endorsement_to_dict(sm[addr]))
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