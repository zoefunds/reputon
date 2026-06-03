import { Globe } from "lucide-react";
import type { ProtocolStats } from "@/lib/server/stats";

/**
 * Hero CTA card. Renders ONLY live numbers from the deployed contracts.
 * If the backend is unreachable, falls back to dashes (never simulated).
 */
export function ReputonIdCard({ stats }: { stats: ProtocolStats | null }) {
  return (
    <div className="relative w-full max-w-xs rotate-[-3deg] rounded-2xl border border-border bg-background p-5 shadow-soft sm:max-w-sm">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          Reputon · studionet
        </p>
        <span className="grid h-5 w-5 place-items-center rounded-full border border-foreground/30 bg-foreground/[0.06] text-foreground">
          <Globe className="h-2.5 w-2.5" />
        </span>
      </div>

      <div className="mt-4 font-display text-5xl font-semibold tracking-tightest text-foreground">
        {stats != null ? (stats.total_evaluations + stats.total_profiles).toLocaleString() : "—"}
      </div>
      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-accent">
        On-chain actions
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 text-[10px]">
        <div>
          <p className="font-mono uppercase tracking-[0.14em] text-accent">Profiles</p>
          <p className="mt-0.5 font-display text-[13px] font-semibold text-foreground">
            {stats != null ? stats.total_profiles.toLocaleString() : "—"}
          </p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.14em] text-accent">Credentials</p>
          <p className="mt-0.5 font-display text-[13px] font-semibold text-foreground">
            {stats != null ? stats.nft_supply.toLocaleString() : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
