/**
 * Genlayer StudioNet client wrapper.
 *
 * Read-only typed access to the three Reputon contracts:
 *   - reputon           (main reputation contract)
 *   - reputonNft        (credential NFTs)
 *   - sybilOracle       (LLM-backed sybil detector)
 *
 * Writes work when GENLAYER_ACCOUNT_PRIVATE_KEY is set; otherwise the
 * client is read-only.
 */

import { createClient, createAccount } from "genlayer-js";
import { studionet, testnetAsimov, localnet } from "genlayer-js/chains";
import { env } from "../env";

type Hex = `0x${string}`;

const ADDR = {
  reputon: (process.env.NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS ?? "") as Hex,
  nft: (process.env.NEXT_PUBLIC_REPUTON_NFT_CONTRACT_ADDRESS ?? "") as Hex,
  sybil: (process.env.NEXT_PUBLIC_SYBIL_ORACLE_CONTRACT_ADDRESS ?? "") as Hex,
};

function chainFor(rpc: string) {
  if (rpc.includes("studio.genlayer.com")) return studionet;
  if (rpc.includes("asimov")) return testnetAsimov;
  return localnet;
}

let _client: ReturnType<typeof createClient> | null = null;

function client() {
  if (_client) return _client;
  const rpcUrl =
    process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api";
  const chain = chainFor(rpcUrl);
  const pk = process.env.GENLAYER_ACCOUNT_PRIVATE_KEY as Hex | undefined;
  const account = pk ? createAccount(pk) : createAccount();
  _client = createClient({ chain, account, endpoint: rpcUrl });
  return _client;
}

function ensure(addr: Hex, key: keyof typeof ADDR) {
  if (!addr || !addr.startsWith("0x")) {
    throw new Error(
      `Contract address for "${key}" is not set — run \`python3 scripts/set_contract_address.py ${key} 0x…\``
    );
  }
  return addr;
}

async function readAt<T = unknown>(
  address: Hex,
  method: string,
  args: unknown[] = []
): Promise<T> {
  // Cross-version method probing — different genlayer-js releases ship slightly
  // different read APIs. Cast through `any` to stay compatible.
  const c = client() as unknown as Record<string, (input: unknown) => Promise<unknown>>;
  if (typeof c.readContract === "function") {
    return (await c.readContract({ address, functionName: method, args })) as T;
  }
  if (typeof c.call === "function") {
    return (await c.call({ to: address, method, args })) as T;
  }
  throw new Error("genlayer-js client has neither readContract() nor call()");
}

export function isContractConfigured(kind: keyof typeof ADDR = "reputon"): boolean {
  const a = ADDR[kind];
  return Boolean(a && a.startsWith("0x"));
}

export function reputonAddress(): Hex {
  return ensure(ADDR.reputon, "reputon");
}
export function reputonNftAddress(): Hex {
  return ensure(ADDR.nft, "nft");
}
export function sybilOracleAddress(): Hex {
  return ensure(ADDR.sybil, "sybil");
}

// =========================================================================
// reputon.py  (main reputation contract)
// =========================================================================

export type ContractInfo = {
  name: string;
  version: number;
  owner: string;
  total_profiles: number;
  total_evaluations: number;
  total_endorsements: number;
};

export type OnchainScore = {
  address: string;
  score: number;
  confidence: number;
  category: "unverified" | "emerging" | "trusted" | "eminent";
  last_evaluated_at: number;
};

export type OnchainProfile = OnchainScore & {
  display_name: string;
  bio: string;
  created_at: number;
  evaluations: number;
};

export type OnchainHistoryEntry = {
  score: number;
  confidence: number;
  category: string;
  delta: number;
  reason: string;
  explanation: string;
  breakdown: {
    activity: number;
    governance: number;
    contribution: number;
    trust: number;
  };
  created_at: number;
};

export type OnchainEndorsement = {
  from: string;
  to: string;
  weight: number;
  note: string;
  created_at: number;
  revoked_at: number;
  active: boolean;
};

export const reputon = {
  contractInfo: () => readAt<ContractInfo>(reputonAddress(), "get_contract_info"),
  hasProfile: (addr: string) => readAt<boolean>(reputonAddress(), "has_profile", [addr]),
  profile: (addr: string) => readAt<OnchainProfile>(reputonAddress(), "get_profile", [addr]),
  score: (addr: string) => readAt<OnchainScore>(reputonAddress(), "get_score", [addr]),
  verifyScore: (addr: string, expected: number) =>
    readAt<boolean>(reputonAddress(), "verify_score", [addr, expected]),
  history: (addr: string, limit = 20) =>
    readAt<OnchainHistoryEntry[]>(reputonAddress(), "get_history", [addr, limit]),
  endorsementsGiven: (addr: string) =>
    readAt<OnchainEndorsement[]>(reputonAddress(), "get_endorsements_given", [addr]),
  endorsementsReceived: (addr: string) =>
    readAt<OnchainEndorsement[]>(reputonAddress(), "get_endorsements_received", [addr]),
};

// =========================================================================
// reputon_nft.py  (credential NFTs)
// =========================================================================

export type NftContractInfo = {
  name: string;
  version: number;
  owner: string;
  next_token_id: number;
  total_supply: number;
  total_revoked: number;
  live_supply: number;
};

export type Credential = {
  token_id: number;
  owner: string;
  minter: string;
  name: string;
  description: string;
  image_uri: string;
  metadata_json: string;
  tier: "genesis" | "bronze" | "silver" | "gold" | "eternal" | string;
  transferable: boolean;
  soulbound: boolean;
  revoked: boolean;
  minted_at: number;
  revoked_at: number;
};

export const reputonNft = {
  contractInfo: () => readAt<NftContractInfo>(reputonNftAddress(), "get_contract_info"),
  totalSupply: () => readAt<number>(reputonNftAddress(), "total_supply"),
  credential: (tokenId: number) =>
    readAt<Credential>(reputonNftAddress(), "get_credential", [tokenId]),
  credentialsOf: (addr: string) =>
    readAt<Credential[]>(reputonNftAddress(), "get_credentials_of", [addr]),
  hasCredential: (addr: string, tier: string) =>
    readAt<boolean>(reputonNftAddress(), "has_credential", [addr, tier]),
  isSelfMintAllowed: (tier: string) =>
    readAt<boolean>(reputonNftAddress(), "is_self_mint_allowed", [tier]),
  isAuthorizedMinter: (addr: string) =>
    readAt<boolean>(reputonNftAddress(), "is_authorized_minter", [addr]),
};

// =========================================================================
// sybil_oracle.py  (LLM-backed sybil detector)
// =========================================================================

export type Severity = "low" | "medium" | "high" | "critical";

export type SybilContractInfo = {
  name: string;
  version: number;
  owner: string;
  total_flags: number;
  total_resolved: number;
  active_flags: number;
  flagged_addresses: number;
};

export type SybilFlag = {
  index: number;
  severity: Severity | string;
  reason: string;
  summary: string;
  evidence_hash: string;
  reporter: string;
  automated: boolean;
  resolved: boolean;
  created_at: number;
  resolved_at: number;
};

export const sybilOracle = {
  contractInfo: () =>
    readAt<SybilContractInfo>(sybilOracleAddress(), "get_contract_info"),
  flags: (addr: string) =>
    readAt<SybilFlag[]>(sybilOracleAddress(), "get_flags", [addr]),
  activeFlags: (addr: string) =>
    readAt<SybilFlag[]>(sybilOracleAddress(), "get_active_flags", [addr]),
  severity: (addr: string) =>
    readAt<string>(sybilOracleAddress(), "get_severity", [addr]),
  isSuspicious: (addr: string, min: Severity = "medium") =>
    readAt<boolean>(sybilOracleAddress(), "is_suspicious", [addr, min]),
  listFlagged: (limit = 50) =>
    readAt<string[]>(sybilOracleAddress(), "list_flagged_addresses", [limit]),
  isAuthorizedReporter: (addr: string) =>
    readAt<boolean>(sybilOracleAddress(), "is_authorized_reporter", [addr]),
};

export const __env__ = { ADDR, env };
