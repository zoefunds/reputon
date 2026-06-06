"use client";

/**
 * Compact "endorse any wallet from the dashboard" form. Same write path
 * as EndorseButton on a public profile, but takes the target address as
 * a typed input so users don't have to navigate to /profile/0x… first.
 */

import { useState } from "react";
import { useAccount } from "wagmi";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGenLayerWrite } from "@/lib/genlayer/useGenLayerWrite";
import { addr } from "@/lib/genlayer/clientWrite";

const REPUTON_ADDRESS = (process.env.NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS ?? "") as `0x${string}`;
const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export function EndorseSomeoneForm() {
  const { isConnected, address: me } = useAccount();
  const { write, status, error } = useGenLayerWrite();
  const [target, setTarget] = useState("");
  const [weight, setWeight] = useState(50);
  const [note, setNote] = useState("");
  const [tx, setTx] = useState<string | null>(null);

  const targetTrimmed = target.trim();
  const targetValid = ADDR_RE.test(targetTrimmed);
  const isSelf = !!me && targetValid && me.toLowerCase() === targetTrimmed.toLowerCase();
  const busy = status === "switching" || status === "signing" || status === "mining";
  const canSubmit =
    isConnected && targetValid && !isSelf && !busy && !!REPUTON_ADDRESS;

  async function endorse() {
    if (!canSubmit) return;
    setTx(null);
    try {
      const res = await write({
        contractAddress: REPUTON_ADDRESS,
        functionName: "add_endorsement",
        args: [
          addr(targetTrimmed),
          Math.max(1, Math.min(100, Math.floor(weight))),
          note.slice(0, 200),
        ],
      });
      setTx(res.evmTxHash);
    } catch {
      /* hook surfaces error */
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-3">
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
          Endorse a wallet
        </h2>
        <p className="mt-1 text-[12.5px] text-accent">
          Signal that you vouch for another wallet&apos;s contributions. Both
          you and the target need an existing Reputon profile.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-[12px]">
          <span className="block text-accent">Target wallet</span>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0x…"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 font-mono text-[13px]"
            spellCheck={false}
          />
          {targetTrimmed && !targetValid && (
            <span className="mt-0.5 block text-[11px] text-error">
              Must be a 0x-prefixed 20-byte hex address.
            </span>
          )}
        </label>

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
            <span className="block text-accent">Note (optional, ≤200)</span>
            <input
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why you vouch for this wallet"
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[13px]"
            />
          </label>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={endorse} disabled={!canSubmit} size="sm">
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

      {status === "done" && tx && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-success/30 bg-success/5 p-3 text-[12.5px] text-success">
          <CheckCircle2 className="mt-[2px] h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Endorsement submitted.</p>
            <p className="break-all text-success/80">
              tx <span className="font-mono">{tx}</span> — wait 1–5 min for consensus.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
