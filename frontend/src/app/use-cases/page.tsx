import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Vote,
  Banknote,
  Lock,
  ShieldCheck,
  Globe,
  Cpu,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/common/Section";
import { DarkSection } from "@/components/landing/DarkSection";
import { ImageMockTile } from "@/components/landing/ImageMockTile";
import { CodePanel, tok } from "@/components/landing/CodePanel";

export const metadata: Metadata = {
  title: "Use cases",
  description:
    "Lending, DAOs, gated access, identity, governance. Concrete ways Reputon's portable reputation slots into your protocol.",
};

export default function UseCasesPage() {
  return (
    <>
      {/* Hero */}
      <Container className="pt-20 pb-12 sm:pt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
              Architectural applications
            </p>
            <h1 className="mt-3 text-balance font-display text-[40px] font-semibold leading-[1.04] tracking-tightest text-foreground sm:text-[56px]">
              Building trust into the
              <br className="hidden sm:block" />
              infinite machine.
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-[16px] leading-relaxed text-accent">
              Reputon provides the definitive protocol layer for quantifying
              decentralized trust. From under-collateralized lending to
              sybil-resistant governance, our engine powers the next generation
              of social and financial coordination.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-foreground/[0.06] text-foreground">
              <Globe className="h-3 w-3" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
              v0.1.0 · studionet alpha
            </span>
          </div>
        </div>
      </Container>

      {/* Card grid */}
      <Container className="pb-16">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* 01 Governance — image card */}
          <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <ImageMockTile variant="archway" className="h-56 w-full" />
            <div className="p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                01 · Governance
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
                Sophisticated DAO tooling
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-accent">
                Weight votes by historical contribution and behavioral
                integrity. Move from token-weighted voting to meritocratic
                coordination, with the engine's quality signal baked into your
                tally.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Chip icon={Vote}>Contribution tracking</Chip>
                <Chip icon={ShieldCheck}>Adaptive weighting</Chip>
              </div>
            </div>
          </article>

          {/* 02 Lending — text card */}
          <article className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              02 · Lending
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
              Creditworthiness for the under-collateralized
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-accent">
              Unlock under-collateralized loans by leveraging on-chain
              reputation scores. Reputon analyzes past repayment behavior and
              wallet health to generate low-risk credit profiles your market
              can underwrite against.
            </p>
            <div className="mt-6 rounded-md border border-border bg-background p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                Risk assessment engine
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-display text-2xl font-semibold text-foreground">
                  +28.4%
                </span>
                <Banknote className="h-5 w-5 text-success" />
              </div>
              <p className="mt-1 text-[11px] text-accent">
                Origination uplift vs. collateral-only models in StudioNet pilots.
              </p>
            </div>
          </article>

          {/* 03 Identity */}
          <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <ImageMockTile variant="doorway" className="h-56 w-full" />
            <div className="p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                03 · Identity
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
                Portable reputation profiles
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-accent">
                Your reputation is yours to keep. Reputon mints soulbound
                credentials that travel with your wallet across every dApp in
                the ecosystem.
              </p>
              <div className="mt-5 flex items-center gap-3 text-[12px]">
                <Lock className="h-3.5 w-3.5 text-accent" />
                <span className="text-foreground">
                  Privacy-preserving, soulbound by default.
                </span>
              </div>
            </div>
          </article>

          {/* 04 Anti-sybil — dark card */}
          <article className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-soft sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60">
              04 · Anti-sybil
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
              Impenetrable sybil resistance
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-primary-foreground/70">
              Eliminate airdrop farming and governance manipulation. Our
              identity-linkage engine distinguishes between human actors and
              automated bot swarms using graph analysis and LLM equivalence
              checks.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-[11px]">
              <div className="rounded-md border border-primary-foreground/15 bg-primary-foreground/[0.05] p-3">
                <p className="font-mono uppercase tracking-[0.16em] text-primary-foreground/60">
                  Human score
                </p>
                <p className="mt-1 font-display text-base font-semibold">99.8%</p>
              </div>
              <div className="rounded-md border border-primary-foreground/15 bg-primary-foreground/[0.05] p-3">
                <p className="font-mono uppercase tracking-[0.16em] text-primary-foreground/60">
                  Graph density
                </p>
                <p className="mt-1 font-display text-base font-semibold">Low risk</p>
              </div>
            </div>
          </article>
        </div>
      </Container>

      {/* Ready for integration */}
      <DarkSection className="py-20 sm:py-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready for integration.
            </h2>
            <ol className="mt-8 space-y-5">
              <IntegrationStep n="01" title="RESTful API & webhooks">
                Query reputation data with low latency via our global edge
                network. Subscribe to score events as they happen.
              </IntegrationStep>
              <IntegrationStep n="02" title="On-chain smart oracles">
                Consume verified scores directly in your Solidity or Rust
                smart contracts.
              </IntegrationStep>
              <IntegrationStep n="03" title="Zero-knowledge proofs">
                Verify status without exposing the underlying wallet history
                or any personal metadata.
              </IntegrationStep>
            </ol>
            <Button asChild size="lg" className="mt-9 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Link href="/docs">
                Explore documentation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <CodePanel filename="integrate.ts" className="border-primary-foreground/10">
            <code>
              {tok.c("// Initialize Reputon engine")}
              {"\n"}
              {tok.k("const")} {tok.f("reputon")} = {tok.k("new")}{" "}
              {tok.f("ReputonSDK")}({"{"}
              {"\n"}  {tok.f("apiKey")}: {tok.f("process")}.{tok.f("env")}.{tok.f("REPUTON_KEY")},{"\n"}  {tok.f("network")}: {tok.s("'studionet'")},{"\n"}
              {"}"});{"\n\n"}
              {tok.c("// Verify governance weight")}
              {"\n"}
              {tok.k("const")} {tok.f("score")} = {tok.k("await")}{" "}
              {tok.f("reputon")}.{tok.f("getScore")}({tok.f("walletAddress")});
              {"\n\n"}
              {tok.k("if")} ({tok.f("score")}.{tok.f("category")} === {tok.s("'eminent'")}) {"{"}
              {"\n"}  {tok.f("console")}.{tok.f("log")}({tok.s("'Vote weight: platinum'")});
              {"\n"}
              {"}"}
            </code>
          </CodePanel>
        </div>
      </DarkSection>

      {/* Closing CTA */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            What will you build next?
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/contact">Talk to us</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}

function Chip({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground">
      <Icon className="h-3 w-3 text-accent" />
      {children}
    </span>
  );
}

function IntegrationStep({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="font-mono text-[12px] tracking-[0.18em] text-primary-foreground/60">
        {n}
      </span>
      <div>
        <h3 className="font-display text-[15px] font-semibold tracking-tight">
          {title}
        </h3>
        <p className="mt-1 max-w-md text-[13.5px] leading-relaxed text-primary-foreground/70">
          {children}
        </p>
      </div>
    </li>
  );
}
