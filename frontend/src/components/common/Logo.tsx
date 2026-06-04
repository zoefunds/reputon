import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Reputon brand mark. Inline SVG so it inherits text color, scales cleanly,
 * and never causes a network request. Matches /public/favicon.svg.
 */
export function LogoMark({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Reputon mark"
      className={cn("shrink-0", className)}
    >
      <rect width="64" height="64" rx="13" className="fill-background" />
      <g className="fill-foreground">
        <path d="M14 10 H38 a16 16 0 0 1 16 16 v0 a16 16 0 0 1 -16 16 H24 V54 H14 Z" />
        <path d="M32 38 L50 54 H38 L24 40 Z" />
      </g>
      <circle cx="38" cy="26" r="7" className="fill-background" />
      <circle cx="38" cy="26" r="2.3" className="fill-foreground" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight text-foreground",
        className
      )}
      aria-label="Reputon , home"
    >
      <LogoMark size={26} />
      <span>Reputon</span>
    </Link>
  );
}
