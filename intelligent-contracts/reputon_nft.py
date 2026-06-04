# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass


# ---------------------------------------------------------------------
# Constants & helpers
# ---------------------------------------------------------------------

TIER_GENESIS = "genesis"
TIER_BRONZE = "bronze"
TIER_SILVER = "silver"
TIER_GOLD = "gold"
TIER_ETERNAL = "eternal"

VALID_TIERS = (TIER_GENESIS, TIER_BRONZE, TIER_SILVER, TIER_GOLD, TIER_ETERNAL)

MAX_NAME_LEN = 80
MAX_DESCRIPTION_LEN = 400
MAX_IMAGE_URI_LEN = 400
MAX_METADATA_LEN = 4000


def _clamp_str(s: str, n: int) -> str:
    return s[:n]


# ---------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------

@allow_storage
@dataclass
class Credential:
    token_id: u256
    owner: Address
    minter: Address
    name: str
    description: str
    image_uri: str
    metadata_json: str
    tier: str
    transferable: bool
    revoked: bool
    minted_at: u256
    revoked_at: u256


# ---------------------------------------------------------------------
# Contract
# ---------------------------------------------------------------------

class Contract(gl.Contract):
    # --- singletons ---
    owner: Address
    version: u256
    next_token_id: u256
    total_supply_count: u256
    total_revoked: u256

    # --- authorization ---
    authorized_minters: TreeMap[Address, bool]

    # --- token data ---
    credentials: TreeMap[u256, Credential]
    tokens_of: TreeMap[Address, DynArray[u256]]

    # --- self-mint tier allowlist (true = anyone can self-mint that tier) ---
    self_mint_allowed: TreeMap[str, bool]

    # =================================================================
    # Constructor
    # =================================================================

    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.version = u256(1)
        self.next_token_id = u256(1)
        self.total_supply_count = u256(0)
        self.total_revoked = u256(0)
        # Genesis is self-mintable; rest is admin-gated by default.
        self.self_mint_allowed[TIER_GENESIS] = True

    # =================================================================
    # Admin
    # =================================================================

    @gl.public.write
    def transfer_ownership(self, new_owner: Address) -> None:
        if gl.message.sender_address != self.owner:
            raise Exception("only owner")
        self.owner = new_owner

    @gl.public.write
    def set_authorized_minter(self, addr: Address, allowed: bool) -> None:
        if gl.message.sender_address != self.owner:
            raise Exception("only owner")
        self.authorized_minters[addr] = allowed

    @gl.public.write
    def set_self_mint_allowed(self, tier: str, allowed: bool) -> None:
        if gl.message.sender_address != self.owner:
            raise Exception("only owner")
        if tier not in VALID_TIERS:
            raise Exception("invalid tier")
        self.self_mint_allowed[tier] = allowed

    def _is_authorized_minter(self, addr: Address) -> bool:
        if addr == self.owner:
            return True
        if addr in self.authorized_minters:
            return bool(self.authorized_minters[addr])
        return False

    # =================================================================
    # Minting (write)
    # =================================================================

    @gl.public.write
    def mint(
        self,
        to: Address,
        name: str,
        description: str,
        image_uri: str,
        tier: str,
        metadata_json: str,
        transferable: bool,
    ) -> int:
        """Admin / authorized minter creates a credential for `to`."""
        sender = gl.message.sender_address
        if not self._is_authorized_minter(sender):
            raise Exception("not authorized to mint")
        return self._mint_internal(
            to=to,
            minter=sender,
            name=name,
            description=description,
            image_uri=image_uri,
            tier=tier,
            metadata_json=metadata_json,
            transferable=transferable,
        )

    @gl.public.write
    def mint_self(
        self,
        name: str,
        description: str,
        image_uri: str,
        tier: str,
        metadata_json: str,
    ) -> int:
        """Anyone can self-mint a credential of an allowed tier (e.g. genesis)."""
        sender = gl.message.sender_address
        if tier not in VALID_TIERS:
            raise Exception("invalid tier")
        if tier not in self.self_mint_allowed or not bool(self.self_mint_allowed[tier]):
            raise Exception("tier is not self-mintable")
        return self._mint_internal(
            to=sender,
            minter=sender,
            name=name,
            description=description,
            image_uri=image_uri,
            tier=tier,
            metadata_json=metadata_json,
            transferable=False,
        )

    def _mint_internal(
        self,
        to: Address,
        minter: Address,
        name: str,
        description: str,
        image_uri: str,
        tier: str,
        metadata_json: str,
        transferable: bool,
    ) -> int:
        if tier not in VALID_TIERS:
            raise Exception("invalid tier")
        name = _clamp_str(name, MAX_NAME_LEN)
        description = _clamp_str(description, MAX_DESCRIPTION_LEN)
        image_uri = _clamp_str(image_uri, MAX_IMAGE_URI_LEN)
        metadata_json = _clamp_str(metadata_json, MAX_METADATA_LEN)

        token_id = self.next_token_id
        now = u256(0)

        cred = Credential(
            token_id=token_id,
            owner=to,
            minter=minter,
            name=name,
            description=description,
            image_uri=image_uri,
            metadata_json=metadata_json,
            tier=tier,
            transferable=transferable,
            revoked=False,
            minted_at=now,
            revoked_at=u256(0),
        )
        self.credentials[token_id] = cred

        # Genlayer storage auto-creates DynArray on first access.
        self.tokens_of[to].append(token_id)

        self.next_token_id = u256(token_id + 1)
        self.total_supply_count = u256(self.total_supply_count + 1)
        return int(token_id)

    # =================================================================
    # Revocation & transfer
    # =================================================================

    @gl.public.write
    def revoke(self, token_id: int) -> None:
        """Burn (mark revoked) a credential. Owner or original minter only."""
        tid = u256(token_id)
        if tid not in self.credentials:
            raise Exception("token not found")
        cred = self.credentials[tid]
        if cred.revoked:
            raise Exception("already revoked")
        sender = gl.message.sender_address
        if sender != self.owner and sender != cred.minter:
            raise Exception("not authorized to revoke")
        cred.revoked = True
        cred.revoked_at = u256(0)
        self.credentials[tid] = cred
        self.total_revoked = u256(self.total_revoked + 1)

    @gl.public.write
    def transfer(self, token_id: int, to: Address) -> None:
        """Move a credential to a new wallet. Only works if tier is transferable."""
        tid = u256(token_id)
        if tid not in self.credentials:
            raise Exception("token not found")
        cred = self.credentials[tid]
        if cred.revoked:
            raise Exception("cannot transfer revoked credential")
        if not cred.transferable:
            raise Exception("credential is soulbound")
        if gl.message.sender_address != cred.owner:
            raise Exception("only current owner can transfer")
        old_owner = cred.owner
        cred.owner = to
        self.credentials[tid] = cred

        # Remove from old owner's list
        if old_owner in self.tokens_of:
            arr = self.tokens_of[old_owner]
            i = 0
            while i < len(arr):
                if int(arr[i]) == int(tid):
                    # swap-remove
                    last = len(arr) - 1
                    if i != last:
                        arr[i] = arr[last]
                    arr.pop(last)
                    break
                i += 1
            self.tokens_of[old_owner] = arr

        self.tokens_of[to].append(tid)

    # =================================================================
    # Views
    # =================================================================

    @gl.public.view
    def get_contract_info(self) -> dict:
        return {
            "name": "Reputon NFT",
            "version": int(self.version),
            "owner": str(self.owner),
            "next_token_id": int(self.next_token_id),
            "total_supply": int(self.total_supply_count),
            "total_revoked": int(self.total_revoked),
            "live_supply": int(self.total_supply_count) - int(self.total_revoked),
        }

    @gl.public.view
    def is_authorized_minter(self, addr: Address) -> bool:
        return self._is_authorized_minter(addr)

    @gl.public.view
    def is_self_mint_allowed(self, tier: str) -> bool:
        if tier not in self.self_mint_allowed:
            return False
        return bool(self.self_mint_allowed[tier])

    @gl.public.view
    def total_supply(self) -> int:
        return int(self.total_supply_count) - int(self.total_revoked)

    @gl.public.view
    def get_credential(self, token_id: int) -> dict:
        tid = u256(token_id)
        if tid not in self.credentials:
            raise Exception("token not found")
        return _credential_to_dict(self.credentials[tid])

    @gl.public.view
    def get_credentials_of(self, addr: Address) -> list:
        out: list = []
        if addr not in self.tokens_of:
            return out
        ids = self.tokens_of[addr]
        i = 0
        while i < len(ids):
            tid = ids[i]
            if tid in self.credentials:
                cred = self.credentials[tid]
                if not cred.revoked:
                    out.append(_credential_to_dict(cred))
            i += 1
        return out

    @gl.public.view
    def has_credential(self, addr: Address, tier: str) -> bool:
        if addr not in self.tokens_of:
            return False
        ids = self.tokens_of[addr]
        i = 0
        while i < len(ids):
            tid = ids[i]
            if tid in self.credentials:
                cred = self.credentials[tid]
                if (not cred.revoked) and cred.tier == tier:
                    return True
            i += 1
        return False


# ---------------------------------------------------------------------
# Module helpers (not part of contract storage)
# ---------------------------------------------------------------------

def _credential_to_dict(c: Credential) -> dict:
    return {
        "token_id": int(c.token_id),
        "owner": str(c.owner),
        "minter": str(c.minter),
        "name": c.name,
        "description": c.description,
        "image_uri": c.image_uri,
        "metadata_json": c.metadata_json,
        "tier": c.tier,
        "transferable": bool(c.transferable),
        "soulbound": not bool(c.transferable),
        "revoked": bool(c.revoked),
        "minted_at": int(c.minted_at),
        "revoked_at": int(c.revoked_at),
    }