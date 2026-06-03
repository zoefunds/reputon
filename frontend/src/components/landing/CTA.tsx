import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ReputonIdCard } from "./ReputonIdCard";
import type { ProtocolStats } from "@/lib/server/stats";

export function CTA({ stats }: { stats: ProtocolStats | null }) {
  return (
    <section className="pb-24 sm:pb-32">
      <Container>
        <div className="relative grid gap-10 overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-soft lg:grid-cols-[1.4fr_1fr] lg:items-center lg:p-16">
          <div className="px-8 pt-10 sm:px-0 sm:pt-0">
            <h2 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Start carrying your reputation across Web3.
            </h2>
            <p className="mt-4 max-w-xl text-balance text-primary-foreground/70">
              Free during StudioNet. No vendor lock-in. Your score lives
              on-chain, yours to take anywhere.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link href="/dashboard">
                  Launch dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href="/docs">View API</Link>
              </Button>
            </div>
          </div>

          <div className="relative flex items-center justify-center px-8 pb-10 sm:px-0 sm:pb-0">
            <div aria-hidden className="absolute inset-0 -z-10 bg-noise opacity-30" />
            <ReputonIdCard stats={stats} />
          </div>
        </div>
      </Container>
    </section>
  );
}
