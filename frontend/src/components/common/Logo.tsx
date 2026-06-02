import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight text-foreground",
        className
      )}
      aria-label="Reputon — home"
    >
      <span
        aria-hidden
        className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground text-[11px] font-bold"
      >
        R
      </span>
      <span>Reputon</span>
    </Link>
  );
}
