type Breakdown = {
  activity: number;
  governance: number;
  contribution: number;
  trust: number;
};

const LABELS: { key: keyof Breakdown; label: string }[] = [
  { key: "activity", label: "Activity" },
  { key: "governance", label: "Governance" },
  { key: "contribution", label: "Contribution" },
  { key: "trust", label: "Trust" },
];

export function BreakdownGrid({
  breakdown,
  max = 250,
}: {
  breakdown: Breakdown | null;
  max?: number;
}) {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border/70 sm:grid-cols-2 lg:grid-cols-4">
      {LABELS.map(({ key, label }) => {
        const v = breakdown?.[key] ?? 0;
        const pct = Math.round((v / max) * 100);
        return (
          <div key={key} className="bg-card p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent">{label}</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
                {v}
              </span>
              <span className="font-mono text-[11px] text-accent">/ {max}</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
              <div
                className="h-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
