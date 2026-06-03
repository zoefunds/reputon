import { Container } from "@/components/ui/container";
import { getActiveSybilFlags } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
 low: "border-accent bg-foreground/[0.04] text-accent",
 medium: "border-warning/40 bg-warning/10 text-warning",
 high: "border-error/40 bg-error/10 text-error",
 critical: "border-error/40 bg-error/15 text-error",
};

export default async function SybilFlagsPage() {
 const flags = await getActiveSybilFlags(100);
 return (
 <Container className="space-y-6 py-10">
 <div>
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Admin</p>
 <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
 Sybil flags
 </h1>
 <p className="mt-2 text-[14px] text-accent">
 Off-chain mirror of severities raised by the Sybil Oracle contract.
 </p>
 </div>

 <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
 <table className="w-full text-sm">
 <thead className="border-b border-border/70 bg-foreground/[0.03] text-left">
 <tr className="text-[11px] uppercase tracking-[0.14em] text-accent">
 <th className="px-4 py-3">Severity</th>
 <th className="px-4 py-3">Reason</th>
 <th className="px-4 py-3">Profile</th>
 <th className="px-4 py-3">When</th>
 </tr>
 </thead>
 <tbody>
 {flags.length === 0 && (
 <tr>
 <td colSpan={4} className="p-6 text-center text-accent">
 No active sybil flags.
 </td>
 </tr>
 )}
 {flags.map((f) => (
 <tr key={f.id} className="border-b border-border/40 last:border-b-0">
 <td className="px-4 py-3">
 <span
 className={
 "rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] " +
 (TONE[f.severity] ?? TONE.low)
 }
 >
 {f.severity}
 </span>
 </td>
 <td className="px-4 py-3 text-[13px] text-foreground">{f.reason}</td>
 <td className="px-4 py-3 font-mono text-[11px] text-accent">
 {f.profileId.slice(0, 8)}…
 </td>
 <td className="px-4 py-3 text-[11px] text-accent">
 {new Date(f.createdAt).toLocaleString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </section>
 </Container>
 );
}
