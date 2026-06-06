import { Users } from "lucide-react";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { EndorseSomeoneForm } from "@/components/endorsements/EndorseSomeoneForm";
import { requireUser } from "@/lib/server/user";
import { onchain, type Endorsement } from "@/lib/server/onchain";

export const dynamic = "force-dynamic";

export default async function EndorsementsPage() {
 const user = await requireUser();
 const address = user.primaryWallet?.address;

 const [recvRes, givenRes] = address
 ? await Promise.all([
 onchain.endorsements(address, "received"),
 onchain.endorsements(address, "given"),
 ])
 : [null, null];

 const received = recvRes?.endorsements ?? [];
 const given = givenRes?.endorsements ?? [];

 return (
 <Container className="space-y-8 py-10">
 <div>
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Endorsements</p>
 <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
 Trust, weighted by trust.
 </h1>
 </div>

 {!address ? (
 <EmptyState
 icon={<Users className="h-4 w-4" />}
 title="Link a wallet first"
 body="Endorsements are on-chain pointers between wallets."
 />
 ) : (
 <div className="space-y-6">
 <EndorseSomeoneForm />
 <div className="grid gap-8 lg:grid-cols-2">
 <Panel title="Received" data={received} side="from" />
 <Panel title="Given" data={given} side="to" />
 </div>
 </div>
 )}
 </Container>
 );
}

function Panel({
 title,
 data,
 side,
}: {
 title: string;
 data: Endorsement[];
 side: "from" | "to";
}) {
 return (
 <section className="rounded-xl border border-border bg-card shadow-soft">
 <div className="flex items-center justify-between border-b border-border/60 p-4">
 <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
 {title}
 </h2>
 <span className="font-mono text-[11px] text-accent">{data.length}</span>
 </div>
 {data.length === 0 ? (
 <p className="p-6 text-center text-[13px] text-accent">No endorsements yet.</p>
 ) : (
 <ul className="divide-y divide-border/60">
 {data.map((e) => (
 <li key={e.from + e.to + e.created_at} className="p-4">
 <div className="flex items-center justify-between gap-3">
 <span className="font-mono text-[13px] text-foreground">{short(e[side])}</span>
 <div className="flex items-center gap-2 text-[12px]">
 <span className="rounded border border-border bg-background px-1.5 py-0.5">
 weight {e.weight}
 </span>
 {e.active ? (
 <span className="rounded border border-success/40 bg-success/10 px-1.5 py-0.5 text-success">
 active
 </span>
 ) : (
 <span className="rounded border border-error/40 bg-error/10 px-1.5 py-0.5 text-error">
 revoked
 </span>
 )}
 </div>
 </div>
 {e.note && (
 <p className="mt-2 text-[13px] text-accent">"{e.note}"</p>
 )}
 </li>
 ))}
 </ul>
 )}
 </section>
 );
}

function short(a: string) {
 return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
