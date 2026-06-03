import { Wallet } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Analyzer } from "@/components/analyzer/Analyzer";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { WalletLinker } from "@/components/dashboard/WalletLinker";
import { requireUser } from "@/lib/server/user";

export const dynamic = "force-dynamic";

export default async function AnalyzerPage() {
  const user = await requireUser();

  return (
    <Container className="space-y-6 py-10">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Analyzer</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
          Feed signals → score, on-chain.
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-accent">
          Submit GitHub work, governance involvement and contributions. We
          assemble the signal bundle, queue an on-chain evaluation, and stream
          status back to this page. The Genlayer LLM runs under the equivalence
          principle inside the contract.
        </p>
      </div>

      {!user.primaryWallet ? (
        <EmptyState
          icon={<Wallet className="h-4 w-4" />}
          title="Link a wallet first"
          body="Evaluations write to the contract keyed by wallet — link one to continue."
          action={<WalletLinker />}
        />
      ) : (
        <Analyzer />
      )}
    </Container>
  );
}
