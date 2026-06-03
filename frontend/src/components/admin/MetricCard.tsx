import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "error";
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
      ? "text-warning"
      : tone === "error"
      ? "text-error"
      : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
        {label}
      </p>
      <p className={cn("mt-2 font-display text-3xl font-semibold tracking-tight", toneCls)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-[12px] text-accent">{hint}</p>}
    </div>
  );
}
