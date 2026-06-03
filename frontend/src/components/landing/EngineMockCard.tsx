/**
 * Engine hero card. Reads live contract stats from /v1/onchain/info so every
 * number on the page is real, never simulated.
 */
import { Cpu } from "lucide-react";
import type { ProtocolStats } from "@/lib/server/stats";

export function EngineMockCard({ stats }: { stats: ProtocolStats | null }) {
  const live = stats != null;
  return (
    <div className="relative rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="absolute right-5 top-5 inline-flex h-6 items-center rounded-full border border-border bg-background px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
        v{stats?.contract_version ?? 0}.0
      </div>

      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-background text-foreground">
          <Cpu className="h-4 w-4" strokeWidth={1.6} />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">
            Reputon contract
          </p>
          <p className="mt-1 font-mono text-[12px] text-foreground">
            {live ? "studionet :: live" : "offline"}
          </p>
        </div>
      </div>

      <dl className="mt-5 divide-y divide-border/70 border-y border-border/70">
        <Row label="Profiles registered" value={stats?.total_profiles ?? 0} />
        <Row label="Evaluations recorded" value={stats?.total_evaluations ?? 0} />
        <Row label="Endorsements on-chain" value={stats?.total_endorsements ?? 0} />
        <Row label="NFT credentials minted" value={stats?.nft_supply ?? 0} />
      </dl>

      <p className="mt-4 break-all font-mono text-[10.5px] text-accent">
        Owner {stats?.owner.slice(0, 10) ?? "—"}…{stats?.owner.slice(-4) ?? ""}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 py-2.5">
      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
        {label}
      </dt>
      <dd className="font-display text-[15px] font-semibold text-foreground">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
