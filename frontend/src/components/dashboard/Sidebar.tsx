"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
 LayoutDashboard,
 Sparkles,
 Users,
 Award,
 LineChart,
 Settings,
 KeyRound,
 Webhook,
 Vote,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
 { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
 { href: "/dashboard/analyzer", label: "Analyzer", icon: Sparkles },
 { href: "/dashboard/governance", label: "Governance", icon: Vote },
 { href: "/dashboard/endorsements", label: "Endorsements", icon: Users },
 { href: "/dashboard/nfts", label: "Credentials", icon: Award },
 { href: "/dashboard/history", label: "History", icon: LineChart },
];

const DEV = [
 { href: "/dashboard/api-keys", label: "API keys", icon: KeyRound },
 { href: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
 { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
 const pathname = usePathname();
 return (
 <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-background/60 md:block">
 <nav className="flex h-full flex-col gap-1 p-4">
 <Group items={NAV} pathname={pathname} />
 <div className="my-3 border-t border-border/60" />
 <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-accent">
 Developer
 </p>
 <Group items={DEV} pathname={pathname} />
 </nav>
 </aside>
 );
}

function Group({
 items,
 pathname,
}: {
 items: typeof NAV;
 pathname: string;
}) {
 return (
 <ul className="space-y-1">
 {items.map(({ href, label, icon: Icon }) => {
 const active =
 href === "/dashboard" ? pathname === href : pathname.startsWith(href);
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
 );
}
