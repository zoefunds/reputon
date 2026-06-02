import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Reputon developer docs: quickstart, core concepts, REST API reference and contract integration.",
};

const SECTIONS = [
  {
    id: "quickstart",
    title: "Quickstart",
    children: (
      <>
        <p>
          The fastest way to integrate Reputon is the REST API. Every endpoint
          is read-through to the Reputon Intelligent Contract on Genlayer
          StudioNet — you'll always get the verified, on-chain value.
        </p>
        <CodeBlock
          lines={[
            "# Fetch a wallet's reputation",
            "curl https://api.reputon.xyz/v1/score?address=0xabc...",
          ]}
        />
        <p>
          For server-side gating, prefer <code>POST /verify</code> — it returns
          a signed payload you can validate without trusting your own cache.
        </p>
      </>
    ),
  },
  {
    id: "concepts",
    title: "Core concepts",
    children: (
      <>
        <DefList
          items={[
            ["Profile", "The canonical record for a wallet: address, score, category, history pointer, NFT credentials."],
            ["Score", "An integer 0–1000 produced by the contract. Reproducible across validators via Genlayer's equivalence principle."],
            ["Confidence", "How sure the engine is. Low confidence means the AI lacked signal; treat such scores conservatively."],
            ["Trust category", "Bucketed label (unverified · emerging · trusted · eminent) for cheap UI checks."],
            ["Endorsement", "A weighted vouch from one wallet to another. Weight = endorser's score at endorsement time."],
            ["Reputation NFT", "On-chain credential for a milestone. Soulbound by default; protocol-transferable when needed."],
          ]}
        />
      </>
    ),
  },
  {
    id: "api",
    title: "API reference",
    children: (
      <>
        <ApiRow method="GET" path="/profile" body="Full profile for an address." />
        <ApiRow method="GET" path="/score" body="Just the integer score + confidence + category." />
        <ApiRow method="GET" path="/history" body="Paginated history of score updates with AI explanations." />
        <ApiRow method="GET" path="/endorsements" body="Inbound and outbound endorsements for an address." />
        <ApiRow method="POST" path="/evaluate" body="Trigger an LLM evaluation. Returns score + on-chain tx hash." />
        <ApiRow method="POST" path="/verify" body="Returns a signed payload proving a score at a given block." />
      </>
    ),
  },
  {
    id: "contracts",
    title: "Contract integration",
    children: (
      <>
        <p>
          Contracts deploy on Genlayer StudioNet. Addresses are written to the
          frontend env at build time once Phase 4 deploys:
        </p>
        <CodeBlock
          lines={[
            "NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS=0x...",
            "NEXT_PUBLIC_REPUTON_NFT_CONTRACT_ADDRESS=0x...",
            "NEXT_PUBLIC_SYBIL_ORACLE_CONTRACT_ADDRESS=0x...",
          ]}
        />
        <p>
          See <Link href="/engine" className="underline underline-offset-4">the engine page</Link>{" "}
          for the equivalence-principle flow and{" "}
          <Link href="/roadmap" className="underline underline-offset-4">the roadmap</Link>{" "}
          for shipping milestones.
        </p>
      </>
    ),
  },
];

export default function DocsPage() {
  return (
    <>
      <PageHeader
        kicker="Docs"
        title="Build with portable reputation."
        description="Everything you need to integrate Reputon: a 60-second quickstart, the core concepts, and the full REST + contract reference."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
              On this page
            </p>
            <nav className="mt-4 space-y-2 text-[14px]">
              {SECTIONS.map((s) => (
                <Link
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-foreground/80 hover:text-foreground"
                >
                  {s.title}
                </Link>
              ))}
            </nav>
          </aside>

          <div className="space-y-16">
            {SECTIONS.map((s) => (
              <article key={s.id} id={s.id} className="scroll-mt-20">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {s.title}
                </h2>
                <div className="prose-reputon mt-5 space-y-4 text-[15px] leading-relaxed text-accent">
                  {s.children}
                </div>
              </article>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}

function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-[12.5px] leading-relaxed text-foreground">
      {lines.join("\n")}
    </pre>
  );
}

function DefList({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid gap-4 border-y border-border/70 py-2">
      {items.map(([term, def]) => (
        <div
          key={term}
          className="grid grid-cols-1 gap-1 border-b border-border/40 py-3 last:border-b-0 sm:grid-cols-[160px_1fr] sm:gap-6"
        >
          <dt className="font-mono text-[12px] uppercase tracking-[0.14em] text-foreground">
            {term}
          </dt>
          <dd className="text-[14px] text-accent">{def}</dd>
        </div>
      ))}
    </dl>
  );
}

function ApiRow({
  method,
  path,
  body,
}: {
  method: "GET" | "POST";
  path: string;
  body: string;
}) {
  return (
    <div className="grid grid-cols-[64px_1fr] items-start gap-4 border-b border-border/60 py-4 sm:grid-cols-[80px_220px_1fr]">
      <span
        className={
          "inline-flex h-6 w-fit items-center rounded-md px-2 font-mono text-[11px] font-semibold " +
          (method === "GET"
            ? "bg-foreground/[0.06] text-foreground"
            : "bg-primary text-primary-foreground")
        }
      >
        {method}
      </span>
      <code className="font-mono text-[13px] text-foreground">{path}</code>
      <p className="text-[14px] text-accent sm:col-start-3">{body}</p>
    </div>
  );
}
