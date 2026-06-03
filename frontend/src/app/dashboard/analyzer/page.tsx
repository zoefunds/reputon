import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/EmptyState";

export const dynamic = "force-dynamic";

export default function AnalyzerPage() {
  return (
    <Container className="space-y-6 py-10">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Analyzer</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
          Feed signals → score, on-chain.
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-accent">
          Submit a signal bundle (GitHub work, governance, contributions) and
          the Reputon Intelligent Contract runs a Genlayer LLM under the
          equivalence principle to update your score with an attached AI
          explanation.
        </p>
      </div>

      <EmptyState
        icon={<Sparkles className="h-4 w-4" />}
        title="Analyzer UI coming in Phase 8"
        body="The backend endpoint /v1/api/evaluate is live now — it queues an evaluation job and accepts your signals. In Phase 8 this page will ship the UI for it (GitHub picker, governance import, ad-hoc signals)."
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/api-keys">Create a key</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/docs#api">Read /evaluate docs</Link>
            </Button>
          </div>
        }
      />
    </Container>
  );
}
