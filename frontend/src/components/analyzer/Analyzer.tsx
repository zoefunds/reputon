"use client";

import { useEffect, useRef, useState } from "react";
import {
 Loader2,
 CheckCircle2,
 PlayCircle,
 AlertTriangle,
} from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { TrustBadge } from "@/components/dashboard/TrustBadge";
import { useGenLayerWrite } from "@/lib/genlayer/useGenLayerWrite";
import { addr } from "@/lib/genlayer/clientWrite";
import { ConnectorCards } from "./ConnectorCards";

const REPUTON_ADDRESS = (process.env.NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS ?? "") as `0x${string}`;

type Governance = {
 dao: string;
 role: "voter" | "author";
 quality_note?: string;
 proposal_ids?: string[];
};
type Contribution = {
 source: "github" | "content" | "community" | "education" | "protocol";
 title: string;
 url?: string;
 summary?: string;
};

type Bundle = {
 address: string;
 generated_at: string;
 github: { totals?: Record<string, number>; user?: { login: string } | null } | null;
 governance: Governance[];
 contributions: Contribution[];
 endorsements_count: number;
 notes?: string;
};

type Job = {
 id: string;
 status: "queued" | "running" | "done" | "failed";
 address: string;
 onchainTxHash: string | null;
 error: string | null;
 attempts: number;
 createdAt: string;
 updatedAt: string;
};

export function Analyzer() {
 // Signals are sourced server-side from connected accounts + wallet
 // scans. The only freeform inputs left are the analyst's `notes` and
 // an optional informational endorsements count.
 const [endorsementsCount, setEndorsementsCount] = useState(0);
 const [notes, setNotes] = useState("");

 const [bundle, setBundle] = useState<Bundle | null>(null);
 const [previewBusy, setPreviewBusy] = useState(false);
 const [evalBusy, setEvalBusy] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [job, setJob] = useState<Job | null>(null);
 const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

 // User-signed write hook. Evaluate now goes through the connected
 // wallet, not the backend signer.
 const { address: connectedAddress, isConnected } = useAccount();
 const { write: writeOnchain, status: writeStatus, error: writeError } = useGenLayerWrite();

 useEffect(
 () => () => {
 if (pollRef.current) clearInterval(pollRef.current);
 },
 []
 );

 async function preview() {
 setError(null);
 setPreviewBusy(true);
 try {
 const res = await fetch("/api/me/signals/preview", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 endorsements_count: endorsementsCount,
 notes: notes || undefined,
 }),
 });
 const body = (await res.json()) as { bundle?: Bundle; error?: { message?: string } };
 if (!res.ok) throw new Error(body.error?.message ?? "Preview failed");
 setBundle(body.bundle ?? null);
 } catch (e) {
 setError(e instanceof Error ? e.message : "Preview failed");
 } finally {
 setPreviewBusy(false);
 }
 }

 async function runEvaluation() {
 setError(null);
 setEvalBusy(true);
 setJob(null);
 try {
 if (!isConnected || !connectedAddress) {
  throw new Error("Connect a wallet to evaluate.");
 }
 if (!REPUTON_ADDRESS) {
  throw new Error("Reputon contract address not configured.");
 }

 // 1. Ask the backend to assemble + compact the signals bundle and
 //    open a job row. Backend no longer submits on-chain — it just
 //    records the request, waits for the tx hash, then polls the
 //    consensus result.
 const res = await fetch("/api/me/evaluate", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 endorsements_count: endorsementsCount,
 notes: notes || undefined,
 }),
 });
 const body = (await res.json()) as {
 job_id?: string;
 status?: Job["status"];
 bundle?: Bundle;
 signals_json?: string;
 target_address?: string;
 error?: { message?: string };
 };
 if (!res.ok) throw new Error(body.error?.message ?? "Queue failed");
 if (body.bundle) setBundle(body.bundle);

 const target = body.target_address ?? connectedAddress;
 const signalsJson = body.signals_json ?? JSON.stringify(body.bundle ?? {});

 const initial: Job = {
 id: body.job_id ?? "",
 status: body.status ?? "queued",
 address: target,
 onchainTxHash: null,
 error: null,
 attempts: 0,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 };
 setJob(initial);

 // 2. Sign + submit the on-chain evaluate from the user's wallet.
 const result = await writeOnchain({
  contractAddress: REPUTON_ADDRESS,
  functionName: "evaluate_and_update",
  args: [addr(target), signalsJson],
 });

 // 3. Tell the backend about the tx hash so it can watch for finalization
 //    and fan out webhooks once consensus reaches it.
 if (initial.id && result.evmTxHash) {
  try {
   await fetch(`/api/me/evaluate?id=${initial.id}`, {
   method: "PATCH",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ tx_hash: result.evmTxHash }),
   });
  } catch {
   /* non-fatal — the user already has the tx hash visible */
  }
 }

 setJob((j) => (j ? { ...j, onchainTxHash: result.evmTxHash, status: "running" } : j));
 if (initial.id) startPolling(initial.id);
 } catch (e) {
 setError(e instanceof Error ? e.message : writeError ?? "Queue failed");
 } finally {
 setEvalBusy(false);
 }
 }

 function startPolling(id: string) {
 if (pollRef.current) clearInterval(pollRef.current);
 pollRef.current = setInterval(async () => {
 try {
 const r = await fetch(`/api/me/evaluate?id=${id}`, { cache: "no-store" });
 if (!r.ok) return;
 const j = (await r.json()) as Job;
 setJob(j);
 if (j.status === "done" || j.status === "failed") {
 if (pollRef.current) clearInterval(pollRef.current);
 pollRef.current = null;
 }
 } catch {
 /* swallow */
 }
 }, 1500);
 }

 return (
 <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
 <div className="space-y-6">
 {/* Verified sources — every signal in the bundle below is pulled
     server-side from a connected account or a public wallet scan,
     so users can't fake their inputs. */}
 <Card title="Sources" icon={<CheckCircle2 className="h-4 w-4" />}>
 <p className="mb-3 text-[12.5px] text-accent">
  Reputon only scores verified signals — connect each source you
  want included in your bundle.
 </p>
 <ConnectorCards />
 </Card>

 {/* Notes */}
 <Card title="Notes for the engine">
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Any context the LLM should weigh (optional)…"
 rows={3}
 className="block w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-accent/70 focus:border-foreground focus:outline-none"
 />
 <div className="mt-3 flex items-center gap-3">
 <label className="text-[12px] text-accent">Endorsements (informational):</label>
 <input
 type="number"
 min={0}
 value={endorsementsCount}
 onChange={(e) => setEndorsementsCount(Number(e.target.value) || 0)}
 className="w-24 rounded-md border border-border bg-background px-2 py-1 text-[13px]"
 />
 </div>
 </Card>

 <div className="flex flex-wrap items-center gap-3">
 <Button variant="outline" onClick={preview} disabled={previewBusy}>
 {previewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
 Preview bundle
 </Button>
 <Button onClick={runEvaluation} disabled={evalBusy || !isConnected}>
 {evalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
 {writeStatus === "switching"
  ? "Switching to GenLayer…"
  : writeStatus === "signing"
  ? "Confirm in wallet…"
  : writeStatus === "mining"
  ? "Awaiting consensus…"
  : "Run evaluation"}
 </Button>
 {!isConnected && (
  <p className="text-[12px] text-accent">
   Connect a wallet to evaluate.
  </p>
 )}
 {error && (
 <p className="flex items-center gap-1 text-[13px] text-error">
 <AlertTriangle className="h-3.5 w-3.5" /> {error}
 </p>
 )}
 </div>
 </div>

 <aside className="space-y-6">
 <Card title="Signal bundle">
 {bundle ? (
 <>
 <p className="text-[12px] text-accent">
 Generated{" "}
 {new Date(bundle.generated_at).toLocaleString()} · wallet{" "}
 <span className="font-mono">
 {bundle.address.slice(0, 8)}…{bundle.address.slice(-4)}
 </span>
 </p>
 <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-[11.5px] leading-relaxed text-foreground">
 {JSON.stringify(bundle, null, 2)}
 </pre>
 </>
 ) : (
 <p className="text-[13px] text-accent">
 Click <span className="font-medium">Preview bundle</span> to see what
 we'd send to the contract.
 </p>
 )}
 </Card>

 <Card title="Evaluation status">
 {!job ? (
 <p className="text-[13px] text-accent">
 No evaluation queued yet.
 </p>
 ) : (
 <div className="space-y-3">
 <div className="flex flex-wrap items-center gap-2 text-[12px]">
 <StatusBadge status={job.status} />
 <span className="font-mono text-accent">{short(job.id)}</span>
 </div>
 {job.onchainTxHash && (
 <p className="break-all text-[12px] text-accent">
 tx <span className="font-mono text-foreground">{job.onchainTxHash}</span>
 </p>
 )}
 {job.error && (
 <p className="text-[12.5px] text-error">{job.error}</p>
 )}
 {job.status === "done" && (
 <div className="space-y-1.5">
 <p className="flex items-start gap-1.5 text-[13px] text-success">
 <CheckCircle2 className="mt-[1px] h-4 w-4 shrink-0" />
 <span>
 Transaction submitted to GenLayer.{" "}
 <span className="text-foreground">Wait for the consensus result</span>
 {" "}— finalization typically takes 1–5 minutes.
 </span>
 </p>
 <p className="pl-[22px] text-[12px] text-accent">
 Your score won&apos;t appear on the{" "}
 <a className="underline underline-offset-4 hover:text-foreground" href="/dashboard">dashboard</a>
 {" "}until validators finish reaching consensus. No action needed — refresh once that finishes.
 </p>
 </div>
 )}
 <p className="text-[11px] text-accent">
 Attempts: {job.attempts}. Last update{" "}
 {new Date(job.updatedAt).toLocaleString()}.
 </p>
 </div>
 )}
 </Card>
 </aside>
 </div>
 );
}

function Card({
 title,
 icon,
 action,
 children,
}: {
 title: string;
 icon?: React.ReactNode;
 action?: React.ReactNode;
 children: React.ReactNode;
}) {
 return (
 <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
 <div className="mb-4 flex items-center justify-between">
 <div className="flex items-center gap-2">
 {icon && <span className="text-foreground">{icon}</span>}
 <h3 className="font-display text-[14.5px] font-semibold tracking-tight text-foreground">
 {title}
 </h3>
 </div>
 {action}
 </div>
 {children}
 </section>
 );
}

function StatusBadge({ status }: { status: Job["status"] }) {
 if (status === "queued") return <TrustBadge category="emerging" />;
 if (status === "running") return <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">running</span>;
 if (status === "done") return <TrustBadge category="eminent" />;
 return (
 <span className="rounded-full border border-error/40 bg-error/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-error">
 failed
 </span>
 );
}

function short(s: string) {
 return s ? `${s.slice(0, 6)}…${s.slice(-4)}` : ",";
}
