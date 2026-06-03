"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  BarChart3,
  Users,
  Sparkles,
  AlertOctagon,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: ShieldCheck },
  { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/evaluations", label: "Evaluations", icon: Sparkles },
  { href: "/admin/sybil", label: "Sybil flags", icon: AlertOctagon },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-background/60 md:block">
      <nav className="flex h-full flex-col gap-1 p-4">
        <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-accent">
          Admin
        </p>
        <ul className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] transition-colors",
                    active
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-accent hover:bg-foreground/[0.04] hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.6} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
