import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-grid" />
      <Container className="pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="mx-auto max-w-3xl text-center animate-slide-up">
          <Link
            href="/engine"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[12px] text-accent shadow-soft transition-colors hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 text-foreground" />
            <span>Powered by Genlayer Intelligent Contracts</span>
          </Link>

          <h1 className="mt-6 text-balance font-display text-[44px] font-semibold leading-[1.05] tracking-tightest text-foreground sm:text-[60px]">
            The universal on-chain
            <br className="hidden sm:block" />
            reputation layer.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-[17px] leading-relaxed text-accent">
            Reputon turns wallet behavior, governance, contributions and trust
            signals into a dynamic, AI-evaluated reputation score — portable
            across every Web3 application.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Get your reputation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>

          <p className="mt-5 text-xs text-accent">
            Live on Genlayer StudioNet · No installation · Free to query
          </p>
        </div>
      </Container>
    </section>
  );
}
