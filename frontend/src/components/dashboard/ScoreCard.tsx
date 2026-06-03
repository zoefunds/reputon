import { ShieldCheck } from "lucide-react";
import { TrustBadge } from "./TrustBadge";
import type { Score } from "@/lib/server/onchain";

export function ScoreCard({
 score,
 address,
 sybilSeverity,
}: {
 score: Score | null;
 address?: string | null;
 sybilSeverity?: string | null;
}) {
 if (!score) {
 return (
 <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Reputation</p>
 <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
 No score
 </h2>
 <p className="mt-2 text-sm text-accent">
 No on-chain profile yet for{" "}
 <span className="font-mono text-foreground">
 {address ? short(address) : "this wallet"}
 </span>
 . Register and run an evaluation to see your score.
 </p>
 </div>
 );
 }

 const pct = Math.round((score.score / 1000) * 100);
 const confPct = Math.round((score.confidence / 1000) * 100);
 const ring = `conic-gradient(hsl(var(--primary)) ${pct * 3.6}deg, hsl(var(--border)) 0deg)`;

 return (
 <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
 <div className="flex items-start justify-between gap-6">
 <div>
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">
 Reputation score
 </p>
 <div className="mt-3 flex items-baseline gap-2">
 <h2 className="font-display text-5xl font-semibold tracking-tightest text-foreground">
 {score.score}
 </h2>
 <span className="font-mono text-sm text-accent">/ 1000</span>
 </div>
 <div className="mt-3 flex flex-wrap items-center gap-2">
 <TrustBadge category={score.category} />
 <span className="text-[12px] text-accent">
 Confidence {confPct}%
 </span>
 {sybilSeverity && sybilSeverity !== "" && (
 <span className="inline-flex items-center gap-1 rounded-full border border-error/40 bg-error/10 px-2 py-0.5 text-[11px] text-error">
 <ShieldCheck className="h-3 w-3" />
 Sybil flag: {sybilSeverity}
 </span>
 )}
 </div>
 <p className="mt-4 max-w-md text-[13px] text-accent">
 Wallet{" "}
 <span className="font-mono text-foreground">
 {address ? short(address) : ""}
 </span>
 . Last evaluated{" "}
 {score.last_evaluated_at
 ? new Date(score.last_evaluated_at * 1000).toLocaleString()
 : "never"}
 .
 </p>
 </div>

 <div
 aria-hidden
 className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
 style={{ background: ring }}
 >
 <div className="grid h-[7.25rem] w-[7.25rem] place-items-center rounded-full bg-card">
 <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
 {pct}%
 </span>
 </div>
 </div>
 </div>
 </div>
 );
}

function short(addr: string) {
 return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
