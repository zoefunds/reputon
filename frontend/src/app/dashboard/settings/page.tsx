import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/server/user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <Container className="space-y-6 py-10">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Settings</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
          Account
        </h1>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
          Profile
        </h2>
        <dl className="mt-4 divide-y divide-border/60">
          {[
            ["Display name", user.name ?? "—"],
            ["Email", user.email ?? "Wallet-only account"],
            ["Role", user.role],
            ["Primary wallet", user.primaryWallet?.address ?? "Not linked"],
            ["Chain", user.primaryWallet?.chain ?? "—"],
          ].map(([k, v]) => (
            <div
              key={k as string}
              className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[200px_1fr] sm:gap-6"
            >
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
                {k}
              </dt>
              <dd className="break-all text-[14px] text-foreground">{v as string}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-error/30 bg-error/5 p-6">
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
          Danger zone
        </h2>
        <p className="mt-1 text-[13px] text-accent">
          Account deletion isn't available in the Studio build. Revoke API keys
          and webhooks individually from their tabs.
        </p>
        <div className="mt-4">
          <Button variant="outline" size="sm" disabled>
            Delete account
          </Button>
        </div>
      </section>
    </Container>
  );
}
