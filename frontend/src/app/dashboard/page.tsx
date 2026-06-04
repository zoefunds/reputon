import Link from "next/link";
import {
  Share2,
  UserCog,
  Wallet,
  Clock,
  Zap,
  Fingerprint,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { WalletLinker } from "@/components/dashboard/WalletLinker";
import { requireUser } from "@/lib/server/user";
import { onchain } from "@/lib/server/onchain";

export const dynamic = "force-dynamic";

const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG"];

function trustLabel(category?: string | null) {
  switch (category) {
    case "eminent":
      return "High Trust";
    case "trusted":
      return "Trusted";
    case "emerging":
      return "Emerging";
    case "unverified":
      return "Unverified";
    default:
      return "—";
  }
}

function shortId(address: string) {
  return `${address.slice(0, 4).toUpperCase()}${"...".padStart(3, ".")}${address
    .slice(-4)
    .toUpperCase()}`;
}

export default async function DashboardOverview() {
  const user = await requireUser();
  const address = user.primaryWallet?.address ?? null;

  const [score, history, endorsementsRes, sybil] = await Promise.all([
    address ? onchain.score(address) : Promise.resolve(null),
    address ? onchain.history(address, 30) : Promise.resolve(null),
    address ? onchain.endorsements(address, "received") : Promise.resolve(null),
    address ? onchain.sybilSeverity(address) : Promise.resolve(null),
  ]);
  void endorsementsRes;

  const latest = history?.history?.[0] ?? null;
  const entries = history?.history ?? [];
  const realScore = score?.score ?? null;
  const bars: number[] | null =
    entries.length > 0 ? buildMonthlyBars(entries.map((e) => e.score)) : null;

  const display = user.name ?? "there";
  const displayName = display === "there" ? "there" : display.split(" ")[0];

  return (
    <Container className="space-y-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            user_id: {address ? shortId(address) : "not linked"}
          </p>
          <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1.05] tracking-tightest text-foreground sm:text-[48px]">
            Welcome back, {displayName}.
          </h1>
          <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-accent">
            {realScore != null
              ? "Your reputation is evolving on-chain."
              : "Register a profile and run your first evaluation to start building your portable reputation."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {address && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/profile/${address}`}>
                <Share2 className="h-4 w-4" />
                Share profile
              </Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/dashboard/settings">
              <UserCog className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </header>

      {!address ? (
        <EmptyState
          icon={<Wallet className="h-4 w-4" />}
          title="Link a wallet to get started"
          body="Reputation lives on-chain, so we need a wallet to attach yours to. Sign a no-cost SIWE message to link any EVM wallet."
          action={<WalletLinker />}
        />
      ) : (
        <>
          {/* Score + side stats */}
          <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
            <div className="relative overflow-hidden rounded-2xl border-l-2 border-foreground bg-card p-7 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                    Reputon score
                  </p>
                  <div className="mt-3 flex items-end gap-3">
                    <span className="font-display text-[64px] font-semibold leading-none tracking-tightest text-foreground">
                      {realScore ?? "—"}
                    </span>
                    {latest && latest.delta !== 0 && (
                      <span
                        className={
                          "mb-2 inline-flex h-6 items-center rounded-full px-2 font-mono text-[10px] uppercase tracking-[0.14em] " +
                          (latest.delta > 0
                            ? "bg-success/15 text-success"
                            : "bg-error/15 text-error")
                        }
                      >
                        {latest.delta > 0 ? "+" : ""}
                        {latest.delta} last eval
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                    Trust level
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
                    {trustLabel(score?.category)}
                  </p>
                </div>
              </div>

              {bars ? (
                <div className="mt-8 h-44 w-full">
                  <div className="flex h-full items-end gap-3">
                    {bars.map((v, i) => {
                      const max = Math.max(...bars, 1);
                      const h = Math.max(8, (v / max) * 100);
                      const tone = `hsl(220 19% ${Math.max(
                        18,
                        80 - (i / Math.max(1, bars.length - 1)) * 60
                      )}%)`;
                      return (
                        <div key={i} className="flex flex-1 flex-col items-center gap-2">
                          <div
                            className="w-full rounded-sm transition-all"
                            style={{ height: `${h}%`, background: tone }}
                            title={`${MONTH_LABELS[i] ?? ""}: ${v}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    {bars.map((_, i) => (
                      <span
                        key={i}
                        className="flex-1 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-accent"
                      >
                        {MONTH_LABELS[i] ?? `M${i + 1}`}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-10 rounded-md border border-dashed border-border bg-background p-6 text-center text-[13px] text-accent">
                  No score history yet. Once your first AI evaluation runs, the
                  timeline will populate here.
                </p>
              )}
            </div>

            <div className="grid gap-4">
              <SideStat
                icon={<Clock className="h-3.5 w-3.5" />}
                label="On-chain age"
                value={
                  user.primaryWallet?.linkedAt
                    ? formatYearsSinceIso(user.primaryWallet.linkedAt)
                    : "—"
                }
              />
              <SideStat
                icon={<Zap className="h-3.5 w-3.5" />}
                label="Evaluations"
                value={
                  (score && "evaluations" in score
                    ? (score as { evaluations?: number }).evaluations
                    : null) ?? entries.length
                }
              />
              <SideStat
                icon={<Fingerprint className="h-3.5 w-3.5" />}
                label="Sybil severity"
                value={
                  <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
                    {sybil?.severity || "none"}
                  </span>
                }
              />
            </div>
          </section>

          {/* Breakdown + recent activity */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Score Breakdown
              </h2>
              {latest?.breakdown ? (
                <div className="mt-6 space-y-6">
                  <ProgressRow
                    n="01"
                    label="Activity"
                    value={latest.breakdown.activity ?? 0}
                    max={250}
                  />
                  <ProgressRow
                    n="02"
                    label="Governance"
                    value={latest.breakdown.governance ?? 0}
                    max={250}
                  />
                  <ProgressRow
                    n="03"
                    label="Contribution"
                    value={latest.breakdown.contribution ?? 0}
                    max={250}
                  />
                  <ProgressRow
                    n="04"
                    label="Trust"
                    value={latest.breakdown.trust ?? 0}
                    max={250}
                  />
                </div>
              ) : (
                <p className="mt-6 rounded-md border border-dashed border-border bg-background p-6 text-center text-[13px] text-accent">
                  No breakdown yet. Your next evaluation will populate per-category
                  scores here.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-primary p-7 text-primary-foreground shadow-soft">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Recent Activity
              </h2>
              {entries.length > 0 ? (
                <>
                  <ul className="mt-6 divide-y divide-primary-foreground/10">
                    {entries.slice(0, 4).map((e, i) => (
                      <li key={i} className="grid grid-cols-[1fr_auto] gap-3 py-3">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary-foreground/60">
                            {e.reason || "score update"}
                          </p>
                          <p className="mt-1 line-clamp-1 text-[13.5px] text-primary-foreground">
                            {e.explanation ?? "On-chain evaluation"}
                          </p>
                        </div>
                        <p className="self-start font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60">
                          {e.created_at ? formatAgo(e.created_at) : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/dashboard/history"
                    className="mt-5 block rounded-md border border-primary-foreground/30 px-4 py-2 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-primary-foreground hover:bg-primary-foreground/[0.06]"
                  >
                    View full history
                  </Link>
                </>
              ) : (
                <p className="mt-6 rounded-md border border-dashed border-primary-foreground/30 p-6 text-center text-[13px] text-primary-foreground/70">
                  No activity recorded on-chain yet.
                </p>
              )}
            </div>
          </section>

          {/* AI Insight — only when the contract has produced an explanation */}
          {latest?.explanation && (
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="grid items-center gap-0 lg:grid-cols-[1.4fr_1fr]">
                <div className="p-8 sm:p-10">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-warning">
                    AI insight
                  </p>
                  <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {truncate(latest.explanation, 130)}
                  </h2>
                  <p className="mt-4 max-w-md text-[14px] leading-relaxed text-accent">
                    Latest AI evaluation from the Reputon contract. Run another
                    via the Analyzer to refresh.
                  </p>
                  <Button asChild className="mt-6">
                    <Link href="/dashboard/analyzer">
                      <Sparkles className="h-4 w-4" />
                      Run new evaluation
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="relative h-full min-h-[220px]">
                  <InsightArt />
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </Container>
  );
}

/* helpers */

function buildMonthlyBars(values: number[]): number[] {
  if (values.length === 0) return [];
  const target = Math.min(8, values.length);
  const out: number[] = [];
  const step = Math.max(1, Math.floor(values.length / target));
  for (let i = 0; i < target; i++) {
    out.push(values[i * step] ?? values[values.length - 1]);
  }
  return out;
}

function formatYearsSince(unixSec: number): string {
  if (!unixSec) return "—";
  const years = (Date.now() / 1000 - unixSec) / (365 * 24 * 60 * 60);
  if (years < 0.001) return "just now";
  if (years < 0.083) return `${Math.max(1, Math.round(years * 365))} days`;
  if (years < 1) return `${Math.round(years * 12)} months`;
  return `${years.toFixed(1)} years`;
}

/**
 * Same shape as formatYearsSince but takes an ISO timestamp. We use this
 * for on-chain age, derived from when the user first linked their wallet
 * here — the contract can't record a real on-chain created_at on this
 * Genlayer SDK because gl.block.timestamp is not exposed.
 */
function formatYearsSinceIso(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  return formatYearsSince(Math.floor(t / 1000));
}

function formatAgo(unixSec: number): string {
  if (!unixSec) return "—";
  const diff = Date.now() / 1000 - unixSec;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.round(diff / 86400)}d ago`;
  return `${Math.round(diff / (7 * 86400))}w ago`;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function SideStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-accent">
        {icon}
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]">{label}</p>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
    </div>
  );
}

function ProgressRow({
  n,
  label,
  value,
  max,
}: {
  n: string;
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent">
          {n} · {label}
        </p>
        <p className="font-mono text-[12px] text-foreground">
          {value}/{max}
        </p>
      </div>
      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-foreground/[0.06]">
        <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InsightArt() {
  return (
    <svg
      viewBox="0 0 600 400"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="insightGlow" cx="65%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#5b3a1e" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0a0805" stopOpacity="1" />
        </radialGradient>
        <linearGradient id="insightWave" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#f4d8b1" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#a07449" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#insightGlow)" />
      {Array.from({ length: 14 }).map((_, i) => {
        const y = 180 + i * 14;
        const offset = (i * 23) % 60;
        return (
          <path
            key={i}
            d={`M0 ${y} C 150 ${y - 30 + offset}, 300 ${y + 20 - offset}, 600 ${y + 5}`}
            fill="none"
            stroke="url(#insightWave)"
            strokeWidth="1"
            opacity={1 - i / 16}
          />
        );
      })}
    </svg>
  );
}
