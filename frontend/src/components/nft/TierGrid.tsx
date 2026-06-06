"use client";

/**
 * 5-tier credential grid.
 *
 * All five tiers are always visible so the user can see the full ladder
 * up-front. Each tier shows:
 *   - the gradient + initial
 *   - what it represents
 *   - the score threshold that unlocks it
 *   - one of four states:
 *       1) Already minted (owned, soulbound)
 *       2) Eligible — score ≥ threshold and contract allows self-mint
 *       3) Score too low — needs more reputation
 *       4) Not yet enabled by the protocol owner (set_self_mint_allowed)
 */

import { useState } from "react";
import { useAccount } from "wagmi";
import { Sparkles, Loader2, CheckCircle2, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGenLayerWrite } from "@/lib/genlayer/useGenLayerWrite";
import { TIERS, type TierDef } from "./tiers";

export { TIERS, type TierDef };

const NFT_ADDRESS = (process.env.NEXT_PUBLIC_REPUTON_NFT_CONTRACT_ADDRESS ?? "") as `0x${string}`;

type Props = {
  score: number;
  owned: { tier: string }[];
  /** Tier IDs the contract owner has currently enabled for self-mint. */
  enabledForSelfMint: Set<string>;
};

export function TierGrid({ score, owned, enabledForSelfMint }: Props) {
  const ownedTiers = new Set(owned.filter((c) => c).map((c) => c.tier));

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {TIERS.map((t) => (
        <TierCard
          key={t.id}
          tier={t}
          owned={ownedTiers.has(t.id)}
          score={score}
          enabled={enabledForSelfMint.has(t.id)}
        />
      ))}
    </div>
  );
}

function TierCard({
  tier,
  owned,
  score,
  enabled,
}: {
  tier: TierDef;
  owned: boolean;
  score: number;
  enabled: boolean;
}) {
  const { isConnected } = useAccount();
  const { write, status, error: writeError } = useGenLayerWrite();
  const [tx, setTx] = useState<string | null>(null);

  const meetsScore = score >= tier.threshold;
  const canMint = !owned && enabled && meetsScore && isConnected && !!NFT_ADDRESS;
  const busy = status === "switching" || status === "signing" || status === "mining";

  async function mint() {
    setTx(null);
    try {
      const result = await write({
        contractAddress: NFT_ADDRESS,
        functionName: "mint_self",
        args: [tier.defaultName, tier.defaultDescription, "", tier.id, "{}"],
      });
      setTx(result.evmTxHash);
      try {
        await fetch("/api/me/credentials/record-mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: tier.id, tx_hash: result.evmTxHash }),
        });
      } catch {
        /* non-fatal */
      }
    } catch {
      /* hook surfaces error */
    }
  }

  // ------------ state-driven copy ------------
  let footerNode: React.ReactNode;
  if (owned) {
    footerNode = (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] text-success">
        <CheckCircle2 className="h-3 w-3" />
        Owned
      </span>
    );
  } else if (!enabled) {
    footerNode = (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-accent">
        <Lock className="h-3 w-3" />
        Not yet enabled by protocol
      </span>
    );
  } else if (!meetsScore) {
    footerNode = (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-accent">
        <Lock className="h-3 w-3" />
        Reach score {tier.threshold} to mint ({score}/{tier.threshold})
      </span>
    );
  } else {
    footerNode = (
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={mint} disabled={!canMint || busy} size="sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {status === "switching"
            ? "Switching…"
            : status === "signing"
            ? "Confirm in wallet…"
            : status === "mining"
            ? "Awaiting consensus…"
            : "Mint"}
        </Button>
        {!isConnected && (
          <span className="text-[11px] text-accent">Connect a wallet to mint.</span>
        )}
        {tx && (
          <span className="break-all text-[11px] text-accent">
            tx <span className="font-mono">{tx.slice(0, 10)}…{tx.slice(-6)}</span>
          </span>
        )}
        {writeError && (
          <span className="inline-flex items-center gap-1 text-[11px] text-error">
            <AlertTriangle className="h-3 w-3" />
            {writeError}
          </span>
        )}
      </div>
    );
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div
        className={
          "grid h-28 place-items-center bg-gradient-to-br text-3xl font-display font-semibold uppercase text-foreground/80 " +
          tier.gradient
        }
      >
        {tier.label[0]}
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            {tier.label} · ≥{tier.threshold}
          </span>
          <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
            soulbound
          </span>
        </div>
        <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
          {tier.defaultName}
        </h3>
        <p className="text-[12.5px] leading-snug text-accent">{tier.blurb}</p>
        <div className="pt-1">{footerNode}</div>
      </div>
    </article>
  );
}
