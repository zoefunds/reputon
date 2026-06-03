/**
 * Decorative "image" tile used on /use-cases. Pure SVG/CSS so no asset
 * pipeline needed; the gradients evoke the architectural feel of the
 * reference mocks without copyrighted stock photography.
 */
import { cn } from "@/lib/utils";

const VARIANTS = {
  archway: {
    bg: "from-amber-200 via-amber-100 to-amber-50",
    svg: (
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full opacity-60">
        <defs>
          <radialGradient id="archGlow" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#fff7d6" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="200" height="200" fill="url(#archGlow)" />
        <path
          d="M50 200 V90 a50 50 0 0 1 100 0 V200 Z"
          fill="none"
          stroke="#92400e"
          strokeWidth="2.5"
          opacity="0.5"
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <circle
            key={i}
            cx={100 + Math.cos((i / 5) * Math.PI * 2) * 28}
            cy={110 + Math.sin((i / 5) * Math.PI * 2) * 28}
            r="6"
            fill="#92400e"
            opacity="0.35"
          />
        ))}
        <circle cx="100" cy="110" r="10" fill="#92400e" opacity="0.45" />
      </svg>
    ),
  },
  doorway: {
    bg: "from-stone-200 via-stone-100 to-stone-50",
    svg: (
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full opacity-70">
        <defs>
          <linearGradient id="doorLight" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
            <stop offset="100%" stopColor="#f5f5f4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill="#e7e5e4" />
        <polygon points="80,40 120,40 130,200 70,200" fill="url(#doorLight)" />
        <line x1="80" y1="40" x2="120" y2="40" stroke="#a8a29e" strokeWidth="1.5" />
        <line x1="80" y1="40" x2="70" y2="200" stroke="#a8a29e" strokeWidth="1.5" />
        <line x1="120" y1="40" x2="130" y2="200" stroke="#a8a29e" strokeWidth="1.5" />
      </svg>
    ),
  },
  monolith: {
    bg: "from-stone-300 via-stone-200 to-stone-100",
    svg: (
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full opacity-80">
        <rect width="200" height="200" fill="#e7e5e4" />
        <polygon points="80,30 130,30 135,200 75,200" fill="#1c1917" opacity="0.9" />
        <polygon points="80,30 130,30 132,30 78,30" fill="#44403c" opacity="0.6" />
      </svg>
    ),
  },
  network: {
    bg: "from-stone-200 via-stone-100 to-stone-50",
    svg: (
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full opacity-70">
        <rect width="200" height="200" fill="#e7e5e4" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const r = 65;
          const x = 100 + Math.cos(angle) * r;
          const y = 100 + Math.sin(angle) * r;
          return (
            <g key={i}>
              <line x1="100" y1="100" x2={x} y2={y} stroke="#78716c" strokeWidth="0.8" />
              <circle cx={x} cy={y} r="3" fill="#1c1917" />
            </g>
          );
        })}
        <circle cx="100" cy="100" r="8" fill="#1c1917" />
      </svg>
    ),
  },
} as const;

export type MockVariant = keyof typeof VARIANTS;

export function ImageMockTile({
  variant = "archway",
  className,
}: {
  variant?: MockVariant;
  className?: string;
}) {
  const v = VARIANTS[variant];
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br",
        v.bg,
        className
      )}
    >
      {v.svg}
    </div>
  );
}
