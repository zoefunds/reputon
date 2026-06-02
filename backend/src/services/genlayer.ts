/**
 * Genlayer StudioNet client wrapper.
 *
 * Provides typed read access to the deployed Reputon contract. Writes are
 * supported when GENLAYER_ACCOUNT_PRIVATE_KEY is configured; otherwise the
 * client is read-only.
 *
 * Address comes from NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS, set after deploy
 * by `scripts/set_contract_address.py`.
 */

import { createClient, createAccount } from "genlayer-js";
import { studionet, testnetAsimov, localnet } from "genlayer-js/chains";
import { env } from "../env";

type Hex = `0x${string}`;

const CONTRACT = (process.env.NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS ?? "") as Hex;

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
  // Account is optional for read-only calls; provide a random one if missing
  // so the client constructor is happy.
  const pk = process.env.GENLAYER_ACCOUNT_PRIVATE_KEY as Hex | undefined;
  const account = pk ? createAccount(pk) : createAccount();
  _client = createClient({ chain, account, endpoint: rpcUrl });
  return _client;
}

export function reputonAddress(): Hex {
  if (!CONTRACT || !CONTRACT.startsWith("0x")) {
    throw new Error(
      "NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS not set — run `python3 scripts/set_contract_address.py reputon 0x…`"
    );
  }
  return CONTRACT;
}

async function read<T = unknown>(method: string, args: unknown[] = []): Promise<T> {
  const c = client();
  // genlayer-js v1.x API: client.readContract({ address, functionName, args })
  // Falls back to alternate names if the SDK shape differs.
  // @ts-expect-error - cross-version method probing
  if (typeof c.readContract === "function") {
    // @ts-expect-error
    return (await c.readContract({
      address: reputonAddress(),
      functionName: method,
      args,
    })) as T;
  }
  // @ts-expect-error
  if (typeof c.call === "function") {
    // @ts-expect-error
    return (await c.call({
      to: reputonAddress(),
      method,
      args,
    })) as T;
  }
  throw new Error("genlayer-js client has neither readContract() nor call()");
}

// =========================================================================
// Typed surface mirroring intelligent-contracts/reputon.py
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
  contractInfo: () => read<ContractInfo>("get_contract_info"),
  hasProfile: (addr: string) => read<boolean>("has_profile", [addr]),
  profile: (addr: string) => read<OnchainProfile>("get_profile", [addr]),
  score: (addr: string) => read<OnchainScore>("get_score", [addr]),
  verifyScore: (addr: string, expected: number) =>
    read<boolean>("verify_score", [addr, expected]),
  history: (addr: string, limit = 20) =>
    read<OnchainHistoryEntry[]>("get_history", [addr, limit]),
  endorsementsGiven: (addr: string) =>
    read<OnchainEndorsement[]>("get_endorsements_given", [addr]),
  endorsementsReceived: (addr: string) =>
    read<OnchainEndorsement[]>("get_endorsements_received", [addr]),
};

export function isContractConfigured(): boolean {
  return Boolean(CONTRACT && CONTRACT.startsWith("0x"));
}

// Re-export for env-driven diagnostics
export const __env__ = { CONTRACT, env };
