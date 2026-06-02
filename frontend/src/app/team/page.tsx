import type { Metadata } from "next";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";

export const metadata: Metadata = {
  title: "Team",
  description:
    "The team building Reputon — engineers, designers and protocol researchers obsessed with portable on-chain trust.",
};

const TEAM = [
  {
    name: "Reputon Core",
    role: "Protocol engineering",
    body: "Designs the Reputon contract, scoring math, and the LLM equivalence flow that keeps AI outputs reproducible on-chain.",
    initials: "RC",
  },
  {
    name: "Reputon Studio",
    role: "Product & design",
    body: "Owns the dashboard, analyzer and developer experience. Minimal, fast, no-friction UI inspired by the best of Stripe and Linear.",
    initials: "RS",
  },
  {
    name: "Reputon Research",
    role: "AI & sybil resistance",
    body: "Researches contribution evaluation, sybil patterns, endorsement graphs and adversarial behavior on the protocol.",
    initials: "RR",
  },
];

const VALUES = [
  {
    title: "Portable by default",
    body: "If a reputation isn't portable, it isn't reputation. Everything we ship is queryable from any chain or app.",
  },
  {
    title: "Verifiable AI",
    body: "We use AI where it makes scores smarter — and only where its outputs can be re-checked, on-chain, by anyone.",
  },
  {
    title: "No vendor lock-in",
    body: "The contract is the source of truth. Our app is one client; yours can be another.",
  },
  {
    title: "Honest uncertainty",
    body: "Every score ships with a confidence. We'd rather surface doubt than fake precision.",
  },
];

export default function TeamPage() {
  return (
    <>
      <PageHeader
        kicker="Team"
        title="A small group, building a primitive."
        description="Reputon is built by engineers and researchers who think reputation deserves the same care as money. We work in the open."
      />

      <Section>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border/70 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m) => (
            <article key={m.name} className="bg-background p-7">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary font-display text-lg font-semibold text-primary-foreground">
                {m.initials}
              </div>
              <h2 className="mt-5 font-display text-lg font-semibold tracking-tight text-foreground">
                {m.name}
              </h2>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                {m.role}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-accent">
                {m.body}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section bordered>
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
              How we think
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Principles that pick our trade-offs.
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border/70 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-background p-6">
                <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                  {v.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-accent">
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
