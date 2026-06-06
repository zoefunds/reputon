import { Award, Share2 } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { TierGrid } from "@/components/nft/TierGrid";
import { TIERS } from "@/components/nft/tiers";
import { requireUser } from "@/lib/server/user";
import { onchain } from "@/lib/server/onchain";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4001";

/**
 * Asks the backend whether a given tier is currently self-mintable
 * (is_self_mint_allowed on the contract). Any failure — bad env, 5xx,
 * malformed JSON — returns false so the page still renders the rest
 * of the tier ladder with a "not yet enabled by protocol" state for
 * the broken tiers instead of crashing the whole page.
 */
async function isSelfMintAllowed(tier: string): Promise<boolean> {
  try {
    const r = await fetch(
      `${API_BASE}/v1/onchain/nft/self-mint-allowed/${encodeURIComponent(tier)}`,
      { cache: "no-store" }
    );
    if (!r.ok) return false;
    const j = (await r.json().catch(() => null)) as { allowed?: boolean } | null;
    return Boolean(j?.allowed);
  } catch {
    return false;
  }
}

export default async function NftsPage() {
  const user = await requireUser();
  const address = user.primaryWallet?.address;

  // Each branch is wrapped in catch-and-default so a single failed
  // upstream call (e.g. backend cold-start) never takes the whole
  // credentials page down.
  const [score, owned, allowedFlags] = await Promise.all([
    address ? onchain.score(address).catch(() => null) : Promise.resolve(null),
    address ? onchain.credentialsOf(address).catch(() => null) : Promise.resolve(null),
    Promise.all(
      TIERS.map((t) =>
        isSelfMintAllowed(t.id)
          .then((ok) => [t.id, ok] as const)
          .catch(() => [t.id, false] as const)
      )
    ),
  ]);
  const data = owned?.credentials ?? [];
  const enabledForSelfMint = new Set(allowedFlags.filter(([, ok]) => ok).map(([id]) => id));
  const userScore = score?.score ?? 0;

  return (
    <Container className="space-y-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Credentials</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
            On-chain proofs of what you&apos;ve done.
          </h1>
          <p className="mt-2 text-[13.5px] text-accent">
            All five tiers are visible up-front so you can see what unlocks next.
            Tiers gate on your Reputon score — climb it via the analyzer.
          </p>
        </div>
        {address && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/profile/${address}`}>
              <Share2 className="h-4 w-4" />
              View public profile
            </Link>
          </Button>
        )}
      </div>

      {!address ? (
        <EmptyState
          icon={<Award className="h-4 w-4" />}
          title="Link a wallet first"
          body="NFT credentials are minted to a wallet."
        />
      ) : (
        <>
          {/* Score banner */}
          <div className="flex flex-wrap items-baseline gap-2 rounded-lg border border-border bg-card px-4 py-3 text-[13px]">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
              Current score
            </span>
            <span className="font-display text-xl font-semibold text-foreground">
              {userScore}
            </span>
            <span className="text-accent">/ 1000</span>
          </div>

          <TierGrid score={userScore} owned={data} enabledForSelfMint={enabledForSelfMint} />

          {data.length === 0 && (
            <p className="text-[13px] text-accent">
              You haven&apos;t minted any credentials yet. Genesis is always available.
              Higher tiers unlock as your score climbs.
            </p>
          )}
        </>
      )}
    </Container>
  );
}
