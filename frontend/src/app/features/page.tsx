import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BrainCircuit,
  Fingerprint,
  Gavel,
  Award,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CodePanel, tok } from "@/components/landing/CodePanel";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Every primitive Reputon ships: dynamic scoring, AI evaluation, NFT credentials, sybil resistance, governance reputation and a unified API.",
};

export default function FeaturesPage() {
  return (
    <>
      {/* Header */}
      <Container className="pt-20 pb-12 sm:pt-24">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
          Protocol capabilities
        </p>
        <h1 className="mt-3 max-w-4xl text-balance font-display text-[40px] font-semibold leading-[1.04] tracking-tightest text-foreground sm:text-[64px]">
          The infrastructure of trust
          <br className="hidden sm:block" /> for decentralized networks.
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-[16px] leading-relaxed text-accent">
          Reputon leverages advanced AI and behavioral analysis to create a
          living, breathing identity layer for the open web.
        </p>
      </Container>

      {/* Cards grid */}
      <Container className="pb-16">
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Card 01: Dynamic Behavioral Scoring (with bar chart) — spans 2 cols on lg */}
          <article className="rounded-2xl border border-border bg-card p-7 shadow-soft lg:col-span-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground">
              <Activity className="h-4 w-4" strokeWidth={1.6} />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground">
              Dynamic behavioral scoring
            </h2>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-accent">
              Our engine continuously re-evaluates trust scores from real-time
              wallet behavior. We track velocity, contract interactions and
              liquidation history to ensure reputation is earned, not bought.
            </p>
            <div className="mt-7 flex h-32 items-end gap-2 rounded-md bg-foreground/[0.04] p-3">
              {[55, 38, 68, 52, 82, 70, 58, 90].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-primary"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </article>

          {/* Card 02: AI Contribution Grading (with PR analysis) */}
          <article className="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground">
              <BrainCircuit className="h-4 w-4" strokeWidth={1.6} />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-foreground">
              AI contribution grading
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-accent">
              Move beyond simple metrics. Our LLM-powered analysis reviews
              pull requests, proposals and Discord activity to grade the
              qualitative value of each contribution.
            </p>
            <dl className="mt-6 space-y-2">
              <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[12.5px]">
                <dt className="font-mono uppercase tracking-[0.14em] text-accent">
                  pr_analysis
                </dt>
                <dd className="font-display text-[14px] font-semibold text-success">A+</dd>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[12.5px]">
                <dt className="font-mono uppercase tracking-[0.14em] text-accent">
                  code_quality
                </dt>
                <dd className="font-display text-[14px] font-semibold text-foreground">98%</dd>
              </div>
            </dl>
          </article>

          {/* Card 03: LLM Equivalence (dark) */}
          <article className="rounded-2xl bg-primary p-7 text-primary-foreground shadow-soft">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-primary-foreground/15 bg-primary-foreground/[0.05]">
              <Fingerprint className="h-4 w-4" strokeWidth={1.6} />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold tracking-tight">
              LLM equivalence checks
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-primary-foreground/70">
              Advanced sybil resistance that identifies patterns across
              multiple identities. Our LLM checks ensure a single actor isn't
              masquerading as an entire community.
            </p>
            <div className="mt-7 flex items-center justify-between border-t border-primary-foreground/10 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60">
              <span>01 · Secure protocol</span>
              <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-success" />
            </div>
          </article>

          {/* Card 04: Governance Tracking */}
          <article className="rounded-2xl border border-border bg-card p-7 shadow-soft">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground">
              <Gavel className="h-4 w-4" strokeWidth={1.6} />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-foreground">
              Governance tracking
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-accent">
              Measure the true weight of a delegate. We track historical
              voting alignment, proposal success rates and participation
              consistency over time.
            </p>
          </article>

          {/* Card 05: On-Chain Credentials */}
          <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-soft">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground">
              <Award className="h-4 w-4" strokeWidth={1.6} />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-foreground">
              On-chain credentials
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-accent">
              Mint your reputation. Non-transferable NFT badges encapsulate
              your social and technical standing, verifiable across any
              EVM-compatible chain.
            </p>
            <Award
              className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 text-foreground/[0.06]"
              strokeWidth={0.8}
            />
          </article>
        </div>
      </Container>

      {/* Unified API lavender card */}
      <Container className="pb-20">
        <div className="grid items-center gap-8 rounded-2xl border border-border bg-[#E8E7F4] p-8 shadow-soft lg:grid-cols-[1fr_1.1fr] lg:p-10">
          <div>
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" strokeWidth={1.6} />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              The unified reputation API.
            </h2>
            <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-accent">
              Integrate Reputon into your dApp with three lines of code. Fetch
              scores, history, and credentials instantly via our high-performance
              REST and GraphQL endpoints.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/docs">Read docs</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/api-keys">Get API key</Link>
              </Button>
            </div>
          </div>

          <CodePanel filename="reputon-quickstart.js">
            <code>
              {tok.k("const")} {tok.f("reputon")} = {tok.f("require")}({tok.s("'@reputon/sdk'")});{"\n\n"}
              {tok.k("const")} {tok.f("score")} = {tok.k("await")}{" "}
              {tok.f("reputon")}.{tok.f("getScore")}({tok.s("'0x71c...3d2'")});
              {"\n"}
              {tok.f("console")}.{tok.f("log")}({tok.s("`Current trust index: ${score.value}`")});
              {"\n\n"}
              {tok.c("// Output: Current trust index: 90.42")}
            </code>
          </CodePanel>
        </div>
      </Container>

      {/* Closing CTA */}
      <section className="border-t border-border/60 bg-card/40 py-20 sm:py-24">
        <Container className="text-center">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Build the trust layer of the future.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-accent">
            Reputon is open-source and ready for integration. Start building
            fairer governance and more secure ecosystems today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Talk to an expert</Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
