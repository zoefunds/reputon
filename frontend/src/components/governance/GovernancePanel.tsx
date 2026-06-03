"use client";

import { useEffect, useState } from "react";
import {
 RefreshCcw,
 Vote,
 FileSignature,
 Sparkles,
 Loader2,
 ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Activity = {
 address: string;
 fetchedAt: string;
 votes: {
 id: string;
 choice: number | number[];
 created: number;
 proposal: { id: string; title: string; state: string; space: { id: string; name: string } };
 }[];
 proposals: {
 id: string;
 title: string;
 state: string;
 created: number;
 votes: number;
 scores_total: number;
 space: { id: string; name: string };
 }[];
 daos: {
 dao: string;
 daoName: string;
 votes: number;
 proposalsAuthored: number;
 avgProposalReach: number;
 qualityScore: number;
 lastActiveAt: number;
 }[];
};

export function GovernancePanel({ initialScore }: { initialScore: number | null }) {
 const [activity, setActivity] = useState<Activity | null>(null);
 const [busy, setBusy] = useState(false);
 const [persisting, setPersisting] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [persistedCount, setPersistedCount] = useState<number | null>(null);

 useEffect(() => {
 void load();
 }, []);

 async function load() {
 setBusy(true);
 setError(null);
 try {
 const r = await fetch("/api/me/governance", { cache: "no-store" });
 const b = (await r.json()) as { activity?: Activity; error?: { message?: string } };
 if (!r.ok) throw new Error(b.error?.message ?? "Failed to load");
 setActivity(b.activity ?? null);
 } catch (e) {
 setError(e instanceof Error ? e.message : "Failed to load");
 } finally {
 setBusy(false);
 }
 }

 async function importNow() {
 setPersisting(true);
 setError(null);
 setPersistedCount(null);
 try {
 const r = await fetch("/api/me/governance", { method: "POST" });
 const b = (await r.json()) as {
 activity?: Activity;
 persisted?: number;
 error?: { message?: string };
 };
 if (!r.ok) throw new Error(b.error?.message ?? "Import failed");
 setActivity(b.activity ?? null);
 setPersistedCount(b.persisted ?? 0);
 } catch (e) {
 setError(e instanceof Error ? e.message : "Import failed");
 } finally {
 setPersisting(false);
 }
 }

 const empty =
 activity && activity.votes.length === 0 && activity.proposals.length === 0;
 const baseScore = initialScore ?? 0;

 return (
 <div className="space-y-6">
 <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-soft">
 <div>
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">
 Snapshot.org
 </p>
 <p className="mt-1 text-[14px] text-foreground">
 {activity ? (
 <>
 {activity.votes.length} votes · {activity.proposals.length} proposals ·{" "}
 {activity.daos.length} DAOs
 </>
 ) : busy ? (
 "Loading…"
 ) : (
 "Click Refresh to load"
 )}
 </p>
 {activity && (
 <p className="mt-0.5 text-[12px] text-accent">
 Fetched {new Date(activity.fetchedAt).toLocaleString()}
 </p>
 )}
 </div>
 <div className="flex gap-2">
 <Button variant="outline" size="sm" onClick={load} disabled={busy}>
 {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
 Refresh
 </Button>
 <Button size="sm" onClick={importNow} disabled={persisting}>
 {persisting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
 Import to engine
 </Button>
 </div>
 </div>
 {error && <p className="text-[13px] text-error">{error}</p>}
 {persistedCount !== null && (
 <p className="text-[13px] text-success">
 Imported {persistedCount} record{persistedCount === 1 ? "" : "s"}. These will be
 fed into your next AI evaluation.
 </p>
 )}

 {empty && (
 <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-[13px] text-accent">
 No Snapshot governance activity found for this wallet yet.
 </div>
 )}

 {activity && activity.daos.length > 0 && (
 <section>
 <h2 className="mb-3 font-display text-base font-semibold tracking-tight text-foreground">
 DAOs ({activity.daos.length})
 </h2>
 <div className="overflow-hidden rounded-xl border border-border bg-card">
 <table className="w-full text-sm">
 <thead className="border-b border-border/70 bg-foreground/[0.03] text-left">
 <tr className="text-[11px] uppercase tracking-[0.14em] text-accent">
 <th className="px-4 py-3 font-medium">DAO</th>
 <th className="px-4 py-3 font-medium">Votes</th>
 <th className="px-4 py-3 font-medium">Authored</th>
 <th className="px-4 py-3 font-medium">Avg reach</th>
 <th className="px-4 py-3 font-medium">Quality</th>
 <th className="px-4 py-3 font-medium">Last active</th>
 </tr>
 </thead>
 <tbody>
 {activity.daos.map((d) => (
 <tr key={d.dao} className="border-b border-border/40 last:border-b-0">
 <td className="px-4 py-3">
 <Link
 href={`https://snapshot.org/#/${d.dao}`}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center gap-1 text-foreground hover:underline"
 >
 {d.daoName} <ExternalLink className="h-3 w-3" />
 </Link>
 <p className="text-[11px] font-mono text-accent">{d.dao}</p>
 </td>
 <td className="px-4 py-3 font-mono text-foreground">{d.votes}</td>
 <td className="px-4 py-3 font-mono text-foreground">{d.proposalsAuthored}</td>
 <td className="px-4 py-3 font-mono text-accent">{d.avgProposalReach}</td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <div className="h-1.5 w-20 overflow-hidden rounded-full bg-foreground/[0.06]">
 <div className="h-full bg-primary" style={{ width: `${d.qualityScore}%` }} />
 </div>
 <span className="font-mono text-[12px] text-foreground">
 {d.qualityScore}
 </span>
 </div>
 </td>
 <td className="px-4 py-3 text-[12px] text-accent">
 {d.lastActiveAt
 ? new Date(d.lastActiveAt * 1000).toLocaleDateString()
 : ","}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </section>
 )}

 <section className="grid gap-6 lg:grid-cols-2">
 <Pane title="Recent votes" icon={<Vote className="h-4 w-4" />}>
 {!activity?.votes.length ? (
 <Empty>No votes loaded.</Empty>
 ) : (
 <ul className="divide-y divide-border/60">
 {activity.votes.slice(0, 10).map((v) => (
 <li key={v.id} className="p-3">
 <p className="line-clamp-1 text-[13px] text-foreground">
 {v.proposal.title}
 </p>
 <p className="mt-0.5 text-[11px] text-accent">
 <span className="font-mono">{v.proposal.space.name}</span> ·{" "}
 choice {Array.isArray(v.choice) ? v.choice.join(",") : v.choice} ·{" "}
 {new Date(v.created * 1000).toLocaleDateString()}
 </p>
 </li>
 ))}
 </ul>
 )}
 </Pane>

 <Pane title="Authored proposals" icon={<FileSignature className="h-4 w-4" />}>
 {!activity?.proposals.length ? (
 <Empty>No authored proposals.</Empty>
 ) : (
 <ul className="divide-y divide-border/60">
 {activity.proposals.slice(0, 10).map((p) => (
 <li key={p.id} className="p-3">
 <p className="line-clamp-1 text-[13px] text-foreground">{p.title}</p>
 <p className="mt-0.5 text-[11px] text-accent">
 <span className="font-mono">{p.space.name}</span> · {p.votes} votes ·{" "}
 {new Date(p.created * 1000).toLocaleDateString()}
 </p>
 </li>
 ))}
 </ul>
 )}
 </Pane>
 </section>

 <VoterWeight baseScore={baseScore} activity={activity} />
 </div>
 );
}

function VoterWeight({
 baseScore,
 activity,
}: {
 baseScore: number;
 activity: Activity | null;
}) {
 const [voteValue, setVoteValue] = useState<1 | -1 | 0>(1);

 const totalVotes = activity?.votes.length ?? 0;
 const authored = activity?.proposals.length ?? 0;
 const govBoost = Math.min(200, totalVotes * 2 + authored * 8);
 // Effective weight: base score (0,1000) + governance boost (0,200), clamped.
 const effective = Math.min(1200, baseScore + govBoost);
 const weighted = effective * voteValue;

 return (
 <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
 <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
 Voter-weight calculator
 </h2>
 <p className="mt-1 text-[13px] text-accent">
 How your Reputon score, combined with governance participation, would weight
 a vote on a Reputon-aware DAO.
 </p>
 <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_1fr_1fr] sm:items-end">
 <Stat label="Base score" value={baseScore} />
 <Stat label="Governance boost" value={`+${govBoost}`} hint={`${totalVotes} votes · ${authored} authored`} />
 <Stat label="Effective weight" value={effective} hint="capped at 1200" />
 <div>
 <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
 Vote
 </p>
 <select
 value={String(voteValue)}
 onChange={(e) => setVoteValue(Number(e.target.value) as 1 | -1 | 0)}
 className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-[14px]"
 >
 <option value="1">For (+1)</option>
 <option value="-1">Against (−1)</option>
 <option value="0">Abstain (0)</option>
 </select>
 </div>
 </div>
 <div className="mt-5 rounded-md border border-primary/40 bg-primary/5 p-4 text-foreground">
 Weighted vote ={" "}
 <span className="font-mono text-lg font-semibold">{weighted}</span>
 </div>
 </section>
 );
}

function Stat({
 label,
 value,
 hint,
}: {
 label: string;
 value: number | string;
 hint?: string;
}) {
 return (
 <div>
 <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">{label}</p>
 <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
 {value}
 </p>
 {hint && <p className="text-[11px] text-accent">{hint}</p>}
 </div>
 );
}

function Pane({
 title,
 icon,
 children,
}: {
 title: string;
 icon?: React.ReactNode;
 children: React.ReactNode;
}) {
 return (
 <section className="rounded-xl border border-border bg-card shadow-soft">
 <div className="flex items-center gap-2 border-b border-border/70 p-4">
 {icon}
 <h3 className="font-display text-[14.5px] font-semibold tracking-tight text-foreground">
 {title}
 </h3>
 </div>
 {children}
 </section>
 );
}

function Empty({ children }: { children: React.ReactNode }) {
 return <p className="p-8 text-center text-[13px] text-accent">{children}</p>;
}
