import Link from "next/link";
import { Wallet, Sparkles, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ScoreCard } from "@/components/dashboard/ScoreCard";
import { BreakdownGrid } from "@/components/dashboard/BreakdownGrid";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { WalletLinker } from "@/components/dashboard/WalletLinker";
import { TrustBadge } from "@/components/dashboard/TrustBadge";
import { requireUser } from "@/lib/server/user";
import { onchain } from "@/lib/server/onchain";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
 const user = await requireUser();
 const address = user.primaryWallet?.address ?? null;

 const [score, history, endorsementsRes, sybil] = await Promise.all([
 address ? onchain.score(address) : Promise.resolve(null),
 address ? onchain.history(address, 30) : Promise.resolve(null),
 address ? onchain.endorsements(address, "received") : Promise.resolve(null),
 address ? onchain.sybilSeverity(address) : Promise.resolve(null),
 ]);

 const latest = history?.history?.[0] ?? null;
 const endorsements = endorsementsRes?.endorsements ?? [];

 return (
 <Container className="space-y-8 py-10">
 <header className="flex flex-wrap items-end justify-between gap-3">
 <div>
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">
 Welcome back
 </p>
 <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
 {user.name ?? "Reputon user"}
 </h1>
 </div>
 <div className="flex gap-2">
 <Button asChild variant="outline" size="sm">
 <Link href="/dashboard/history">View history</Link>
 </Button>
 <Button asChild size="sm">
 <Link href="/dashboard/analyzer">
 Run evaluation <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 </div>
 </header>

 {!address ? (
 <EmptyState
 icon={<Wallet className="h-4 w-4" />}
 title="Link a wallet to get started"
 body="Reputation lives on-chain, so we need a wallet to attach yours to. Sign a no-cost SIWE message to link any EVM wallet."
 action={<WalletLinker />}
 />
 ) : (
 <>
 <ScoreCard
 score={score}
 address={address}
 sybilSeverity={sybil?.severity ?? ""}
 />

 <BreakdownGrid breakdown={latest?.breakdown ?? null} />

 <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
 <div className="space-y-3">
 <div className="flex items-end justify-between">
 <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
 Trend
 </h2>
 <Link
 href="/dashboard/history"
 className="text-[12px] text-accent hover:text-foreground"
 >
 See all →
 </Link>
 </div>
 <TrendChart history={history?.history ?? []} />
 </div>

 <div className="space-y-3">
 <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
 Latest evaluation
 </h2>
 {latest ? (
 <div className="rounded-xl border border-border bg-card p-5">
 <div className="flex items-center gap-2">
 <Sparkles className="h-4 w-4 text-foreground" />
 <span className="text-[12px] text-accent">
 {new Date(latest.created_at * 1000).toLocaleString()}
 </span>
 </div>
 <p className="mt-3 text-[13.5px] leading-relaxed text-foreground">
 {latest.explanation || ","}
 </p>
 <div className="mt-4 flex items-center gap-2 text-[12px] text-accent">
 Δ
 <span
 className={
 latest.delta >= 0 ? "text-success" : "text-error"
 }
 >
 {latest.delta >= 0 ? "+" : ""}
 {latest.delta}
 </span>
 · score {latest.score} · <TrustBadge category={latest.category} />
 </div>
 </div>
 ) : (
 <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-accent">
 No evaluations yet.
 </div>
 )}

 <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
 Endorsements
 </h2>
 {endorsements.length === 0 ? (
 <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-accent">
 Nobody has endorsed you yet.
 </div>
 ) : (
 <ul className="divide-y divide-border/60 rounded-xl border border-border bg-card">
 {endorsements.slice(0, 4).map((e) => (
 <li key={e.from + e.to} className="flex items-center justify-between p-3 text-[13px]">
 <span className="font-mono">{short(e.from)}</span>
 <span className="text-accent">weight {e.weight}</span>
 </li>
 ))}
 </ul>
 )}
 </div>
 </section>
 </>
 )}
 </Container>
 );
}

function short(a: string) {
 return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
