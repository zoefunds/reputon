import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "./Logo";
import { FOOTER_GROUPS, SITE } from "@/lib/constants";

export function Footer() {
 return (
 <footer className="mt-32 border-t border-border/70 bg-background">
 <Container className="grid gap-12 py-16 md:grid-cols-5">
 <div className="md:col-span-2">
 <Logo />
 <p className="mt-4 max-w-xs text-sm leading-relaxed text-accent">
 The universal on-chain reputation layer. Portable trust for Web3,
 powered by Genlayer Intelligent Contracts.
 </p>
 </div>
 {FOOTER_GROUPS.map((group) => (
 <div key={group.title}>
 <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
 {group.title}
 </p>
 <ul className="mt-4 space-y-3">
 {group.links.map((l) => (
 <li key={l.href}>
 <Link
 href={l.href}
 className="text-sm text-foreground/80 transition-colors hover:text-foreground"
 >
 {l.label}
 </Link>
 </li>
 ))}
 </ul>
 </div>
 ))}
 </Container>
 <div className="border-t border-border/60">
 <Container className="flex flex-col gap-2 py-6 text-xs text-accent sm:flex-row sm:items-center sm:justify-between">
 <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
 <p>Built on Genlayer StudioNet.</p>
 </Container>
 </div>
 </footer>
 );
}
