import { ShieldCheck } from "lucide-react";

export function ReputonIdCard() {
  return (
    <div className="relative w-full max-w-xs rotate-[-4deg] rounded-2xl border border-border bg-background p-5 shadow-soft sm:max-w-sm">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          Reputon id
        </p>
        <span className="grid h-5 w-5 place-items-center rounded-full border border-success/40 bg-success/10 text-success">
          <ShieldCheck className="h-2.5 w-2.5" />
        </span>
      </div>

      <div className="mt-4 font-display text-5xl font-semibold tracking-tightest text-foreground">
        842
      </div>
      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-success">
        High trust
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 text-[10px]">
        <div>
          <p className="font-mono uppercase tracking-[0.14em] text-accent">On-chain age</p>
          <p className="mt-0.5 font-display text-[13px] font-semibold text-foreground">
            4.2 years
          </p>
        </div>
        <div>
          <p className="font-mono uppercase tracking-[0.14em] text-accent">Protocols</p>
          <p className="mt-0.5 font-display text-[13px] font-semibold text-foreground">
            12 active
          </p>
        </div>
      </div>
    </div>
  );
}
