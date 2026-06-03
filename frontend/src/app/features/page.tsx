import type { Metadata } from "next";
import {
 Activity,
 BrainCircuit,
 ShieldCheck,
 Vote,
 Award,
 Code2,
 History,
 Users,
 LineChart,
 KeyRound,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";

export const metadata: Metadata = {
 title: "Features",
 description:
 "Every primitive Reputon ships: dynamic scoring, AI evaluation, NFT credentials, sybil resistance, governance reputation and a REST API.",
};

const GROUPS = [
 {
 kicker: "Reputation",
 title: "A score that actually reflects behavior",
 items: [
 {
 icon: Activity,
 title: "Dynamic scoring",
 body: "Scores recompute on every meaningful action , wallet activity, governance, contributions, endorsements , never stale, never derived from a snapshot.",
 },
 {
 icon: LineChart,
 title: "Reputation breakdown",
 body: "Every score decomposes into category subscores (activity, governance, contribution, trust) so users see exactly why they're rated.",
 },
 {
 icon: History,
 title: "Full history",
 body: "Every score update is written on-chain with the AI evaluation that produced it. Reversible, auditable, queryable.",
 },
 ],
 },
 {
 kicker: "AI",
 title: "Genlayer LLMs grade real work",
 items: [
 {
 icon: BrainCircuit,
 title: "Contribution analysis",
 body: "Pull requests, proposals, content and protocol activity are evaluated by LLMs running inside the contract , with explanations attached.",
 },
 {
 icon: ShieldCheck,
 title: "Sybil resistance",
 body: "An LLM-backed oracle inspects wallet clusters, timing patterns and endorsement graphs to flag farming and bot rings.",
 },
 {
 icon: Vote,
 title: "Governance reputation",
 body: "Votes, proposal quality and decision impact across DAOs all roll into one reputable-actor signal you can gate on.",
 },
 ],
 },
 {
 kicker: "Identity",
 title: "Credentials wallets can carry",
 items: [
 {
 icon: Award,
 title: "Reputation NFTs",
 body: "Mint portable proofs of milestones and achievements. Ownable, transferable, and readable by any dApp.",
 },
 {
 icon: Users,
 title: "Endorsements",
 body: "Reputable users vouch for others. Endorsements compound trust, but only when the endorser is themselves trusted.",
 },
 {
 icon: KeyRound,
 title: "Universal profile",
 body: "One canonical profile per wallet, queryable from any chain or dApp via a single API call.",
 },
 ],
 },
 {
 kicker: "Integration",
 title: "Drop-in for any protocol",
 items: [
 {
 icon: Code2,
 title: "REST API & webhooks",
 body: "Six endpoints cover everything: profile, score, history, endorsements, evaluate, verify. Plus outbound webhooks on score changes.",
 },
 ],
 },
] as const;

export default function FeaturesPage() {
 return (
 <>
 <PageHeader
 kicker="Features"
 title="Everything you need to ship trust-aware Web3."
 description="Reputon bundles scoring, AI evaluation, credentials, sybil resistance and an API into one composable layer. No reinventing the wheel per protocol."
 />

 {GROUPS.map((g, gi) => (
 <Section key={g.title} bordered={gi > 0}>
 <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
 <div>
 <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
 {g.kicker}
 </p>
 <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
 {g.title}
 </h2>
 </div>
 <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border/70 sm:grid-cols-2">
 {g.items.map(({ icon: Icon, title, body }) => (
 <div key={title} className="bg-background p-6">
 <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground">
 <Icon className="h-[16px] w-[16px]" strokeWidth={1.6} />
 </div>
 <h3 className="mt-4 font-display text-[15px] font-semibold tracking-tight text-foreground">
 {title}
 </h3>
 <p className="mt-2 text-[13.5px] leading-relaxed text-accent">
 {body}
 </p>
 </div>
 ))}
 </div>
 </div>
 </Section>
 ))}
 </>
 );
}
