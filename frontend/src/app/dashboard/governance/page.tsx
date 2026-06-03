import { Wallet } from "lucide-react";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { WalletLinker } from "@/components/dashboard/WalletLinker";
import { GovernancePanel } from "@/components/governance/GovernancePanel";
import { requireUser } from "@/lib/server/user";
import { onchain } from "@/lib/server/onchain";

export const dynamic = "force-dynamic";

export default async function GovernancePage() {
  const user = await requireUser();
  const score = user.primaryWallet
    ? (await onchain.score(user.primaryWallet.address))?.score ?? null
    : null;

  return (
    <Container className="space-y-6 py-10">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Governance</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
          DAOs you move.
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-accent">
          Imports your Snapshot.org votes and authored proposals, scores
          per-DAO quality, and computes how a Reputon-aware DAO would weight your
          vote.
        </p>
      </div>

      {!user.primaryWallet ? (
        <EmptyState
          icon={<Wallet className="h-4 w-4" />}
          title="Link a wallet first"
          body="Snapshot activity is keyed to an EVM wallet — link one to import."
          action={<WalletLinker />}
        />
      ) : (
        <GovernancePanel initialScore={score} />
      )}
    </Container>
  );
}
