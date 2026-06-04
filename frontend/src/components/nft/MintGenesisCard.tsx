"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Sparkles, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGenLayerWrite } from "@/lib/genlayer/useGenLayerWrite";

const NFT_ADDRESS = (process.env.NEXT_PUBLIC_REPUTON_NFT_CONTRACT_ADDRESS ?? "") as `0x${string}`;

export function MintGenesisCard({ hasGenesis }: { hasGenesis: boolean }) {
 const router = useRouter();
 const { isConnected } = useAccount();
 const { write, status, error: writeError } = useGenLayerWrite();
 const [tx, setTx] = useState<string | null>(null);
 const [recordError, setRecordError] = useState<string | null>(null);

 const busy = status === "switching" || status === "signing" || status === "mining";

 async function mint() {
  setTx(null);
  setRecordError(null);
  try {
   const result = await write({
    contractAddress: NFT_ADDRESS,
    functionName: "mint_self",
    args: [
     "Reputon Genesis",                                          // name
     "Early member of the Reputon reputation protocol.",         // description
     "",                                                          // image_uri
     "genesis",                                                   // tier
     "{}",                                                        // metadata_json
    ],
   });
   setTx(result.evmTxHash);
   // Best-effort bookkeeping so the dashboard knows the user kicked off
   // the mint. The credential itself surfaces once consensus reaches it
   // via the on-chain read.
   try {
    await fetch("/api/me/credentials/record-mint", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ tier: "genesis", tx_hash: result.evmTxHash }),
    });
   } catch {
    /* non-fatal */
   }
   router.refresh();
  } catch {
   /* hook already exposes `writeError` */
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

 const errorMsg = recordError ?? writeError;
 const buttonLabel =
  status === "switching" ? "Switching to GenLayer…" :
  status === "signing"   ? "Confirm in wallet…" :
  status === "mining"    ? "Awaiting consensus…" :
                            "Mint Genesis";

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
      Reputon protocol. Free to claim — your only Genesis ever. Signed
      by your own wallet, not the protocol.
     </p>
    </div>
    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-foreground/10 font-display text-2xl font-semibold text-foreground">
     G
    </div>
   </div>
   <div className="mt-6 flex flex-wrap items-center gap-3">
    <Button onClick={mint} disabled={busy || !isConnected || !NFT_ADDRESS}>
     {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
     {buttonLabel}
    </Button>
    {!isConnected && (
     <p className="text-[12px] text-foreground/70">
      Connect a wallet to claim.
     </p>
    )}
    {tx && (
     <p className="break-all text-[12px] text-foreground/80">
      tx <span className="font-mono">{tx}</span> — wait 1–5 min for consensus.
     </p>
    )}
    {errorMsg && (
     <p className="flex items-center gap-1 text-[12px] text-error">
      <AlertTriangle className="h-3 w-3" /> {errorMsg}
     </p>
    )}
   </div>
  </div>
 );
}
