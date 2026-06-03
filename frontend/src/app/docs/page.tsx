import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/container";
import { CodePanel, tok } from "@/components/landing/CodePanel";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Reputon developer docs: quickstart, core concepts, REST API reference and contract integration.",
};

const SIDEBAR_GROUPS = [
  {
    title: "Getting started",
    links: [
      { label: "Introduction", href: "#introduction", active: true },
      { label: "Installation", href: "#installation" },
      { label: "Core concepts", href: "#concepts" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "SDK reference", href: "#quickstart" },
      { label: "API reference", href: "https://reputon-backend.fly.dev/v1/openapi.json", external: true },
      { label: "CLI tools", href: "https://docs.genlayer.com/", external: true },
      { label: "Webhooks", href: "#concepts" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Community FAQ", href: "/contact" },
      { label: "Showcase", href: "/use-cases" },
      { label: "GitHub repo", href: "https://github.com/zoefunds/reputon", external: true },
    ],
  },
];

const ON_THIS_PAGE = [
  { label: "Introduction", href: "#introduction", active: true },
  { label: "Installation", href: "#installation" },
  { label: "Quick start", href: "#quickstart" },
  { label: "SDK architecture", href: "#concepts" },
];

export default function DocsPage() {
  return (
    <Container className="grid gap-10 py-12 lg:grid-cols-[200px_1fr_200px]">
      {/* LEFT SIDEBAR */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <nav className="space-y-7">
          {SIDEBAR_GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground">
                {g.title}
              </p>
              <ul className="space-y-1.5 text-[13.5px]">
                {g.links.map((l) => {
                  const isExternal = "external" in l && l.external;
                  const cls = `block ${
                    "active" in l && l.active
                      ? "text-foreground font-medium"
                      : "text-accent hover:text-foreground"
                  }`;
                  return (
                    <li key={l.label}>
                      {isExternal ? (
                        <a href={l.href} target="_blank" rel="noreferrer" className={cls}>
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} className={cls}>
                          {l.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 space-y-12">
        <section id="introduction" className="scroll-mt-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-error">
            Introduction
          </p>
          <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.05] tracking-tightest text-foreground sm:text-[52px]">
            The Reputon Protocol
          </h1>
          <p className="mt-5 max-w-prose text-[15.5px] leading-relaxed text-foreground/80">
            Reputon is a decentralized reputation engine designed for the next
            generation of web applications. It provides a cryptographically
            secure layer for measuring trust, reliability, and social capital
            without compromising user privacy.
          </p>

          <div className="mt-8 relative h-64 w-full overflow-hidden rounded-xl border border-border bg-primary sm:h-80">
            <DocsHeroArt />
          </div>

          <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight text-foreground">
            Why Reputon?
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border-l-2 border-foreground bg-card p-5 shadow-soft">
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                Privacy first
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-accent">
                Zero-knowledge proofs ensure reputation is verifiable without
                revealing underlying sensitive data.
              </p>
            </div>
            <div className="rounded-xl border-l-2 border-foreground bg-card p-5 shadow-soft">
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                Immutable trust
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-accent">
                Scores are stored on-chain, ensuring history cannot be
                manipulated or erased by central authorities.
              </p>
            </div>
          </div>
        </section>

        <section id="installation" className="scroll-mt-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Installation
          </h2>
          <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-accent">
            Getting started with the Reputon SDK is straightforward. We support
            all major package managers including NPM, Yarn, and Bun.
          </p>
          <CodePanel filename="terminal" className="mt-5">
            <code>
              {tok.c("# Install via NPM")}
              {"\n"}npm install @reputon/sdk{"\n\n"}
              {tok.c("# Or via Yarn")}
              {"\n"}yarn add @reputon/sdk
            </code>
          </CodePanel>
        </section>

        <section id="quickstart" className="scroll-mt-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Quick start
          </h2>
          <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-accent">
            Initialize the Reputon client to start querying trust scores for any
            decentralized identity (DID) or wallet address.
          </p>
          <CodePanel filename="main.ts" className="mt-5">
            <code>
              {tok.k("import")} {"{ "}
              {tok.f("ReputonClient")}
              {" } "}
              {tok.k("from")} {tok.s("'@reputon/sdk'")};{"\n\n"}
              {tok.k("const")} {tok.f("client")} = {tok.k("new")}{" "}
              {tok.f("ReputonClient")}({"{"}
              {"\n"}  {tok.f("apiKey")}: {tok.s("'YOUR_REP_KEY'")},
              {"\n"}  {tok.f("baseUrl")}: {tok.s("'https://reputon-backend.fly.dev'")},
              {"\n"}
              {"}"});{"\n\n"}
              {tok.k("async function")} {tok.f("getTrustLevel")}({tok.f("address")}: {tok.k("string")}) {"{"}
              {"\n"}  {tok.k("const")} {tok.f("score")} = {tok.k("await")}{" "}
              {tok.f("client")}.{tok.f("getScore")}({tok.f("address")});
              {"\n"}  {tok.f("console")}.{tok.f("log")}({tok.s("`Trust level: ${score.category}`")});
              {"\n"}
              {"}"}
            </code>
          </CodePanel>
        </section>

        <section id="concepts" className="scroll-mt-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            SDK architecture
          </h2>
          <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-accent">
            The Reputon SDK is split into three layers: a thin REST client for
            scores and history, a webhook receiver helper with HMAC
            verification, and a contract-read adapter that bypasses our cache
            for the freshest on-chain value.
          </p>
          <dl className="mt-5 divide-y divide-border/60 rounded-xl border border-border bg-card">
            {[
              ["Score", "Integer 0 to 1000 produced by the contract, reproducible across validators via Genlayer's equivalence principle."],
              ["Confidence", "How sure the engine is. Low confidence means the AI lacked signal, so treat those scores conservatively."],
              ["Trust category", "Bucketed label (unverified, emerging, trusted, eminent) for cheap UI gating."],
              ["Endorsement", "A weighted vouch from one wallet to another. Weight equals the endorser's score at endorsement time."],
              ["Reputation NFT", "Soulbound on-chain credential for a milestone, readable by any dApp."],
            ].map(([t, d]) => (
              <div key={t} className="grid grid-cols-1 gap-1 px-5 py-4 sm:grid-cols-[160px_1fr] sm:gap-6">
                <dt className="font-mono text-[12px] uppercase tracking-[0.14em] text-foreground">
                  {t}
                </dt>
                <dd className="text-[14px] text-accent">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Prev / Next */}
        <nav className="grid gap-4 border-t border-border/60 pt-6 sm:grid-cols-2">
          <Link
            href="/engine"
            className="rounded-xl border border-border bg-card p-5 shadow-soft transition-colors hover:bg-background"
          >
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-accent">
              <ArrowLeft className="h-3.5 w-3.5" /> Previous
            </p>
            <p className="mt-2 font-display text-[15px] font-semibold tracking-tight text-foreground">
              The reputation engine
            </p>
          </Link>
          <Link
            href="/use-cases"
            className="rounded-xl border border-border bg-card p-5 text-right shadow-soft transition-colors hover:bg-background"
          >
            <p className="flex items-center justify-end gap-1.5 text-[11px] uppercase tracking-[0.18em] text-accent">
              Next <ArrowRight className="h-3.5 w-3.5" />
            </p>
            <p className="mt-2 font-display text-[15px] font-semibold tracking-tight text-foreground">
              Use cases
            </p>
          </Link>
        </nav>
      </main>

      {/* RIGHT RAIL */}
      <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground">
          On this page
        </p>
        <ul className="space-y-1.5 border-l border-border pl-3 text-[13px]">
          {ON_THIS_PAGE.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={
                  l.active
                    ? "block -ml-[14px] border-l-2 border-foreground pl-[11px] text-foreground"
                    : "block text-accent hover:text-foreground"
                }
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border border-border bg-card p-4 shadow-soft">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            Need help?
          </p>
          <a
            href="https://github.com/zoefunds/reputon/issues"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[13px] text-foreground hover:underline underline-offset-4"
          >
            Open an issue <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </aside>
    </Container>
  );
}

function DocsHeroArt() {
  return (
    <svg
      viewBox="0 0 1200 480"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="docsGlow" cx="50%" cy="60%" r="55%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
          <stop offset="65%" stopColor="#1f2937" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="480" fill="#1f2937" />
      <rect width="1200" height="480" fill="url(#docsGlow)" />
      {Array.from({ length: 90 }).map((_, i) => {
        const cx = 80 + ((i * 73) % 1040);
        const cy = 50 + ((i * 41) % 380);
        const r = 1.4 + (i % 3) * 0.4;
        const opacity = 0.35 + ((i * 11) % 6) / 12;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="#f59e0b" opacity={opacity} />;
      })}
      {Array.from({ length: 18 }).map((_, i) => {
        const x1 = 100 + ((i * 67) % 1000);
        const y1 = 80 + ((i * 49) % 360);
        const x2 = x1 + 60 + ((i * 17) % 80);
        const y2 = y1 + ((i % 2 === 0 ? 1 : -1) * (20 + ((i * 7) % 30)));
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#f59e0b"
            strokeWidth="0.6"
            opacity="0.4"
          />
        );
      })}
    </svg>
  );
}
