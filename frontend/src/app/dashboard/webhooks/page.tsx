import { Container } from "@/components/ui/container";
import { WebhooksPanel } from "@/components/dashboard/WebhooksPanel";

export const dynamic = "force-dynamic";

export default function WebhooksPage() {
 return (
 <Container className="space-y-6 py-10">
 <div>
 <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Developer</p>
 <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
 Webhooks
 </h1>
 <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-accent">
 Reputon POSTs JSON events to your endpoint with an HMAC-SHA256
 signature in <code className="font-mono text-foreground">X-Reputon-Signature</code>.
 We retry with exponential backoff for up to 2 hours.
 </p>
 </div>
 <WebhooksPanel />
 </Container>
 );
}
