import { Container } from "@/components/ui/container";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { TrustBadge } from "@/components/dashboard/TrustBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { History } from "lucide-react";
import { requireUser } from "@/lib/server/user";
import { onchain } from "@/lib/server/onchain";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireUser();
  const address = user.primaryWallet?.address;
  const history = address ? (await onchain.history(address, 100))?.history ?? [] : [];

  return (
    <Container className="space-y-6 py-10">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">History</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
          Every score update, on-chain.
        </h1>
      </div>

      {!address ? (
        <EmptyState
          icon={<History className="h-4 w-4" />}
          title="Link a wallet first"
          body="Score history is keyed to a wallet. Link one to see your timeline."
        />
      ) : history.length === 0 ? (
        <EmptyState
          icon={<History className="h-4 w-4" />}
          title="No evaluations yet"
          body="Once a reputation evaluation runs, every entry shows here with the AI explanation that produced it."
        />
      ) : (
        <>
          <TrendChart history={history} />
          <div className="rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border/60">
              {history.map((h, i) => (
                <li key={i} className="p-5">
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="font-mono text-accent">
                      {new Date(h.created_at * 1000).toLocaleString()}
                    </span>
                    <TrustBadge category={h.category} />
                    <span className="text-foreground">score {h.score}</span>
                    <span
                      className={
                        h.delta > 0
                          ? "text-success"
                          : h.delta < 0
                          ? "text-error"
                          : "text-accent"
                      }
                    >
                      Δ {h.delta > 0 ? "+" : ""}
                      {h.delta}
                    </span>
                  </div>
                  {h.explanation && (
                    <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-foreground/80">
                      {h.explanation}
                    </p>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    {(["activity", "governance", "contribution", "trust"] as const).map(
                      (k) => (
                        <div
                          key={k}
                          className="rounded-md border border-border bg-background px-3 py-1.5 text-[12px]"
                        >
                          <span className="font-mono uppercase tracking-[0.14em] text-accent">
                            {k}
                          </span>{" "}
                          <span className="text-foreground">{h.breakdown?.[k] ?? 0}</span>
                        </div>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Container>
  );
}
