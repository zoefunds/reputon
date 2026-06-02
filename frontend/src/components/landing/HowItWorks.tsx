import { Container } from "@/components/ui/container";

const STEPS = [
  {
    n: "01",
    title: "Connect",
    body: "Link a wallet or sign in. Reputon ingests on-chain history, governance activity and any optional off-chain proofs.",
  },
  {
    n: "02",
    title: "Evaluate",
    body: "A Genlayer Intelligent Contract runs LLM equivalence checks across your activity and writes a verifiable score on-chain.",
  },
  {
    n: "03",
    title: "Carry it anywhere",
    body: "Query your score from any dApp via the Reputon API. Mint NFT credentials. Get gated access. Earn trust.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-border/60 py-24 sm:py-32">
      <Container>
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Three steps from wallet to portable reputation.
          </h2>
        </div>

        <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border/70 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="bg-background p-8">
              <span className="font-mono text-[11px] tracking-[0.18em] text-accent">
                STEP {s.n}
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-accent">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
