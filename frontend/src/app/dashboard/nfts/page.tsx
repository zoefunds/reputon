import { Award } from "lucide-react";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { requireUser } from "@/lib/server/user";
import { onchain } from "@/lib/server/onchain";

export const dynamic = "force-dynamic";

const TIER_COLORS: Record<string, string> = {
  genesis: "from-amber-200 to-amber-500",
  bronze: "from-orange-300 to-orange-600",
  silver: "from-gray-200 to-gray-500",
  gold: "from-yellow-200 to-yellow-500",
  eternal: "from-indigo-300 to-indigo-600",
};

export default async function NftsPage() {
  const user = await requireUser();
  const address = user.primaryWallet?.address;
  const data = address ? (await onchain.credentialsOf(address))?.credentials ?? [] : [];

  return (
    <Container className="space-y-6 py-10">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Credentials</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
          On-chain proofs of what you've done.
        </h1>
      </div>

      {!address ? (
        <EmptyState
          icon={<Award className="h-4 w-4" />}
          title="Link a wallet first"
          body="NFT credentials are minted to a wallet."
        />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Award className="h-4 w-4" />}
          title="No credentials yet"
          body="Earn or self-mint your first credential. The Genesis tier is open to everyone — that's where most users start."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <article
              key={c.token_id}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"
            >
              <div
                className={
                  "grid h-32 place-items-center bg-gradient-to-br text-3xl font-display font-semibold uppercase text-foreground/80 " +
                  (TIER_COLORS[c.tier] ?? "from-foreground/10 to-foreground/30")
                }
              >
                {c.tier?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                    #{c.token_id} · {c.tier}
                  </span>
                  {c.soulbound && (
                    <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                      soulbound
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-display text-[15px] font-semibold tracking-tight text-foreground">
                  {c.name}
                </h3>
                {c.description && (
                  <p className="mt-1 text-[13px] text-accent">{c.description}</p>
                )}
                <p className="mt-3 text-[11px] text-accent">
                  Minted {new Date(c.minted_at * 1000).toLocaleDateString()}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </Container>
  );
}
