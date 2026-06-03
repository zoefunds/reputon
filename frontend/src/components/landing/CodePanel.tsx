import { cn } from "@/lib/utils";

export function CodePanel({
  filename,
  children,
  className,
}: {
  filename?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-primary shadow-soft", className)}>
      <div className="flex items-center gap-2 border-b border-primary-foreground/10 px-4 py-2.5">
        <span className="block h-2.5 w-2.5 rounded-full bg-error" />
        <span className="block h-2.5 w-2.5 rounded-full bg-warning" />
        <span className="block h-2.5 w-2.5 rounded-full bg-success" />
        {filename && (
          <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-primary-foreground/60">
            {filename}
          </span>
        )}
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-primary-foreground">
        {children}
      </pre>
    </div>
  );
}

/* Tiny syntax highlight helpers, just opinionated colours per token type. */
export const tok = {
  k: (s: string) => <span className="text-warning">{s}</span>,     // keyword
  s: (s: string) => <span className="text-success">{s}</span>,     // string
  c: (s: string) => <span className="text-primary-foreground/40">{s}</span>, // comment
  f: (s: string) => <span className="text-primary-foreground/80">{s}</span>, // function/var
};
