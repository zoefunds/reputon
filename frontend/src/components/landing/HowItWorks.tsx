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
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Three steps to portable reputation.
          </h2>
        </div>

        <ol className="mt-14 grid gap-10 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-foreground/[0.06] font-mono text-[12px] font-semibold tracking-[0.14em] text-foreground">
                  {s.n}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="hidden h-px flex-1 bg-border md:block"
                  />
                )}
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-tight text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-accent">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
