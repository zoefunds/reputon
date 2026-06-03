"use client";

import { useEffect, useState } from "react";
import { Copy, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const EVENT_TYPES = [
  "profile.created",
  "score.updated",
  "endorsement.added",
  "endorsement.revoked",
  "evaluation.completed",
  "sybil.flagged",
  "nft.minted",
] as const;

type Hook = {
  id: string;
  url: string;
  eventTypes: string[];
  active: boolean;
  failCount: number;
  lastStatus: number | null;
  lastDeliveryAt: string | null;
  createdAt: string;
  secret_hint?: string;
  secret?: string; // only on creation
};

export function WebhooksPanel() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<Hook | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const r = await fetch("/api/me/webhooks", { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { webhooks: Hook[] };
      setHooks(j.webhooks ?? []);
    }
  }

  function toggleEvent(e: string) {
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function create() {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/me/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, eventTypes: events }),
      });
      const body = (await r.json()) as Hook & { error?: { message?: string } };
      if (!r.ok) throw new Error(body.error?.message ?? "Failed to register webhook");
      setRevealed(body);
      setUrl("");
      setEvents([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this webhook? Pending deliveries will be cancelled.")) return;
    await fetch(`/api/me/webhooks/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
          Register a webhook
        </h3>
        <p className="mt-1 text-[13px] text-accent">
          We sign every delivery with HMAC-SHA256 — verify the{" "}
          <code className="font-mono text-foreground">X-Reputon-Signature</code> header.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
              Endpoint URL
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/reputon"
              className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-accent/70 focus:border-foreground focus:outline-none"
            />
          </label>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
              Events (none = all)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EVENT_TYPES.map((e) => {
                const on = events.includes(e);
                return (
                  <button
                    key={e}
                    onClick={() => toggleEvent(e)}
                    className={
                      "rounded-full border px-2.5 py-0.5 font-mono text-[11px] " +
                      (on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-accent hover:text-foreground")
                    }
                  >
                    {e}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Button onClick={create} disabled={busy || !url}>
              <Plus className="h-4 w-4" />
              {busy ? "Registering…" : "Register webhook"}
            </Button>
            {error && <p className="text-[13px] text-error">{error}</p>}
          </div>
        </div>
        {revealed && (
          <div className="mt-4 rounded-md border border-success/40 bg-success/5 p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-success">
              Signing secret — copy now, you won't see it again
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="block flex-1 overflow-x-auto rounded bg-foreground/[0.04] px-3 py-2 font-mono text-[13px] text-foreground">
                {revealed.secret}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => revealed.secret && navigator.clipboard.writeText(revealed.secret)}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft">
        <div className="border-b border-border/70 p-5">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            Your webhooks
          </h3>
        </div>
        {hooks.length === 0 ? (
          <div className="p-10 text-center text-sm text-accent">No webhooks registered.</div>
        ) : (
          <ul className="divide-y divide-border/60">
            {hooks.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <WebhookIcon className="h-3.5 w-3.5 text-accent" />
                    <p className="truncate text-[13px] text-foreground">{h.url}</p>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-accent">
                    {(h.eventTypes ?? []).join(", ") || "all events"}
                  </p>
                  <p className="text-[11px] text-accent">
                    Last status {h.lastStatus ?? "—"} · fails {h.failCount} · secret {h.secret_hint ?? "—"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(h.id)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
