import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";

export const metadata: Metadata = {
 title: "Documentation",
 description:
 "Reputon developer docs: quickstart, core concepts, REST API reference and contract integration.",
};

const API_BASE = "https://reputon-backend.fly.dev";
const REPUTON_ADDR = "0xD7975CeA5549459d6eF0913a9fd919d17DE3d911";
const NFT_ADDR = "0xEC90A80be181Cb2F839A855B2db73406FCbaF34d";
const SYBIL_ADDR = "0x3E2cCF5a85217b00B5EFBC499922ec0EC5841408";

const SECTIONS = [
 {
 id: "quickstart",
 title: "Quickstart",
 children: (
 <>
 <p>
 The fastest way to integrate Reputon is the public REST API. Every
 endpoint reads through to the Reputon Intelligent Contract on
 Genlayer StudioNet, so you always get the verified on-chain value.
 </p>
 <CodeBlock
 lines={[
 "# Fetch any wallet's reputation",
 `curl "${API_BASE}/v1/api/score?address=0xada000000000000000000000000000000000a000"`,
 ]}
 />
 <p>
 For server-side gating, prefer <code>POST /v1/api/verify</code>. It
 returns a signed payload you can validate without trusting your own
 cache.
 </p>
 <CodeBlock
 lines={[
 `curl -X POST ${API_BASE}/v1/api/verify \\`,
 ` -H "Content-Type: application/json" \\`,
 ` -d '{"address":"0xada...","score":932}'`,
 ]}
 />
 <p>
 Public read endpoints work without an API key. Write endpoints
 (currently <code>POST /v1/api/evaluate</code>) require a key minted
 from the dashboard.
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
 ["Score", "An integer 0 to 1000 produced by the contract. Reproducible across validators via Genlayer's equivalence principle."],
 ["Confidence", "How sure the engine is. Low confidence means the AI lacked signal, so treat those scores conservatively."],
 ["Trust category", "Bucketed label (unverified, emerging, trusted, eminent) for cheap UI gating."],
 ["Endorsement", "A weighted vouch from one wallet to another. Weight = endorser's score at endorsement time."],
 ["Reputation NFT", "On-chain credential for a milestone. Soulbound by default; protocol can flag a tier transferable."],
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
 <p>
 Base URL: <code>{API_BASE}</code>. Full OpenAPI 3.1 spec at{" "}
 <a
 href={`${API_BASE}/v1/openapi.json`}
 target="_blank"
 rel="noreferrer"
 className="underline underline-offset-4"
 >
 {API_BASE}/v1/openapi.json
 </a>
 .
 </p>
 <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground">
 Reputation
 </p>
 <ApiRow method="GET" path="/v1/api/profile?address=" body="Full profile for an address." />
 <ApiRow method="GET" path="/v1/api/score?address=" body="Integer score + confidence + category." />
 <ApiRow method="GET" path="/v1/api/history?address=&limit=" body="Paginated history with AI explanations." />
 <ApiRow method="GET" path="/v1/api/endorsements?address=&direction=given|received" body="Endorsement graph." />
 <ApiRow method="POST" path="/v1/api/evaluate" body="Queue an LLM evaluation. Returns 202 with job_id. Requires API key." />
 <ApiRow method="POST" path="/v1/api/verify" body="Returns a server-signed proof of a score." />

 <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground">
 On-chain reads (no cache)
 </p>
 <ApiRow method="GET" path="/v1/onchain/info" body="Live get_contract_info from the Reputon contract." />
 <ApiRow method="GET" path="/v1/onchain/nft/info" body="Live get_contract_info from the NFT contract." />
 <ApiRow method="GET" path="/v1/onchain/sybil/severity?address=" body="Highest active sybil flag for a wallet." />

 <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground">
 Account (Bearer auth)
 </p>
 <ApiRow method="GET" path="/v1/me/api-keys" body="List your API keys (prefix only)." />
 <ApiRow method="POST" path="/v1/me/api-keys" body="Create an API key. Plaintext returned once." />
 <ApiRow method="POST" path="/v1/me/webhooks" body="Register an HMAC-signed outbound webhook." />
 </>
 ),
 },
 {
 id: "auth",
 title: "Authentication",
 children: (
 <>
 <p>
 Public read endpoints work without auth (rate-limited per IP). Writes
 and account routes need an API key:
 </p>
 <CodeBlock
 lines={[
 'Authorization: Bearer rk_<env>_<24-char-base32>',
 ]}
 />
 <p>
 Create one from{" "}
 <Link href="/dashboard/api-keys" className="underline underline-offset-4">
 your dashboard
 </Link>
 . Keys are SHA-256-hashed at rest; the plaintext is shown exactly
 once on creation.
 </p>
 </>
 ),
 },
 {
 id: "webhooks",
 title: "Webhooks",
 children: (
 <>
 <p>
 When something material happens (a new score, a fresh endorsement, an
 evaluation completing) Reputon POSTs JSON to your endpoint with a
 signed header:
 </p>
 <CodeBlock
 lines={[
 "X-Reputon-Signature: t=<unix>,v1=<hex sha256>",
 "X-Reputon-Event: score.updated",
 "",
 "Body:",
 "{",
 " \"event\": \"score.updated\",",
 " \"payload\": { \"address\": \"0x...\", \"score\": 781 },",
 " \"attempt\": 1,",
 " \"ts\": \"2026-06-03T11:22:33Z\"",
 "}",
 ]}
 />
 <p>
 Verify by recomputing{" "}
 <code>HMAC-SHA256(secret, `${"{t}"}.${"{body}"}`)</code> and checking
 it equals <code>v1</code>. Reject deliveries older than five minutes
 to defeat replays. Reputon retries failed deliveries with
 exponential backoff for up to two hours.
 </p>
 </>
 ),
 },
 {
 id: "contracts",
 title: "Contract integration",
 children: (
 <>
 <p>
 Three Intelligent Contracts live on Genlayer StudioNet (chain id
 61999). Call them directly via the{" "}
 <a
 href="https://docs.genlayer.com/"
 target="_blank"
 rel="noreferrer"
 className="underline underline-offset-4"
 >
 Genlayer SDK
 </a>{" "}
 or read through Reputon's <code>/v1/onchain/*</code> for HTTP access.
 </p>
 <CodeBlock
 lines={[
 `NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api`,
 `NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999`,
 `NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS=${REPUTON_ADDR}`,
 `NEXT_PUBLIC_REPUTON_NFT_CONTRACT_ADDRESS=${NFT_ADDR}`,
 `NEXT_PUBLIC_SYBIL_ORACLE_CONTRACT_ADDRESS=${SYBIL_ADDR}`,
 ]}
 />
 <p>
 See <Link href="/engine" className="underline underline-offset-4">the engine page</Link>{" "}
 for the equivalence-principle flow that keeps AI-derived scores
 trustworthy on-chain.
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
 description="Everything you need to integrate Reputon: a 60 second quickstart, core concepts, full REST reference, webhooks, and the on-chain contract integration."
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
 <div className="grid grid-cols-[64px_1fr] items-start gap-4 border-b border-border/60 py-4 sm:grid-cols-[80px_280px_1fr]">
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
