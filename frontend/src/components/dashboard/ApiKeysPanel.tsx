"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Key = {
 id: string;
 name: string;
 env: "test" | "live";
 prefix: string;
 scopes: string[];
 lastUsedAt: string | null;
 createdAt: string;
 revokedAt: string | null;
};

export function ApiKeysPanel() {
 const [keys, setKeys] = useState<Key[]>([]);
 const [busy, setBusy] = useState(false);
 const [name, setName] = useState("");
 const [env, setEnv] = useState<"test" | "live">("test");
 const [revealed, setRevealed] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 void load();
 }, []);

 async function load() {
 const r = await fetch("/api/me/api-keys", { cache: "no-store" });
 if (r.ok) {
 const j = (await r.json()) as { keys: Key[] };
 setKeys(j.keys ?? []);
 }
 }

 async function create() {
 setError(null);
 setRevealed(null);
 setBusy(true);
 try {
 const r = await fetch("/api/me/api-keys", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ name: name || "default", env }),
 });
 const body = (await r.json()) as { key?: string; error?: { message?: string } };
 if (!r.ok) throw new Error(body.error?.message ?? "Failed to create key");
 setRevealed(body.key ?? null);
 setName("");
 await load();
 } catch (e) {
 setError(e instanceof Error ? e.message : "Create failed");
 } finally {
 setBusy(false);
 }
 }

 async function revoke(id: string) {
 if (!confirm("Revoke this key? Active integrations will stop working.")) return;
 await fetch(`/api/me/api-keys/${id}`, { method: "DELETE" });
 await load();
 }

 return (
 <div className="space-y-6">
 {/* create */}
 <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
 <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
 Create a new key
 </h3>
 <p className="mt-1 text-[13px] text-accent">
 Plain-text keys are shown once. Store them securely.
 </p>
 <div className="mt-4 flex flex-wrap items-end gap-3">
 <label className="flex-1 min-w-[180px]">
 <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
 Name
 </span>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="e.g. analytics integration"
 className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-accent/70 focus:border-foreground focus:outline-none"
 />
 </label>
 <label>
 <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
 Env
 </span>
 <select
 value={env}
 onChange={(e) => setEnv(e.target.value as "test" | "live")}
 className="mt-1.5 block rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:border-foreground focus:outline-none"
 >
 <option value="test">test</option>
 <option value="live">live</option>
 </select>
 </label>
 <Button onClick={create} disabled={busy}>
 <Plus className="h-4 w-4" />
 {busy ? "Creating…" : "Create key"}
 </Button>
 </div>
 {error && <p className="mt-2 text-[13px] text-error">{error}</p>}
 {revealed && (
 <div className="mt-4 rounded-md border border-success/40 bg-success/5 p-3">
 <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-success">
 New key , copy now, you won't see it again
 </p>
 <div className="mt-2 flex items-center gap-2">
 <code className="block flex-1 overflow-x-auto rounded bg-foreground/[0.04] px-3 py-2 font-mono text-[13px] text-foreground">
 {revealed}
 </code>
 <Button
 size="sm"
 variant="outline"
 onClick={() => navigator.clipboard.writeText(revealed)}
 >
 <Copy className="h-3.5 w-3.5" /> Copy
 </Button>
 </div>
 </div>
 )}
 </div>

 {/* list */}
 <div className="rounded-xl border border-border bg-card shadow-soft">
 <div className="border-b border-border/70 p-5">
 <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
 Your keys
 </h3>
 </div>
 {keys.length === 0 ? (
 <div className="p-10 text-center text-sm text-accent">No keys yet.</div>
 ) : (
 <ul className="divide-y divide-border/60">
 {keys.map((k) => (
 <li key={k.id} className="flex items-center justify-between gap-4 p-4">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <KeyRound className="h-3.5 w-3.5 text-accent" />
 <span className="font-mono text-[13px] text-foreground">{k.prefix}…</span>
 <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-accent">
 {k.env}
 </span>
 {k.revokedAt && (
 <span className="rounded border border-error/40 bg-error/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-error">
 revoked
 </span>
 )}
 </div>
 <p className="mt-0.5 text-[13px] text-foreground/80">{k.name}</p>
 <p className="text-[11px] text-accent">
 Created {new Date(k.createdAt).toLocaleDateString()} ·{" "}
 {k.lastUsedAt
 ? `Last used ${new Date(k.lastUsedAt).toLocaleString()}`
 : "Never used"}
 </p>
 </div>
 {!k.revokedAt && (
 <Button variant="ghost" size="sm" onClick={() => revoke(k.id)}>
 <Trash2 className="h-4 w-4" />
 Revoke
 </Button>
 )}
 </li>
 ))}
 </ul>
 )}
 </div>
 </div>
 );
}
