import { Container } from "@/components/ui/container";
import { ApiKeysPanel } from "@/components/dashboard/ApiKeysPanel";

export const dynamic = "force-dynamic";

export default function ApiKeysPage() {
  return (
    <Container className="space-y-6 py-10">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Developer</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
          API keys
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-accent">
          Authenticate Reputon API requests with{" "}
          <code className="font-mono text-foreground">
            Authorization: Bearer rk_…
          </code>
          . Use{" "}
          <span className="font-mono text-foreground">test</span> for development
          and{" "}
          <span className="font-mono text-foreground">live</span> for production.
        </p>
      </div>
      <ApiKeysPanel />
    </Container>
  );
}
