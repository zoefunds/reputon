/**
 * Snapshot.org governance adapter.
 *
 * Reads votes + authored proposals for a wallet via Snapshot's public GraphQL
 * endpoint, computes per-DAO quality signals, persists into the
 * `governance_record` table.
 *
 * Snapshot covers ~5,000+ DAOs — a single integration unlocks broad coverage.
 * Other adapters (Tally, Boardroom, on-chain modules) can be layered later.
 */
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { governanceRecords, profiles } from "@reputon/db/schema";

const SNAPSHOT_GQL = "https://hub.snapshot.org/graphql";

const db = getDb();

export type SnapshotVote = {
  id: string;
  voter: string;
  choice: number | number[];
  created: number;
  proposal: {
    id: string;
    title: string;
    state: string;
    space: { id: string; name: string };
  };
};

export type SnapshotProposal = {
  id: string;
  title: string;
  state: string;
  author: string;
  created: number;
  votes: number;
  scores_total: number;
  space: { id: string; name: string };
};

export type DaoSummary = {
  dao: string;
  daoName: string;
  votes: number;
  proposalsAuthored: number;
  totalSnapshotVotes: number;
  avgProposalReach: number;
  qualityScore: number; // 0..100 heuristic
  lastActiveAt: number; // unix
};

export type GovernanceActivity = {
  address: string;
  fetchedAt: string;
  votes: SnapshotVote[];
  proposals: SnapshotProposal[];
  daos: DaoSummary[];
};

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(SNAPSHOT_GQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: T; errors?: unknown };
    if (body.errors) return null;
    return body.data ?? null;
  } catch {
    return null;
  }
}

const VOTES_QUERY = `
  query Votes($voter: String!) {
    votes(first: 200, skip: 0, where: { voter: $voter }, orderBy: "created", orderDirection: desc) {
      id voter choice created
      proposal { id title state space { id name } }
    }
  }
`;

const PROPOSALS_QUERY = `
  query Proposals($author: String!) {
    proposals(first: 100, skip: 0, where: { author: $author }, orderBy: "created", orderDirection: desc) {
      id title state author created votes scores_total
      space { id name }
    }
  }
`;

export async function fetchSnapshotActivity(
  rawAddress: string
): Promise<GovernanceActivity> {
  const address = rawAddress.toLowerCase();
  const [votesRes, proposalsRes] = await Promise.all([
    gql<{ votes: SnapshotVote[] }>(VOTES_QUERY, { voter: address }),
    gql<{ proposals: SnapshotProposal[] }>(PROPOSALS_QUERY, { author: address }),
  ]);
  const votes = votesRes?.votes ?? [];
  const proposals = proposalsRes?.proposals ?? [];

  const daoMap = new Map<string, DaoSummary>();
  for (const v of votes) {
    const id = v.proposal.space.id;
    const cur = daoMap.get(id) ?? {
      dao: id,
      daoName: v.proposal.space.name,
      votes: 0,
      proposalsAuthored: 0,
      totalSnapshotVotes: 0,
      avgProposalReach: 0,
      qualityScore: 0,
      lastActiveAt: 0,
    };
    cur.votes += 1;
    cur.lastActiveAt = Math.max(cur.lastActiveAt, v.created);
    daoMap.set(id, cur);
  }
  for (const p of proposals) {
    const id = p.space.id;
    const cur = daoMap.get(id) ?? {
      dao: id,
      daoName: p.space.name,
      votes: 0,
      proposalsAuthored: 0,
      totalSnapshotVotes: 0,
      avgProposalReach: 0,
      qualityScore: 0,
      lastActiveAt: 0,
    };
    cur.proposalsAuthored += 1;
    cur.totalSnapshotVotes += p.votes;
    cur.lastActiveAt = Math.max(cur.lastActiveAt, p.created);
    daoMap.set(id, cur);
  }

  const now = Math.floor(Date.now() / 1000);
  const daos = Array.from(daoMap.values()).map((d) => {
    d.avgProposalReach =
      d.proposalsAuthored > 0
        ? Math.round(d.totalSnapshotVotes / d.proposalsAuthored)
        : 0;
    // Quality heuristic: votes (capped @50) + 4× authored (capped @20) + recency bonus.
    const recencyDays = (now - d.lastActiveAt) / 86400;
    const recencyBonus = recencyDays < 30 ? 20 : recencyDays < 180 ? 10 : 0;
    d.qualityScore = clamp(
      Math.min(d.votes, 50) + Math.min(d.proposalsAuthored, 20) * 4 + recencyBonus,
      0,
      100
    );
    return d;
  });
  daos.sort((a, b) => b.qualityScore - a.qualityScore);

  return {
    address,
    fetchedAt: new Date().toISOString(),
    votes,
    proposals,
    daos,
  };
}

/**
 * Persist freshly fetched activity into governance_record so dashboards can
 * read history without re-hitting Snapshot. Idempotent on (profile, dao,
 * proposalId, role).
 */
export async function persistActivity(
  address: string,
  activity: GovernanceActivity
): Promise<number> {
  // Find or create profile row keyed by address.
  let [profile] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.address, address.toLowerCase()), eq(profiles.chain, "evm")))
    .limit(1);
  if (!profile) {
    [profile] = await db
      .insert(profiles)
      .values({
        address: address.toLowerCase(),
        chain: "evm",
        displayName: short(address),
      })
      .returning();
  }

  const rows: (typeof governanceRecords.$inferInsert)[] = [];
  for (const v of activity.votes) {
    rows.push({
      profileId: profile.id,
      daoName: v.proposal.space.name,
      proposalId: v.proposal.id,
      role: "voter",
      decision: Array.isArray(v.choice) ? v.choice.join(",") : String(v.choice),
      occurredAt: new Date(v.created * 1000),
    });
  }
  for (const p of activity.proposals) {
    rows.push({
      profileId: profile.id,
      daoName: p.space.name,
      proposalId: p.id,
      role: "author",
      decision: null,
      qualityScore: Math.min(100, p.votes),
      occurredAt: new Date(p.created * 1000),
    });
  }
  if (rows.length === 0) return 0;

  await db.insert(governanceRecords).values(rows).onConflictDoNothing();
  return rows.length;
}

export async function recentRecords(address: string, limit = 25) {
  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.address, address.toLowerCase()), eq(profiles.chain, "evm")))
    .limit(1);
  if (!profile) return [];
  return db
    .select()
    .from(governanceRecords)
    .where(eq(governanceRecords.profileId, profile.id))
    .orderBy(desc(governanceRecords.occurredAt))
    .limit(limit);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
