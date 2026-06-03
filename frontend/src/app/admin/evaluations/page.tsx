import { Container } from "@/components/ui/container";
import { getRecentJobs, getJobStatusCounts } from "@/lib/server/admin";
import { MetricCard } from "@/components/admin/MetricCard";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
 queued: "border-border bg-foreground/[0.04] text-accent",
 running: "border-primary/40 bg-primary/10 text-primary",
 done: "border-success/40 bg-success/10 text-success",
 failed: "border-error/40 bg-error/10 text-error",
};

export default async function AdminEvaluations() {
 const [jobs, status] = await Promise.all([getRecentJobs(50), getJobStatusCounts()]);
 return (
 <Container className="space-y-6 py-10">
 <div>
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Admin</p>
 <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
 Evaluations
 </h1>
 </div>

 <div className="grid gap-3 sm:grid-cols-4">
 <MetricCard label="Queued" value={status.queued} />
 <MetricCard label="Running" value={status.running} />
 <MetricCard label="Done" value={status.done} tone="success" />
 <MetricCard label="Failed" value={status.failed} tone={status.failed > 0 ? "error" : "neutral"} />
 </div>

 <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
 <table className="w-full text-sm">
 <thead className="border-b border-border/70 bg-foreground/[0.03] text-left">
 <tr className="text-[11px] uppercase tracking-[0.14em] text-accent">
 <th className="px-4 py-3">Job</th>
 <th className="px-4 py-3">Address</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3">Attempts</th>
 <th className="px-4 py-3">Tx</th>
 <th className="px-4 py-3">When</th>
 </tr>
 </thead>
 <tbody>
 {jobs.length === 0 && (
 <tr>
 <td colSpan={6} className="p-6 text-center text-accent">
 No evaluations recorded yet.
 </td>
 </tr>
 )}
 {jobs.map((j) => (
 <tr key={j.id} className="border-b border-border/40 last:border-b-0">
 <td className="px-4 py-3 font-mono text-[11px] text-accent">
 {j.id.slice(0, 8)}…
 </td>
 <td className="px-4 py-3 font-mono text-[12px] text-foreground">
 {j.address.slice(0, 10)}…{j.address.slice(-4)}
 </td>
 <td className="px-4 py-3">
 <span
 className={
 "rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] " +
 (STATUS_TONE[j.status] ?? STATUS_TONE.queued)
 }
 >
 {j.status}
 </span>
 </td>
 <td className="px-4 py-3 font-mono text-[12px] text-accent">{j.attempts}</td>
 <td className="px-4 py-3 font-mono text-[11px] text-accent">
 {j.onchainTxHash ? `${j.onchainTxHash.slice(0, 10)}…` : ","}
 </td>
 <td className="px-4 py-3 text-[11px] text-accent">
 {new Date(j.createdAt).toLocaleString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </section>
 </Container>
 );
}
