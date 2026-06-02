/**
 * Seed a small but realistic dataset so dev pages have something to render.
 * Idempotent: safe to re-run; existing rows are skipped on conflict.
 */
import "../src/env";
import { getDb, closeDb } from "@reputon/db/client";
import {
  profiles,
  scoreHistory,
  endorsements,
  evaluations,
  nftCredentials,
} from "@reputon/db/schema";

const db = getDb();

const sample = [
  {
    address: "0xada000000000000000000000000000000000a000",
    displayName: "Ada Lovelace",
    bio: "Pioneer of computing. Pseudonymous DAO contributor.",
    score: 932,
    confidence: "0.940",
    category: "eminent" as const,
  },
  {
    address: "0xbeef000000000000000000000000000000000b00",
    displayName: "Satoshi Builder",
    bio: "Long-time governance voter. Protocol contributor.",
    score: 781,
    confidence: "0.870",
    category: "trusted" as const,
  },
  {
    address: "0xcafe000000000000000000000000000000000c00",
    displayName: "Frontier Researcher",
    bio: "AI safety researcher exploring sybil graphs.",
    score: 612,
    confidence: "0.700",
    category: "trusted" as const,
  },
  {
    address: "0xd00d000000000000000000000000000000000d00",
    displayName: "New Joiner",
    bio: "Just connected wallet — building reputation.",
    score: 142,
    confidence: "0.320",
    category: "emerging" as const,
  },
];

async function main() {
  console.log("[seed] inserting profiles…");
  const inserted = await db
    .insert(profiles)
    .values(
      sample.map((s) => ({
        address: s.address,
        chain: "genlayer",
        displayName: s.displayName,
        bio: s.bio,
        score: s.score,
        confidence: s.confidence,
        category: s.category,
        lastEvaluatedAt: new Date(),
      }))
    )
    .onConflictDoNothing()
    .returning({ id: profiles.id, address: profiles.address, score: profiles.score });

  console.log(`[seed] profiles inserted/skipped: ${inserted.length}`);

  // For every freshly inserted profile, drop a few history rows + an evaluation.
  for (const p of inserted) {
    const base = p.score;
    const history = [
      { delta: -12, score: base - 12, reason: "Routine recompute" },
      { delta: 8, score: base - 4, reason: "Endorsement received" },
      { delta: 4, score: base, reason: "AI contribution credit" },
    ];
    for (const h of history) {
      await db.insert(scoreHistory).values({
        profileId: p.id,
        score: h.score,
        confidence: "0.800",
        category: "trusted",
        delta: h.delta,
        reason: h.reason,
        breakdown: { activity: 220, governance: 180, contribution: 200, trust: 200 },
      });
    }

    await db.insert(evaluations).values({
      profileId: p.id,
      kind: "full_recompute",
      aiModel: "genlayer-llm-v1",
      aiExplanation:
        "Consistent governance participation and multiple verified contributions. Sybil checks clean.",
      confidence: "0.870",
      scoreDelta: 12,
      input: { signals: ["activity", "governance", "contribution"] },
      output: { score: p.score, category: "trusted" },
    });

    await db.insert(nftCredentials).values({
      profileId: p.id,
      name: "Genesis Contributor",
      description: "Early member of the Reputon protocol.",
      tier: "genesis",
      mintedAt: new Date(),
    });
  }

  // Cross-endorsements (best-effort)
  if (inserted.length >= 2) {
    await db
      .insert(endorsements)
      .values({
        fromProfile: inserted[0].id,
        toProfile: inserted[1].id,
        weight: 10,
        note: "Outstanding governance work.",
      })
      .onConflictDoNothing();
  }

  console.log("[seed] done");
  await closeDb();
}

main().catch(async (e) => {
  console.error("[seed] failed:", e);
  await closeDb().catch(() => {});
  process.exit(1);
});
