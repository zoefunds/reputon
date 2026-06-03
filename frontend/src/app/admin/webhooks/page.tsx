import { Container } from "@/components/ui/container";
import { MetricCard } from "@/components/admin/MetricCard";
import { getWebhookHealth, getRecentDeliveries } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminWebhooks() {
 const [health, deliveries] = await Promise.all([
 getWebhookHealth(),
 getRecentDeliveries(40),
 ]);
 const total = (Number(health.delivered) + Number(health.failed)) || 0;
 const successRate = total > 0 ? Math.round((Number(health.delivered) / total) * 100) : 0;
 return (
 <Container className="space-y-6 py-10">
 <div>
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Admin</p>
 <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
 Webhook health
 </h1>
 </div>

 <div className="grid gap-3 sm:grid-cols-4">
 <MetricCard label="Registered" value={health.hooks.length} />
 <MetricCard label="Delivered" value={health.delivered} tone="success" />
 <MetricCard label="Failed" value={health.failed} tone={Number(health.failed) > 0 ? "warning" : "neutral"} />
 <MetricCard label="Success rate" value={`${successRate}%`} tone={successRate >= 95 ? "success" : "warning"} />
 </div>

 <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
 <table className="w-full text-sm">
 <thead className="border-b border-border/70 bg-foreground/[0.03] text-left">
 <tr className="text-[11px] uppercase tracking-[0.14em] text-accent">
 <th className="px-4 py-3">Event</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3">Attempt</th>
 <th className="px-4 py-3">Webhook</th>
 <th className="px-4 py-3">When</th>
 </tr>
 </thead>
 <tbody>
 {deliveries.length === 0 && (
 <tr>
 <td colSpan={5} className="p-6 text-center text-accent">
 No deliveries yet.
 </td>
 </tr>
 )}
 {deliveries.map((d) => (
 <tr key={d.id} className="border-b border-border/40 last:border-b-0">
 <td className="px-4 py-3 font-mono text-[12px] text-foreground">
 {d.event}
 </td>
 <td className="px-4 py-3">
 <span
 className={
 "rounded border px-1.5 py-0.5 font-mono text-[10px] " +
 (d.statusCode == null
 ? "border-error/40 bg-error/10 text-error"
 : d.statusCode >= 200 && d.statusCode < 300
 ? "border-success/40 bg-success/10 text-success"
 : "border-warning/40 bg-warning/10 text-warning")
 }
 >
 {d.statusCode ?? "ERR"}
 </span>
 </td>
 <td className="px-4 py-3 font-mono text-[12px] text-accent">{d.attempt}</td>
 <td className="px-4 py-3 font-mono text-[11px] text-accent">
 {d.webhookId.slice(0, 8)}…
 </td>
 <td className="px-4 py-3 text-[11px] text-accent">
 {new Date(d.createdAt).toLocaleString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </section>
 </Container>
 );
}
