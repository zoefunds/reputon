import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  ShieldCheck,
  GitBranch,
  Database,
  Sparkles,
  Sigma,
  Anchor,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/common/Section";
import { DarkSection } from "@/components/landing/DarkSection";
import { EngineMockCard } from "@/components/landing/EngineMockCard";
import { CodePanel, tok } from "@/components/landing/CodePanel";

export const metadata: Metadata = {
  title: "Reputation Engine",
  description:
    "Inside the Reputon engine. How Genlayer Intelligent Contracts and LLM equivalence checks turn raw wallet activity into a verifiable, portable score.",
};

const PILLARS = [
  {
    icon: Cpu,
    title: "On-chain reasoning",
    body: "Unlike traditional oracles, Genlayer allows non-deterministic AI outputs to reach consensus, providing a single source of truth for qualitative data.",
  },
  {
    icon: ShieldCheck,
    title: "Verifiable scoring",
    body: "Privacy-preserving reputation scores. Prove you are a high-quality contributor without revealing your wallet history or personal identity.",
  },
  {
    icon: GitBranch,
    title: "Cross-chain ready",
    body: "Deploy reputation across EVM, Solana and Cosmos through our unified messaging bridge. Your trust travels with you.",
  },
];

const FLOW = [
  {
    n: "01",
    title: "Ingestion",
    body: "Data feeds from GitHub, Twitter, governance forums and on-chain activity are pooled into the signal bundle.",
  },
  {
    n: "02",
    title: "Evaluation",
    body: "Genlayer LLM nodes process the bundle against your trust parameters and explain every score they produce.",
  },
  {
    n: "03",
    title: "Consensus",
    body: "Validators agree on the AI's output through the equivalence principle. Disagreement triggers re-evaluation.",
  },
  {
    n: "04",
    title: "Settlement",
    body: "The final score and AI explanation are committed to the contract as immutable state. Webhooks fan out to subscribers.",
  },
];

const STATS = [
  { label: "Network throughput", value: "12.4k TPS", hint: "Optimized for high-frequency reputation updates in DeFi and gaming." },
  { label: "Connected chains", value: "12+", hint: "EVM, Solana, Cosmos bridges live." },
  { label: "Validators", value: "400", hint: "Decentralized AI consensus." },
];

export default function EnginePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border/60">
        <Container className="grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
              Core technology
            </p>
            <h1 className="mt-3 text-balance font-display text-[40px] font-semibold leading-[1.05] tracking-tightest text-foreground sm:text-[56px]">
              The on-chain
              <br className="hidden sm:block" />
              reputation engine.
            </h1>
            <p className="mt-5 max-w-xl text-balance text-[17px] leading-relaxed text-accent">
              A deterministic evaluation layer built on Genlayer, enabling
              AI-powered sentiment analysis and credibility scoring directly
              within smart contracts.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/docs">
                  View protocol docs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/docs#api">Explore engine API</Link>
              </Button>
            </div>
          </div>
          <EngineMockCard />
        </Container>
      </section>

      {/* Pillars (dark) */}
      <DarkSection>
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Genlayer Intelligent Contracts
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-primary-foreground/70">
          The Reputon engine lives where AI meets consensus. We execute
          LLM-based reasoning inside the block production cycle, ensuring
          every reputation score is verifiable and tamper-proof.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-6"
            >
              <div className="grid h-9 w-9 place-items-center rounded-md border border-primary-foreground/15 bg-primary-foreground/[0.06]">
                <Icon className="h-4 w-4" strokeWidth={1.6} />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                {title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-primary-foreground/70">
                {body}
              </p>
            </div>
          ))}
        </div>
      </DarkSection>

      {/* How AI evaluation works */}
      <Section>
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            Architectural workflow
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            How AI evaluation works.
          </h2>
        </div>
        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((step, i) => (
            <li key={step.n} className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card font-mono text-[12px] tracking-[0.18em] text-foreground">
                  {step.n}
                </span>
                {i < FLOW.length - 1 && (
                  <span aria-hidden className="hidden h-px flex-1 bg-border lg:block" />
                )}
              </div>
              <h3 className="mt-5 font-display text-base font-semibold tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-accent">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Reputation API + code */}
      <Section bordered>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
              Reputation API
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Integrate trust in four lines.
            </h2>
            <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-accent">
              Drop our REST client into any dApp and read live scores backed by
              the Reputon contract. Subscribe to webhooks when a wallet
              crosses a threshold.
            </p>
            <ul className="mt-6 space-y-3 text-[13.5px] text-foreground">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-[3px] h-3.5 w-3.5 flex-none text-accent" />
                <span>
                  <span className="font-medium">Dynamic endpoints.</span>{" "}
                  <span className="text-accent">Query by wallet, ENS, or GitHub handle.</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Anchor className="mt-[3px] h-3.5 w-3.5 flex-none text-accent" />
                <span>
                  <span className="font-medium">Webhook notifications.</span>{" "}
                  <span className="text-accent">HMAC-signed deliveries on every score change.</span>
                </span>
              </li>
            </ul>
          </div>

          <CodePanel filename="get_reputation.ts">
            <code>
              {tok.c("// Initialize the engine")}
              {"\n"}
              {tok.k("import")} {"{ "}
              {tok.f("ReputonClient")}
              {" } "}
              {tok.k("from")} {tok.s("'@reputon/sdk'")};{"\n\n"}
              {tok.k("const")} {tok.f("client")} = {tok.k("new")}{" "}
              {tok.f("ReputonClient")}({"{ "}
              {"\n"}  {tok.f("apiKey")}: {tok.s("'rk_test_...'")},{"\n"}  {tok.f("baseUrl")}: {tok.s("'https://reputon-backend.fly.dev'")},{"\n"}
              {"}"});{"\n\n"}
              {tok.c("// Fetch trust score")}
              {"\n"}
              {tok.k("const")} {tok.f("score")} = {tok.k("await")}{" "}
              {tok.f("client")}.{tok.f("getScore")}({tok.s("'0x7401c129...58Eb'")});
              {"\n"}
              {tok.f("console")}.{tok.f("log")}({tok.s("`Score: ${score.score} (${score.category})`")});
              {"\n"}
              {tok.c("// → Score: 842 (eminent)")}
            </code>
          </CodePanel>
        </div>
      </Section>

      {/* Stats */}
      <Section bordered>
        <div className="grid gap-3 sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-accent">
                <Sigma className="h-3.5 w-3.5" />
                <p className="text-[10px] font-medium uppercase tracking-[0.18em]">
                  {s.label}
                </p>
              </div>
              <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
                {s.value}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-accent">{s.hint}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Closing CTA */}
      <Section>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft sm:p-12">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[12px] text-accent">
                <Database className="h-3.5 w-3.5 text-foreground" />
                <span>Genlayer Intelligent Contracts</span>
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                LLM calls that are deterministic enough to trust on-chain.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-accent">
                Reputon leans on Genlayer's equivalence principle: every
                validator re-runs the LLM call and votes on whether outputs
                agree. That makes AI-derived scores safe to commit on-chain.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/docs">
                Read the contract spec
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
