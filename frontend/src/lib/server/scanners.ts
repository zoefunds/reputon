/**
 * Wallet-based scanners — no OAuth, just public APIs.
 *
 * These power the "Credentials" and "Protocols" connector cards in the
 * Analyzer. They use the user's already-connected wallet, so there's no
 * extra approval flow or token to manage.
 */
import "server-only";

// ---------------------------------------------------------------------------
// Gitcoin Passport — Credentials
// ---------------------------------------------------------------------------

export type PassportSummary = {
  ok: boolean;
  /** Aggregate humanity score (0–100ish, varies by Passport version). */
  score: number | null;
  /** Number of unique stamps the wallet has earned. */
  stamps: number;
  /** Whether the wallet's score crosses the "humanity" threshold. */
  passing: boolean;
  /** Provider-side last-update timestamp, if reported. */
  last_updated: string | null;
  /** Distinguishes "no key" from "wallet has no score" for the UI. */
  reason?: "missing_key" | "fetch_failed";
};

/**
 * Gitcoin Passport (now "Human Passport") scorer.
 *
 * The public endpoint was deprecated — every read now requires an API key
 * from developer.passport.xyz plus a Scorer ID. Both must be set as
 * server-side env vars: PASSPORT_API_KEY and PASSPORT_SCORER_ID.
 *
 * If they're not set we return ok:false with reason="missing_key" so the
 * UI can show "Passport API key not configured" instead of the generic
 * "could not be read".
 */
export async function scanPassport(address: string): Promise<PassportSummary> {
  const fallback = (reason: PassportSummary["reason"]): PassportSummary => ({
    ok: false,
    score: null,
    stamps: 0,
    passing: false,
    last_updated: null,
    reason,
  });
  const apiKey = process.env.PASSPORT_API_KEY;
  const scorerId = process.env.PASSPORT_SCORER_ID;
  if (!apiKey || !scorerId) return fallback("missing_key");

  try {
    // Passport v2 scorer endpoint. The Authorization header is the raw
    // API key, NOT a Bearer prefix.
    const r = await fetch(
      `https://api.passport.xyz/v2/stamps/${encodeURIComponent(scorerId)}/score/${encodeURIComponent(address)}`,
      {
        headers: {
          "X-API-Key": apiKey,
          accept: "application/json",
        },
        cache: "no-store",
      }
    );
    if (!r.ok) return fallback("fetch_failed");
    const j = (await r.json()) as {
      score?: number | string;
      passing_score?: boolean;
      stamps?: Record<string, unknown> | unknown[];
      last_score_timestamp?: string;
    };
    const score =
      typeof j.score === "number"
        ? j.score
        : typeof j.score === "string"
        ? Number(j.score)
        : null;
    const stamps = Array.isArray(j.stamps)
      ? j.stamps.length
      : j.stamps && typeof j.stamps === "object"
      ? Object.keys(j.stamps).length
      : 0;
    return {
      ok: true,
      score: Number.isFinite(score as number) ? (score as number) : null,
      stamps,
      passing: Boolean(j.passing_score),
      last_updated: j.last_score_timestamp ?? null,
    };
  } catch {
    return fallback("fetch_failed");
  }
}

// ---------------------------------------------------------------------------
// Snapshot — Protocols (governance)
// ---------------------------------------------------------------------------

export type SnapshotSummary = {
  ok: boolean;
  /** Total votes cast across all Snapshot spaces. */
  vote_count: number;
  /** Distinct DAO spaces voted in. */
  spaces: { id: string; name: string; votes: number }[];
  /** Most recent vote timestamp (unix seconds). */
  last_voted_at: number | null;
};

const SNAPSHOT_GQL = "https://hub.snapshot.org/graphql";

/**
 * Pull recent Snapshot governance activity for a wallet. We grab the last
 * 200 votes (more than enough to spot patterns) and roll them up per
 * space. Public endpoint, no auth.
 */
export async function scanSnapshot(address: string): Promise<SnapshotSummary> {
  const fallback: SnapshotSummary = {
    ok: false,
    vote_count: 0,
    spaces: [],
    last_voted_at: null,
  };
  const query = `
    query VoterActivity($voter: String!) {
      votes(first: 200, where: { voter: $voter }, orderBy: "created", orderDirection: desc) {
        created
        space { id name }
      }
    }
  `;
  try {
    const r = await fetch(SNAPSHOT_GQL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { voter: address } }),
      cache: "no-store",
    });
    if (!r.ok) return fallback;
    const body = (await r.json()) as {
      data?: { votes?: { created: number; space?: { id: string; name: string } }[] };
    };
    const votes = body.data?.votes ?? [];
    const per = new Map<string, { id: string; name: string; votes: number }>();
    let last = 0;
    for (const v of votes) {
      if (!v.space?.id) continue;
      const cur = per.get(v.space.id) ?? { id: v.space.id, name: v.space.name, votes: 0 };
      cur.votes += 1;
      per.set(v.space.id, cur);
      if (v.created > last) last = v.created;
    }
    return {
      ok: true,
      vote_count: votes.length,
      spaces: Array.from(per.values()).sort((a, b) => b.votes - a.votes).slice(0, 10),
      last_voted_at: last || null,
    };
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Tally — DAO governance (optional, no key needed for public read)
// ---------------------------------------------------------------------------

export type TallySummary = {
  ok: boolean;
  /** DAOs the wallet has delegations/votes in. */
  daos: number;
};

const TALLY_GQL = "https://api.tally.xyz/query";

/**
 * Tally read of an account's delegations across governors. We only
 * surface a DAO count — that's the score-relevant signal. If the key
 * isn't set, return ok:false and let the Snapshot scanner carry the
 * governance signal alone.
 */
export async function scanTally(address: string): Promise<TallySummary> {
  const fallback: TallySummary = { ok: false, daos: 0 };
  const key = process.env.TALLY_API_KEY;
  if (!key) return fallback;
  const query = `
    query AccountDelegations($address: Address!) {
      delegations(input: { filters: { address: $address }, page: { limit: 50 } }) {
        nodes {
          ... on Delegation {
            organization { id }
          }
        }
      }
    }
  `;
  try {
    const r = await fetch(TALLY_GQL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Api-Key": key,
      },
      body: JSON.stringify({ query, variables: { address } }),
      cache: "no-store",
    });
    if (!r.ok) return fallback;
    const body = (await r.json()) as {
      data?: { delegations?: { nodes?: { organization?: { id: string } }[] } };
    };
    const nodes = body.data?.delegations?.nodes ?? [];
    const unique = new Set<string>();
    for (const n of nodes) {
      if (n?.organization?.id) unique.add(n.organization.id);
    }
    return { ok: true, daos: unique.size };
  } catch {
    return fallback;
  }
}
