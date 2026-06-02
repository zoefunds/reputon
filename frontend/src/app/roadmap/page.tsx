import type { Metadata } from "next";
import { Check, Circle, CircleDot } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "What's shipped, what's in flight, and what's next for the Reputon protocol.",
};

type Status = "done" | "active" | "planned";

const PHASES: { phase: string; title: string; status: Status; body: string }[] = [
  { phase: "Phase 0", title: "Foundations", status: "done", body: "Repo scaffold, workspaces, environment check, tooling baseline." },
  { phase: "Phase 1", title: "Design system & landing", status: "done", body: "Tailwind theme tokens, primitives, marketing Home page." },
  { phase: "Phase 2", title: "Marketing site", status: "active", body: "Features, Engine, Use Cases, Docs, Roadmap, Team, Contact." },
  { phase: "Phase 3", title: "Firebase wiring", status: "planned", body: "Auth (wallet + email + Google), Firestore schema, security rules, emulators." },
  { phase: "Phase 4", title: "Reputon Intelligent Contract", status: "planned", body: "Profile, score, history, endorsements, AI evaluation storage. StudioNet deploy." },
  { phase: "Phase 5", title: "NFT + Sybil contracts", status: "planned", body: "Reputation credential NFTs and LLM-backed sybil oracle." },
  { phase: "Phase 6", title: "Backend API", status: "planned", body: "Firebase Functions: 6 REST endpoints, webhooks, rate limits, RBAC." },
  { phase: "Phase 7", title: "User dashboard", status: "planned", body: "Score overview, breakdown, history chart, endorsements, NFT gallery." },
  { phase: "Phase 8", title: "Contribution analyzer", status: "planned", body: "GitHub, governance and contribution analysis via Genlayer LLMs." },
  { phase: "Phase 9", title: "Reputation NFT UI", status: "planned", body: "Mint flow, gallery, public profile pages." },
  { phase: "Phase 10", title: "Governance reputation", status: "planned", body: "DAO adapters, proposal-quality scoring, voter weighting." },
  { phase: "Phase 11", title: "Admin dashboard", status: "planned", body: "Protocol metrics, user analytics, AI evaluation logs, system health." },
  { phase: "Phase 12", title: "Security hardening", status: "planned", body: "RBAC matrix, rate limits, rules audit, contract review checklist." },
  { phase: "Phase 13", title: "Testing", status: "planned", body: "Unit + integration + e2e + contract tests." },
  { phase: "Phase 14", title: "Documentation", status: "planned", body: "README, API docs, deployment runbook, environment setup." },
  { phase: "Phase 15", title: "Production build", status: "planned", body: "Full prod build, StudioNet smoke test, deployment checklist." },
];

function StatusIcon({ s }: { s: Status }) {
  if (s === "done")
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-success/40 bg-success/10 text-success">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  if (s === "active")
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
        <CircleDot className="h-3.5 w-3.5" />
      </span>
    );
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-accent">
      <Circle className="h-3 w-3" />
    </span>
  );
}

function StatusBadge({ s }: { s: Status }) {
  const styles: Record<Status, string> = {
    done: "bg-success/10 text-success border-success/40",
    active: "bg-primary/10 text-primary border-primary/40",
    planned: "bg-foreground/[0.04] text-accent border-border",
  };
  const label: Record<Status, string> = {
    done: "Shipped",
    active: "In progress",
    planned: "Planned",
  };
  return (
    <span
      className={
        "inline-flex h-5 items-center rounded-full border px-2 font-mono text-[10px] uppercase tracking-[0.14em] " +
        styles[s]
      }
    >
      {label[s]}
    </span>
  );
}

export default function RoadmapPage() {
  return (
    <>
      <PageHeader
        kicker="Roadmap"
        title="Building Reputon in the open."
        description="The protocol ships in phases. Every milestone — from the first commit to production StudioNet — is enumerated below."
      />

      <Section>
        <ol className="relative space-y-6 border-l border-border pl-8">
          {PHASES.map((p) => (
            <li key={p.phase} className="relative">
              <div className="absolute -left-[44px] top-0">
                <StatusIcon s={p.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                  {p.phase}
                </span>
                <StatusBadge s={p.status} />
              </div>
              <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground">
                {p.title}
              </h3>
              <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-accent">
                {p.body}
              </p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
