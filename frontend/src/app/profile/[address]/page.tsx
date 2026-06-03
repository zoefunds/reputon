import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Award, ExternalLink, ShieldCheck, History } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ScoreCard } from "@/components/dashboard/ScoreCard";
import { BreakdownGrid } from "@/components/dashboard/BreakdownGrid";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { TrustBadge } from "@/components/dashboard/TrustBadge";
import { onchain } from "@/lib/server/onchain";

export const revalidate = 30;

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const { address } = await params;
 const profile = await onchain.profile(address);
 const title = profile
 ? `${profile.display_name || short(address)} · Reputon`
 : `${short(address)} · Reputon`;
 const description = profile
 ? `Reputon score ${profile.score}/1000 · ${profile.category} · ${profile.bio || "On-chain reputation profile."}`
 : "Reputon , on-chain reputation profile.";
 return {
 title,
 description,
 openGraph: { title, description },
 twitter: { card: "summary_large_image", title, description },
 };
}

export default async function PublicProfile({ params }: Props) {
 const { address } = await params;
 if (!address.startsWith("0x") || address.length < 10) notFound();

 const [profile, score, history, recvRes, credRes, sybil] = await Promise.all([
 onchain.profile(address),
 onchain.score(address),
 onchain.history(address, 30),
 onchain.endorsements(address, "received"),
 onchain.credentialsOf(address),
 onchain.sybilSeverity(address),
 ]);

 const latest = history?.history?.[0] ?? null;
 const credentials = credRes?.credentials ?? [];
 const endorsements = recvRes?.endorsements ?? [];

 if (!score) {
 return (
 <Container className="py-20 text-center">
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Profile</p>
 <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
 No on-chain profile
 </h1>
 <p className="mt-3 text-accent">
 <span className="font-mono">{short(address)}</span> hasn't been registered or
 evaluated on Reputon yet.
 </p>
 <div className="mt-6 flex justify-center gap-2">
 <Button asChild>
 <Link href="/dashboard">Open the app</Link>
 </Button>
 <Button asChild variant="outline">
 <Link href="/docs">API docs</Link>
 </Button>
 </div>
 </Container>
 );
 }

 return (
 <Container className="space-y-8 py-10">
 <header className="flex flex-wrap items-end justify-between gap-3">
 <div>
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Public profile</p>
 <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
 {profile?.display_name || short(address)}
 </h1>
 <p className="mt-1 font-mono text-[12px] text-accent">{address}</p>
 {profile?.bio && (
 <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-foreground/80">
 {profile.bio}
 </p>
 )}
 </div>
 <div className="flex gap-2">
 <Button asChild variant="outline" size="sm">
 <Link href={`/docs#api`}>
 <ExternalLink className="h-4 w-4" />
 Query via API
 </Link>
 </Button>
 </div>
 </header>

 <ScoreCard score={score} address={address} sybilSeverity={sybil?.severity ?? ""} />

 <BreakdownGrid breakdown={latest?.breakdown ?? null} />

 <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
 <div className="space-y-3">
 <div className="flex items-center gap-2">
 <History className="h-4 w-4 text-foreground" />
 <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
 Trend
 </h2>
 </div>
 <TrendChart history={history?.history ?? []} />
 </div>
 <div className="space-y-3">
 <div className="flex items-center gap-2">
 <ShieldCheck className="h-4 w-4 text-foreground" />
 <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
 Latest evaluation
 </h2>
 </div>
 {latest ? (
 <div className="rounded-xl border border-border bg-card p-5">
 <p className="text-[12px] text-accent">
 {new Date(latest.created_at * 1000).toLocaleString()}
 </p>
 <p className="mt-2 text-[13.5px] leading-relaxed text-foreground">
 {latest.explanation || ","}
 </p>
 <div className="mt-3 flex items-center gap-2 text-[12px]">
 Score {latest.score} · <TrustBadge category={latest.category} />
 </div>
 </div>
 ) : (
 <p className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-accent">
 No evaluations yet.
 </p>
 )}
 </div>
 </section>

 <section className="grid gap-6 lg:grid-cols-2">
 <div>
 <div className="mb-3 flex items-center gap-2">
 <Award className="h-4 w-4 text-foreground" />
 <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
 Credentials ({credentials.length})
 </h2>
 </div>
 {credentials.length === 0 ? (
 <p className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-accent">
 No credentials yet.
 </p>
 ) : (
 <ul className="grid gap-3 sm:grid-cols-2">
 {credentials.slice(0, 6).map((c) => (
 <li key={c.token_id} className="rounded-xl border border-border bg-card p-4">
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
 #{c.token_id} · {c.tier}
 </p>
 <p className="mt-1 font-display text-[14px] font-semibold tracking-tight text-foreground">
 {c.name}
 </p>
 {c.description && (
 <p className="mt-1 text-[12.5px] text-accent">{c.description}</p>
 )}
 </li>
 ))}
 </ul>
 )}
 </div>
 <div>
 <h2 className="mb-3 font-display text-base font-semibold tracking-tight text-foreground">
 Received endorsements ({endorsements.length})
 </h2>
 {endorsements.length === 0 ? (
 <p className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-accent">
 No endorsements yet.
 </p>
 ) : (
 <ul className="divide-y divide-border/60 rounded-xl border border-border bg-card">
 {endorsements.slice(0, 6).map((e) => (
 <li key={e.from + e.created_at} className="flex items-center justify-between p-3 text-[13px]">
 <span className="font-mono">{short(e.from)}</span>
 <span className="text-accent">weight {e.weight}</span>
 </li>
 ))}
 </ul>
 )}
 </div>
 </section>
 </Container>
 );
}

function short(a: string) {
 return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
