import type { Metadata } from "next";
import { ArrowRight, Cpu, Database, Sigma, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
 title: "Reputation Engine",
 description:
 "Inside the Reputon engine: how Genlayer Intelligent Contracts and LLM equivalence checks turn raw wallet activity into a verifiable, portable score.",
};

const INPUTS = [
 { label: "Wallet activity", body: "Transactions, protocol usage, age, cross-chain footprint." },
 { label: "Governance", body: "Votes cast, proposals authored, quorum participation, decision impact." },
 { label: "Contributions", body: "GitHub work, content, education, community participation." },
 { label: "Endorsements", body: "Vouches from already-reputable wallets, weighted by their score." },
 { label: "Historical behavior", body: "Long-tail patterns: consistency, recency, distribution of activity." },
];

const OUTPUTS = [
 { label: "Reputation score", body: "0,1000. Bounded, signed by the contract, written on-chain." },
 { label: "Confidence score", body: "How certain the engine is , exposes the AI's uncertainty honestly." },
 { label: "Trust category", body: "From `unverified` to `eminent`. Useful for gating decisions in dApps." },
 { label: "AI explanation", body: "Natural-language rationale attached to every score update." },
];

export default function EnginePage() {
 return (
 <>
 <PageHeader
 kicker="The engine"
 title="How a wallet becomes a reputation."
 description="Reputon's reputation engine runs inside a Genlayer Intelligent Contract. LLM equivalence checks turn messy real-world signals into a single, verifiable score , without ever leaving the chain."
 />

 <Section>
 <div className="grid gap-10 lg:grid-cols-3">
 {[
 {
 icon: Database,
 kicker: "Stage 1",
 title: "Ingest",
 body: "The contract collects on-chain history, governance participation, off-chain proofs (signed), and any endorsements pointed at this wallet.",
 },
 {
 icon: Cpu,
 kicker: "Stage 2",
 title: "Evaluate",
 body: "Multiple LLM calls grade contributions, sniff sybil patterns and verify endorsements. The equivalence principle keeps outputs deterministic across validators.",
 },
 {
 icon: Sigma,
 kicker: "Stage 3",
 title: "Score & explain",
 body: "Subscores roll into a single number, with a confidence value and human-readable explanation written alongside it on-chain.",
 },
 ].map(({ icon: Icon, kicker, title, body }) => (
 <div
 key={title}
 className="rounded-xl border border-border bg-card p-7 shadow-soft"
 >
 <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground">
 <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
 </div>
 <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
 {kicker}
 </p>
 <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground">
 {title}
 </h3>
 <p className="mt-2 text-[14px] leading-relaxed text-accent">
 {body}
 </p>
 </div>
 ))}
 </div>
 </Section>

 <Section bordered>
 <div className="grid gap-14 lg:grid-cols-2">
 <div>
 <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
 Inputs
 </p>
 <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
 Signals the engine consumes.
 </h2>
 <ul className="mt-8 divide-y divide-border/70 border-y border-border/70">
 {INPUTS.map((i) => (
 <li key={i.label} className="grid grid-cols-[180px_1fr] gap-6 py-4">
 <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-foreground">
 {i.label}
 </span>
 <span className="text-[14px] leading-relaxed text-accent">
 {i.body}
 </span>
 </li>
 ))}
 </ul>
 </div>
 <div>
 <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
 Outputs
 </p>
 <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
 What ends up on-chain.
 </h2>
 <ul className="mt-8 divide-y divide-border/70 border-y border-border/70">
 {OUTPUTS.map((o) => (
 <li key={o.label} className="grid grid-cols-[180px_1fr] gap-6 py-4">
 <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-foreground">
 {o.label}
 </span>
 <span className="text-[14px] leading-relaxed text-accent">
 {o.body}
 </span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 </Section>

 <Section bordered>
 <div className="rounded-2xl border border-border bg-card p-8 shadow-soft sm:p-12">
 <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
 <div className="max-w-2xl">
 <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[12px] text-accent">
 <Sparkles className="h-3.5 w-3.5 text-foreground" />
 <span>Genlayer Intelligent Contracts</span>
 </div>
 <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
 LLM calls that are deterministic enough to trust on-chain.
 </h2>
 <p className="mt-3 text-[15px] leading-relaxed text-accent">
 Reputon leans on Genlayer's equivalence principle , every
 validator re-runs the LLM call and votes on whether outputs
 agree. That makes AI-derived scores safe to commit on-chain.
 </p>
 </div>
 <Button asChild size="lg">
 <Link href="/docs">
 Read the contract spec
 <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 </div>
 </div>
 </Section>
 </>
 );
}
