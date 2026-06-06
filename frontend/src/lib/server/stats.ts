/**
 * Marketing-page live stats: read straight from the deployed contracts so
 * landing copy never shows simulated values.
 */
import "server-only";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4001";

export type ProtocolStats = {
  total_profiles: number;
  total_evaluations: number;
  total_endorsements: number;
  nft_supply: number;
  nft_revoked: number;
  sybil_active_flags: number;
  sybil_flagged_addresses: number;
  contract_version: number;
  owner: string;
};

async function safeJson<T>(url: string, revalidate = 30): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getProtocolStats(): Promise<ProtocolStats | null> {
  const [info, nft, sybil] = await Promise.all([
    safeJson<{
      version: number;
      owner: string;
      total_profiles: number;
      total_evaluations: number;
      total_endorsements: number;
    }>(`${BASE}/v1/onchain/info`),
    safeJson<{ total_supply: number; total_revoked: number; live_supply: number }>(
      `${BASE}/v1/onchain/nft/info`
    ),
    safeJson<{ active_flags: number; flagged_addresses: number }>(
      `${BASE}/v1/onchain/sybil/info`
    ),
  ]);
  if (!info) return null;
  return {
    total_profiles: info.total_profiles,
    total_evaluations: info.total_evaluations,
    total_endorsements: info.total_endorsements,
    nft_supply: nft?.total_supply ?? 0,
    nft_revoked: nft?.total_revoked ?? 0,
    sybil_active_flags: sybil?.active_flags ?? 0,
    sybil_flagged_addresses: sybil?.flagged_addresses ?? 0,
    contract_version: info.version,
    owner: info.owner,
  };
}
