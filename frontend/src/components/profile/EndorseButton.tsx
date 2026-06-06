"use client";

/**
 * Endorse-this-wallet CTA.
 *
 * Renders a button on a public profile page that triggers
 * add_endorsement(target, weight, note) from the visiting user's own
 * wallet via genlayer-js. The visitor must be signed in (so we know
 * which wallet they're using), connected, on GenLayer Studionet, and
 * already evaluated themselves at least once (contract requires the
 * endorser to have a profile).
 */

import { useState } from "react";
import { useAccount } from "wagmi";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGenLayerWrite } from "@/lib/genlayer/useGenLayerWrite";
import { addr } from "@/lib/genlayer/clientWrite";

const REPUTON_ADDRESS = (process.env.NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS ?? "") as `0x${string}`;

export function EndorseButton({ target }: { target: string }) {
  const { isConnected, address: me } = useAccount();
  const { write, status, error } = useGenLayerWrite();
  const [weight, setWeight] = useState(50);
  const [note, setNote] = useState("");
  const [tx, setTx] = useState<string | null>(null);

  const isSelf = !!me && me.toLowerCase() === target.toLowerCase();
  const busy = status === "switching" || status === "signing" || status === "mining";

  async function endorse() {
    setTx(null);
    if (!REPUTON_ADDRESS) return;
    try {
      const res = await write({
        contractAddress: REPUTON_ADDRESS,
        functionName: "add_endorsement",
        args: [addr(target), Math.max(1, Math.min(100, Math.floor(weight))), note.slice(0, 200)],
      });
      setTx(res.evmTxHash);
    } catch {
      /* hook surfaces error */
    }
  }

  if (status === "done" && tx) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-[13px] text-success">
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Endorsement submitted
        </p>
        <p className="mt-1 break-all text-success/80">tx <span className="font-mono">{tx}</span></p>
        <p className="mt-1 text-success/80">Wait 1–5 min for consensus.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-soft">
      <div>
        <p className="font-display text-[14px] font-semibold tracking-tight text-foreground">
          Endorse this wallet
        </p>
        <p className="text-[12.5px] text-accent">
          Signal that you vouch for this wallet&apos;s contributions. Both you and
          the target need an existing Reputon profile.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
        <label className="text-[12px]">
          <span className="block text-accent">Weight (1–100)</span>
          <input
            type="number"
            min={1}
            max={100}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value) || 1)}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[13px]"
          />
        </label>
        <label className="text-[12px]">
          <span className="block text-accent">Note (optional, ≤200 chars)</span>
          <input
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why you vouch for this wallet"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[13px]"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={endorse} disabled={busy || !isConnected || isSelf || !REPUTON_ADDRESS} size="sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {status === "switching"
            ? "Switching…"
            : status === "signing"
            ? "Confirm in wallet…"
            : status === "mining"
            ? "Awaiting consensus…"
            : "Endorse"}
        </Button>
        {!isConnected && <span className="text-[12px] text-accent">Connect a wallet to endorse.</span>}
        {isSelf && <span className="text-[12px] text-accent">You can&apos;t endorse yourself.</span>}
        {error && (
          <span className="inline-flex items-center gap-1 text-[12px] text-error">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
