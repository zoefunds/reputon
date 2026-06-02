import { Container } from "@/components/ui/container";

const PARTNERS = [
  "GENLAYER",
  "STUDIONET",
  "DAO TOOLS",
  "LENDING DAPPS",
  "GOVERNANCE",
  "IDENTITY",
];

export function TrustStrip() {
  return (
    <section className="border-y border-border/60 bg-background/60">
      <Container className="py-8">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] text-accent">
          Built for the next generation of trust-aware applications
        </p>
        <div className="mt-6 grid grid-cols-3 items-center gap-y-4 sm:grid-cols-6">
          {PARTNERS.map((p) => (
            <div
              key={p}
              className="text-center font-mono text-[11px] tracking-[0.2em] text-accent/70"
            >
              {p}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
