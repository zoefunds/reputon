/**
 * Mock "processor status" card used in the Engine hero. All-CSS, no images.
 */
import { Cpu } from "lucide-react";

const BARS = [62, 48, 80, 70, 90, 75];

export function EngineMockCard() {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="absolute right-5 top-5 inline-flex h-6 items-center rounded-full border border-border bg-background px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
        v2.4 stable
      </div>

      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md border border-border bg-background text-foreground">
          <Cpu className="h-4 w-4" strokeWidth={1.6} />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">
            Processor status
          </p>
          <p className="mt-1 font-mono text-[12px] text-foreground">
            genlayer_executor_01 :: active
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-6 items-end gap-1.5 rounded-md bg-foreground/[0.04] p-3 h-28">
        {BARS.map((h, i) => (
          <div
            key={i}
            className="rounded-sm bg-primary"
            style={{ height: `${h}%` }}
            aria-hidden
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <p className="font-medium uppercase tracking-[0.16em] text-accent">Latency</p>
          <p className="mt-1 font-mono text-[15px] font-semibold text-foreground">14 ms</p>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <p className="font-medium uppercase tracking-[0.16em] text-accent">Trust score</p>
          <p className="mt-1 font-mono text-[15px] font-semibold text-foreground">99.98%</p>
        </div>
      </div>
    </div>
  );
}
