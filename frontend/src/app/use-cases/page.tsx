import type { Metadata } from "next";
import {
  Banknote,
  Vote,
  Gift,
  Lock,
  Users,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";

export const metadata: Metadata = {
  title: "Use cases",
  description:
    "Lending, DAOs, gated access, airdrops, identity, governance — concrete ways Reputon's portable reputation slots into your protocol.",
};

const CASES = [
  {
    icon: Banknote,
    title: "Reputation-backed lending",
    audience: "DeFi · Money markets",
    body: "Reduce collateral requirements for high-reputation borrowers. Liquidation thresholds and rate curves can be parameterised by Reputon score, with the AI explanation surfaced in the UI for transparency.",
    integrations: [
      "Pull live score via /score",
      "Subscribe to score changes via webhook",
      "Read trust category to choose rate tier",
    ],
  },
  {
    icon: Vote,
    title: "Sybil-resistant governance",
    audience: "DAOs · Voting tools",
    body: "Weight votes by Reputon score, exclude obvious sybil clusters before tallying, and surface reputable proposers up the queue. Works as a plugin layer — no change to existing token-voting.",
    integrations: [
      "Gate proposals behind a minimum score",
      "Use sybil oracle to filter voter set",
      "Show endorsement graph on proposals",
    ],
  },
  {
    icon: Gift,
    title: "Smarter airdrops",
    audience: "Token launches · Growth",
    body: "Replace farm-prone snapshots with reputation-weighted distributions. High-reputation contributors get rewarded for real engagement, not just timing — and you can prove the rules on-chain.",
    integrations: [
      "Score gating in the claim contract",
      "Per-category weighting (governance vs activity)",
      "Mint NFT credentials for top recipients",
    ],
  },
  {
    icon: Lock,
    title: "Reputation-gated access",
    audience: "Communities · Premium dApps",
    body: "Open features, channels or trades to users above a threshold. Because Reputon scores are portable, users don't have to grind from zero in every new app.",
    integrations: [
      "Drop-in <ScoreBadge /> for client-side gating",
      "Server-side verify endpoint for sensitive actions",
      "Tiered access by trust category",
    ],
  },
  {
    icon: Users,
    title: "Endorsement networks",
    audience: "Talent · Communities",
    body: "Reputable users vouch for newcomers. Endorsement weight is the endorser's own score — so trust compounds honestly and Sybil endorsements don't move the needle.",
    integrations: [
      "Submit endorsements through the contract",
      "Read the endorsement graph from /endorsements",
      "Auto-mint relationship NFTs",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Identity & KYC-lite",
    audience: "Onboarding · Compliance-adjacent",
    body: "Use reputation as a soft signal where full KYC is overkill: dust-attack defence, rate-limit bypass, anti-spam, fairness in matchmaking. The score never reveals identity — only behavior.",
    integrations: [
      "Throttle by score in middleware",
      "Boost match quality with category subscores",
      "Combine with on-chain attestations",
    ],
  },
];

export default function UseCasesPage() {
  return (
    <>
      <PageHeader
        kicker="Use cases"
        title="Where portable reputation changes the equation."
        description="Reputon is a primitive, not a product. Plug it into lending, governance, airdrops, gating, identity — anywhere trust is currently expensive, missing, or sybil-prone."
      />

      <Section>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border/70 lg:grid-cols-2">
          {CASES.map(({ icon: Icon, title, audience, body, integrations }) => (
            <article key={title} className="bg-background p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground">
                  <Icon className="h-[16px] w-[16px]" strokeWidth={1.6} />
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                  {audience}
                </p>
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-foreground">
                {title}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-accent">
                {body}
              </p>
              <ul className="mt-5 space-y-2 border-t border-border/70 pt-4">
                {integrations.map((i) => (
                  <li
                    key={i}
                    className="text-[13px] text-foreground/80 before:mr-2 before:text-accent before:content-['—']"
                  >
                    {i}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
