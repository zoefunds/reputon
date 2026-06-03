"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MintGenesisCard({ hasGenesis }: { hasGenesis: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  async function mint() {
    setError(null);
    setTx(null);
    setBusy(true);
    try {
      const res = await fetch("/api/me/credentials/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "genesis" }),
      });
      const body = (await res.json()) as {
        minted?: boolean;
        tx_hash?: string;
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(body.error?.message ?? "Mint failed");
      setTx(body.tx_hash ?? "");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mint failed");
    } finally {
      setBusy(false);
    }
  }

  if (hasGenesis) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            Genesis credential minted
          </h3>
        </div>
        <p className="mt-2 text-[13px] text-accent">
          You hold the founding-member soulbound credential. Higher tiers
          (bronze → eternal) unlock as you earn reputation.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-amber-100 to-amber-300 p-6 shadow-soft sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/70">
            Available now
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
            Mint the Genesis credential
          </h2>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-foreground/80">
            Soulbound proof that your wallet was here from the start of the
            Reputon protocol. Free to claim — your only Genesis ever.
          </p>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-foreground/10 font-display text-2xl font-semibold text-foreground">
          G
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={mint} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Minting…" : "Mint Genesis"}
        </Button>
        {tx && (
          <p className="break-all text-[12px] text-foreground/80">
            tx <span className="font-mono">{tx}</span>
          </p>
        )}
        {error && (
          <p className="flex items-center gap-1 text-[12px] text-error">
            <AlertTriangle className="h-3 w-3" /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
