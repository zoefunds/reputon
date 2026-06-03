import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function CTA() {
 return (
 <section className="pb-24 sm:pb-32">
 <Container>
 <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-8 py-16 text-center shadow-soft sm:px-16">
 <div aria-hidden className="absolute inset-0 -z-10 bg-noise opacity-60" />
 <h2 className="mx-auto max-w-2xl text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
 Start carrying your reputation across Web3.
 </h2>
 <p className="mx-auto mt-4 max-w-xl text-balance text-accent">
 Free during StudioNet. No vendor lock-in. Your score lives on-chain
 , yours to take anywhere.
 </p>
 <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
 <Button asChild size="lg">
 <Link href="/dashboard">
 Launch dashboard
 <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 <Button asChild size="lg" variant="outline">
 <Link href="/docs">View API</Link>
 </Button>
 </div>
 </div>
 </Container>
 </section>
 );
}
