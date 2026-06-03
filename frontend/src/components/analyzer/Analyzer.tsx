"use client";

import { useEffect, useRef, useState } from "react";
import {
  Github,
  Vote,
  Sparkles,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustBadge } from "@/components/dashboard/TrustBadge";

type Governance = {
  dao: string;
  role: "voter" | "author";
  quality_note?: string;
  proposal_ids?: string[];
};
type Contribution = {
  source: "github" | "content" | "community" | "education" | "protocol";
  title: string;
  url?: string;
  summary?: string;
};

type Bundle = {
  address: string;
  generated_at: string;
  github: { totals?: Record<string, number>; user?: { login: string } | null } | null;
  governance: Governance[];
  contributions: Contribution[];
  endorsements_count: number;
  notes?: string;
};

type Job = {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  address: string;
  onchainTxHash: string | null;
  error: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export function Analyzer() {
  const [githubHandle, setGithubHandle] = useState("");
  const [governance, setGovernance] = useState<Governance[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [endorsementsCount, setEndorsementsCount] = useState(0);
  const [notes, setNotes] = useState("");

  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [evalBusy, setEvalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    []
  );

  async function preview() {
    setError(null);
    setPreviewBusy(true);
    try {
      const res = await fetch("/api/me/signals/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_handle: githubHandle || undefined,
          governance,
          contributions,
          endorsements_count: endorsementsCount,
          notes: notes || undefined,
        }),
      });
      const body = (await res.json()) as { bundle?: Bundle; error?: { message?: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Preview failed");
      setBundle(body.bundle ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function runEvaluation() {
    setError(null);
    setEvalBusy(true);
    setJob(null);
    try {
      const res = await fetch("/api/me/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_handle: githubHandle || undefined,
          governance,
          contributions,
          endorsements_count: endorsementsCount,
          notes: notes || undefined,
        }),
      });
      const body = (await res.json()) as {
        job_id?: string;
        status?: Job["status"];
        bundle?: Bundle;
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(body.error?.message ?? "Queue failed");
      if (body.bundle) setBundle(body.bundle);
      const initial: Job = {
        id: body.job_id ?? "",
        status: body.status ?? "queued",
        address: bundle?.address ?? "",
        onchainTxHash: null,
        error: null,
        attempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setJob(initial);
      startPolling(initial.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Queue failed");
    } finally {
      setEvalBusy(false);
    }
  }

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/me/evaluate?id=${id}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as Job;
        setJob(j);
        if (j.status === "done" || j.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        /* swallow */
      }
    }, 1500);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        {/* GitHub */}
        <Card title="GitHub" icon={<Github className="h-4 w-4" />}>
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
              Handle
            </span>
            <input
              type="text"
              value={githubHandle}
              onChange={(e) => setGithubHandle(e.target.value)}
              placeholder="e.g. torvalds"
              className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-accent/70 focus:border-foreground focus:outline-none"
            />
            <span className="mt-1 block text-[12px] text-accent">
              Reputon fetches your last 5 repos + 15 PRs and bundles them as signals.
            </span>
          </label>
        </Card>

        {/* Governance */}
        <Card
          title="Governance"
          icon={<Vote className="h-4 w-4" />}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setGovernance([
                  ...governance,
                  { dao: "", role: "voter", proposal_ids: [] },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add row
            </Button>
          }
        >
          {governance.length === 0 ? (
            <p className="text-[13px] text-accent">No governance entries yet.</p>
          ) : (
            <ul className="space-y-3">
              {governance.map((g, i) => (
                <li
                  key={i}
                  className="grid grid-cols-1 gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[1fr_140px_auto]"
                >
                  <input
                    placeholder="DAO name"
                    value={g.dao}
                    onChange={(e) =>
                      setGovernance(
                        governance.map((x, j) => (i === j ? { ...x, dao: e.target.value } : x))
                      )
                    }
                    className="rounded border border-border bg-background px-2 py-1 text-[13px]"
                  />
                  <select
                    value={g.role}
                    onChange={(e) =>
                      setGovernance(
                        governance.map((x, j) =>
                          i === j ? { ...x, role: e.target.value as "voter" | "author" } : x
                        )
                      )
                    }
                    className="rounded border border-border bg-background px-2 py-1 text-[13px]"
                  >
                    <option value="voter">voter</option>
                    <option value="author">author</option>
                  </select>
                  <button
                    onClick={() => setGovernance(governance.filter((_, j) => j !== i))}
                    className="text-accent hover:text-error"
                    aria-label="remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Contributions */}
        <Card
          title="Contributions"
          icon={<Sparkles className="h-4 w-4" />}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setContributions([
                  ...contributions,
                  { source: "github", title: "", url: "" },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add row
            </Button>
          }
        >
          {contributions.length === 0 ? (
            <p className="text-[13px] text-accent">No contributions yet.</p>
          ) : (
            <ul className="space-y-3">
              {contributions.map((c, i) => (
                <li
                  key={i}
                  className="grid grid-cols-1 gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[140px_1fr_auto]"
                >
                  <select
                    value={c.source}
                    onChange={(e) =>
                      setContributions(
                        contributions.map((x, j) =>
                          i === j ? { ...x, source: e.target.value as Contribution["source"] } : x
                        )
                      )
                    }
                    className="rounded border border-border bg-background px-2 py-1 text-[13px]"
                  >
                    {(["github", "content", "community", "education", "protocol"] as const).map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      )
                    )}
                  </select>
                  <input
                    placeholder="Title (and optional URL on the next field)"
                    value={c.title}
                    onChange={(e) =>
                      setContributions(
                        contributions.map((x, j) => (i === j ? { ...x, title: e.target.value } : x))
                      )
                    }
                    className="rounded border border-border bg-background px-2 py-1 text-[13px]"
                  />
                  <button
                    onClick={() => setContributions(contributions.filter((_, j) => j !== i))}
                    className="text-accent hover:text-error"
                    aria-label="remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <input
                    placeholder="URL (optional)"
                    value={c.url ?? ""}
                    onChange={(e) =>
                      setContributions(
                        contributions.map((x, j) => (i === j ? { ...x, url: e.target.value } : x))
                      )
                    }
                    className="rounded border border-border bg-background px-2 py-1 text-[12px] sm:col-span-3"
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Notes */}
        <Card title="Notes for the engine">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any context the LLM should weigh (optional)…"
            rows={3}
            className="block w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-accent/70 focus:border-foreground focus:outline-none"
          />
          <div className="mt-3 flex items-center gap-3">
            <label className="text-[12px] text-accent">Endorsements (informational):</label>
            <input
              type="number"
              min={0}
              value={endorsementsCount}
              onChange={(e) => setEndorsementsCount(Number(e.target.value) || 0)}
              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-[13px]"
            />
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={preview} disabled={previewBusy}>
            {previewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Preview bundle
          </Button>
          <Button onClick={runEvaluation} disabled={evalBusy}>
            {evalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Run evaluation
          </Button>
          {error && (
            <p className="flex items-center gap-1 text-[13px] text-error">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>
      </div>

      <aside className="space-y-6">
        <Card title="Signal bundle">
          {bundle ? (
            <>
              <p className="text-[12px] text-accent">
                Generated{" "}
                {new Date(bundle.generated_at).toLocaleString()} · wallet{" "}
                <span className="font-mono">
                  {bundle.address.slice(0, 8)}…{bundle.address.slice(-4)}
                </span>
              </p>
              <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-[11.5px] leading-relaxed text-foreground">
                {JSON.stringify(bundle, null, 2)}
              </pre>
            </>
          ) : (
            <p className="text-[13px] text-accent">
              Click <span className="font-medium">Preview bundle</span> to see what
              we'd send to the contract.
            </p>
          )}
        </Card>

        <Card title="Evaluation status">
          {!job ? (
            <p className="text-[13px] text-accent">
              No evaluation queued yet.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <StatusBadge status={job.status} />
                <span className="font-mono text-accent">{short(job.id)}</span>
              </div>
              {job.onchainTxHash && (
                <p className="break-all text-[12px] text-accent">
                  tx <span className="font-mono text-foreground">{job.onchainTxHash}</span>
                </p>
              )}
              {job.error && (
                <p className="text-[12.5px] text-error">{job.error}</p>
              )}
              {job.status === "done" && (
                <p className="flex items-center gap-1 text-[13px] text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Score is updated on-chain. Head back to{" "}
                  <a className="underline underline-offset-4" href="/dashboard">
                    your dashboard
                  </a>
                  .
                </p>
              )}
              <p className="text-[11px] text-accent">
                Attempts: {job.attempts}. Last update{" "}
                {new Date(job.updatedAt).toLocaleString()}.
              </p>
            </div>
          )}
        </Card>
      </aside>
    </div>
  );
}

function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-foreground">{icon}</span>}
          <h3 className="font-display text-[14.5px] font-semibold tracking-tight text-foreground">
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: Job["status"] }) {
  if (status === "queued") return <TrustBadge category="emerging" />;
  if (status === "running") return <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">running</span>;
  if (status === "done") return <TrustBadge category="eminent" />;
  return (
    <span className="rounded-full border border-error/40 bg-error/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-error">
      failed
    </span>
  );
}

function short(s: string) {
  return s ? `${s.slice(0, 6)}…${s.slice(-4)}` : "—";
}
