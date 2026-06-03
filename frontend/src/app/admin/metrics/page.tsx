import { Container } from "@/components/ui/container";
import { MetricCard } from "@/components/admin/MetricCard";
import { getScoreDistribution, getOverviewMetrics } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
 unverified: "bg-accent",
 emerging: "bg-warning",
 trusted: "bg-primary",
 eminent: "bg-success",
};

export default async function MetricsPage() {
 const [dist, m] = await Promise.all([
 getScoreDistribution(),
 getOverviewMetrics(),
 ]);
 const total = dist.reduce((s, b) => s + b.count, 0) || 1;
 const max = Math.max(...dist.map((d) => d.count), 1);

 return (
 <Container className="space-y-8 py-10">
 <div>
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Admin</p>
 <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
 Score distribution
 </h1>
 <p className="mt-2 text-[14px] text-accent">
 Profiles bucketed by the contract's trust-category thresholds.
 </p>
 </div>

 <section className="grid gap-3 sm:grid-cols-4">
 {dist.map((d) => (
 <MetricCard
 key={d.bucket}
 label={d.bucket}
 value={d.count}
 hint={`${Math.round((d.count / total) * 100)}% of profiles`}
 />
 ))}
 </section>

 <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
 <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
 Histogram
 </h2>
 <div className="mt-6 flex h-56 items-end gap-6">
 {dist.map((d) => (
 <div key={d.bucket} className="flex flex-1 flex-col items-center gap-2">
 <div className="flex h-full w-full flex-col justify-end">
 <div
 className={"w-full rounded-t-md " + (TONE[d.bucket] ?? "bg-accent")}
 style={{ height: `${(d.count / max) * 100}%`, minHeight: 4 }}
 title={`${d.count}`}
 />
 </div>
 <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
 {d.bucket}
 </p>
 <p className="font-display text-[13px] font-semibold text-foreground">
 {d.count}
 </p>
 </div>
 ))}
 </div>
 </section>

 <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
 <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
 Protocol totals
 </h2>
 <dl className="mt-4 grid grid-cols-1 gap-y-2 sm:grid-cols-2">
 {Object.entries(m).map(([k, v]) => (
 <div key={k} className="flex items-center justify-between border-b border-border/40 py-1.5 text-[13px]">
 <dt className="font-mono uppercase tracking-[0.14em] text-accent">{k}</dt>
 <dd className="font-display font-semibold text-foreground">{v}</dd>
 </div>
 ))}
 </dl>
 </section>
 </Container>
 );
}
