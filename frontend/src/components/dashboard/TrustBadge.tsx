import { cn } from "@/lib/utils";

type Category = "unverified" | "emerging" | "trusted" | "eminent" | string;

const STYLES: Record<string, string> = {
  unverified: "border-border bg-foreground/[0.04] text-accent",
  emerging: "border-warning/40 bg-warning/10 text-warning",
  trusted: "border-primary/40 bg-primary/10 text-primary",
  eminent: "border-success/40 bg-success/10 text-success",
};

export function TrustBadge({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full border px-2 font-mono text-[10px] uppercase tracking-[0.16em]",
        STYLES[category] ?? STYLES.unverified,
        className
      )}
    >
      {category}
    </span>
  );
}
