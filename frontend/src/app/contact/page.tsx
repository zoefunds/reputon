import type { Metadata } from "next";
import { Mail, MessageSquare, Building2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Section } from "@/components/common/Section";
import { ContactForm } from "@/components/landing/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Reputon team — partnerships, integrations, security disclosures and press.",
};

const CHANNELS = [
  {
    icon: Mail,
    title: "Email",
    body: "hello@reputon.xyz",
    note: "We answer most messages within one business day.",
  },
  {
    icon: MessageSquare,
    title: "Developer chat",
    body: "discord.gg/reputon",
    note: "Best for integration questions and API help.",
  },
  {
    icon: Building2,
    title: "Partnerships",
    body: "partners@reputon.xyz",
    note: "DAO, protocol and ecosystem partnerships.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        kicker="Contact"
        title="Let's talk."
        description="Building something that needs portable reputation? Researching trust on-chain? Reporting a security issue? Send a note — we read everything."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <ContactForm />

          <aside className="space-y-3">
            {CHANNELS.map(({ icon: Icon, title, body, note }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground">
                    <Icon className="h-[16px] w-[16px]" strokeWidth={1.6} />
                  </div>
                  <div>
                    <p className="font-display text-[15px] font-semibold tracking-tight text-foreground">
                      {title}
                    </p>
                    <p className="font-mono text-[13px] text-foreground/80">
                      {body}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[13px] text-accent">{note}</p>
              </div>
            ))}
          </aside>
        </div>
      </Section>
    </>
  );
}
