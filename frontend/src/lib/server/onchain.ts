/**
 * Server-only fetchers for the Reputon backend.
 * Returns `null` instead of throwing on 4xx so pages can render an empty state.
 */
import "server-only";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4001";

/**
 * User-personalized on-chain reads must NOT be cached. We hit the backend
 * which already enforces a short Redis TTL — that's fine. But Next's
 * built-in data cache survives across contract redeploys and Vercel
 * deployments, which caused the "I redeployed contracts but my old score
 * is still on the dashboard" bug. Forcing `no-store` keys the freshness
 * decision entirely to the backend cache and ensures every page render
 * reflects the current on-chain state.
 */
async function jget<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type Score = {
  address: string;
  score: number;
  confidence: number;
  category: "unverified" | "emerging" | "trusted" | "eminent";
  last_evaluated_at: number;
};

export type Profile = Score & {
  display_name: string;
  bio: string;
  created_at: number;
  evaluations: number;
};

export type HistoryEntry = {
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

export type Endorsement = {
  from: string;
  to: string;
  weight: number;
  note: string;
  created_at: number;
  revoked_at: number;
  active: boolean;
};

export type Credential = {
  token_id: number;
  owner: string;
  name: string;
  description: string;
  image_uri: string;
  tier: string;
  transferable: boolean;
  soulbound: boolean;
  revoked: boolean;
  minted_at: number;
};

export const onchain = {
  profile: (address: string) => jget<Profile>(`/v1/api/profile?address=${encodeURIComponent(address)}`),
  score: (address: string) => jget<Score>(`/v1/api/score?address=${encodeURIComponent(address)}`),
  history: (address: string, limit = 30) =>
    jget<{ address: string; history: HistoryEntry[] }>(
      `/v1/api/history?address=${encodeURIComponent(address)}&limit=${limit}`
    ),
  endorsements: (address: string, direction: "given" | "received" = "received") =>
    jget<{ address: string; direction: string; endorsements: Endorsement[] }>(
      `/v1/api/endorsements?address=${encodeURIComponent(address)}&direction=${direction}`
    ),
  credentialsOf: (address: string) =>
    jget<{ credentials: Credential[] }>(
      `/v1/onchain/nft/of?address=${encodeURIComponent(address)}`
    ),
  sybilSeverity: (address: string) =>
    jget<{ address: string; severity: string }>(
      `/v1/onchain/sybil/severity?address=${encodeURIComponent(address)}`
    ),
};
