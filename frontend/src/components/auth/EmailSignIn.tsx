"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailSignIn({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signIn("nodemailer", {
        email,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) throw new Error(res.error);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send magic link.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-md border border-success/40 bg-success/5 p-4 text-[13px] text-foreground">
        Check <span className="font-mono">{email}</span> for a magic sign-in link.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label className="block">
        <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          Email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@protocol.xyz"
          className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-accent/70 focus:border-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={busy}>
        <Mail className="h-4 w-4" />
        {busy ? "Sending…" : "Email me a magic link"}
      </Button>
      {error && <p className="text-[13px] text-error">{error}</p>}
    </form>
  );
}
