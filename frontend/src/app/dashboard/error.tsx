"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[reputon-dashboard]", error);
  }, [error]);

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-error/30 bg-error/5 p-8 text-center">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-md border border-error/40 bg-background text-error">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground">
          Something went wrong on this page.
        </h1>
        <p className="mt-2 text-[14px] text-accent">
          We logged the error to your browser console with the
          <code className="ml-1 font-mono text-foreground">[reputon-dashboard]</code> prefix.
          Try again or head back to your dashboard.
        </p>
        {error?.message && (
          <pre className="mt-5 overflow-x-auto rounded-md border border-border bg-card p-3 text-left font-mono text-[12px] text-foreground">
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>
            <RefreshCcw className="h-4 w-4" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
