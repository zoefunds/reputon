import { Container } from "@/components/ui/container";
import { MetricCard } from "@/components/admin/MetricCard";
import { getOverviewMetrics, getJobStatusCounts } from "@/lib/server/admin";
import { onchain } from "@/lib/server/onchain";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
 const [m, jobStatus, contractInfo] = await Promise.all([
 getOverviewMetrics(),
 getJobStatusCounts(),
 fetch(
 `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4001"}/v1/onchain/info`,
 { cache: "no-store" }
 )
 .then((r) => (r.ok ? r.json() : null))
 .catch(() => null),
 ]);
 void onchain; // keep import alive for future expansion

 return (
 <Container className="space-y-8 py-10">
 <div>
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Admin</p>
 <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
 Protocol overview
 </h1>
 </div>

 <section>
 <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
 Identity
 </h2>
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 <MetricCard label="Users" value={m.users} />
 <MetricCard label="Wallets" value={m.wallets} />
 <MetricCard label="Profiles" value={m.profiles} />
 <MetricCard label="NFT credentials" value={m.nfts} />
 </div>
 </section>

 <section>
 <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
 Reputation
 </h2>
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 <MetricCard label="Score updates" value={m.score_updates} />
 <MetricCard label="Evaluations" value={m.evaluations} />
 <MetricCard label="Endorsements" value={m.endorsements} />
 <MetricCard
 label="Sybil flags (active)"
 value={`${m.sybil_flags_active} / ${m.sybil_flags}`}
 tone={m.sybil_flags_active > 0 ? "warning" : "neutral"}
 />
 </div>
 </section>

 <section>
 <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
 Jobs
 </h2>
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 <MetricCard label="Queued" value={jobStatus.queued} tone={jobStatus.queued > 0 ? "warning" : "neutral"} />
 <MetricCard label="Running" value={jobStatus.running} />
 <MetricCard label="Done" value={jobStatus.done} tone="success" />
 <MetricCard label="Failed" value={jobStatus.failed} tone={jobStatus.failed > 0 ? "error" : "neutral"} />
 </div>
 </section>

 <section>
 <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
 API surface
 </h2>
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 <MetricCard
 label="API keys (active)"
 value={`${m.api_keys_active} / ${m.api_keys}`}
 />
 <MetricCard label="Webhooks" value={m.webhooks} />
 <MetricCard label="Webhook deliveries" value={m.webhook_deliveries} />
 <MetricCard label="Total jobs" value={m.jobs} />
 </div>
 </section>

 {contractInfo && (
 <section>
 <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
 On-chain
 </h2>
 <div className="overflow-x-auto rounded-xl border border-border bg-card p-5 shadow-soft">
 <pre className="font-mono text-[12px] text-foreground">
 {JSON.stringify(contractInfo, null, 2)}
 </pre>
 </div>
 </section>
 )}
 </Container>
 );
}
