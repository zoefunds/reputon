import {
  Activity,
  BrainCircuit,
  ShieldCheck,
  Vote,
  Award,
  Code2,
} from "lucide-react";
import { Container } from "@/components/ui/container";

const FEATURES = [
  {
    icon: Activity,
    title: "Dynamic scoring",
    body: "Reputation is continuously re-evaluated from wallet behavior and cross-protocol activity, never a stale snapshot.",
  },
  {
    icon: BrainCircuit,
    title: "AI contribution analysis",
    body: "Genlayer LLMs grade pull requests, proposals and community work, with natural-language explanations attached to every score.",
  },
  {
    icon: ShieldCheck,
    title: "Sybil resistance",
    body: "On-chain LLM equivalence checks flag fake endorsements, reputation farming and coordinated bot rings before they pollute scores.",
  },
  {
    icon: Vote,
    title: "Governance reputation",
    body: "Track votes, proposal quality and decision impact across DAOs. Reputable participants surface, brigading does not.",
  },
  {
    icon: Award,
    title: "NFT credentials",
    body: "Mint portable, on-chain proofs for milestones and achievements, readable by any dApp, ownable by any wallet.",
  },
  {
    icon: Code2,
    title: "Reputation API",
    body: "Drop-in REST endpoints and webhooks. Query a wallet's score, history and endorsements with a single call, verified on-chain.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            Reputation, rebuilt
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            One score. Every protocol. Verifiable on-chain.
          </h2>
          <p className="mt-4 max-w-xl text-balance text-accent">
            Reputon brings together the primitives every Web3 app keeps
            re-implementing: scoring, sybil resistance, credentials and an API,
            into a single, AI-evaluated layer.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="group rounded-2xl border border-border bg-card p-7 shadow-soft transition-colors hover:bg-background"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </div>
              <h3 className="mt-5 font-display text-[15.5px] font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-accent">
                {body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
