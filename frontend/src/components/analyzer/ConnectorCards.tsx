"use client";

/**
 * Connector grid that replaces the analyzer's old free-text inputs.
 *
 * One card per source. Each card shows:
 *   - the source name + a one-line description
 *   - the connection state (configured / connected / coming-soon)
 *   - a primary action button
 *
 * The actual signal pull happens server-side when the user hits
 * "Run evaluation" — these cards just record intent + verify identity
 * up-front so the bundle is sourced from real, verified inputs.
 */

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import {
  Github,
  Twitter,
  Send,
  ShieldCheck,
  Vote,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

type Providers = {
  github: { configured: boolean; connected: boolean; handle: string | null };
  twitter: { configured: boolean; connected: boolean; handle: string | null };
  telegram: { configured: boolean; connected: boolean; handle: string | null };
};

type ConnectionsResponse = {
  wallet: string | null;
  providers: Providers;
};

type CredentialsPreview = {
  ok: boolean;
  score: number | null;
  stamps: number;
  passing: boolean;
  reason?: "missing_key" | "fetch_failed";
};

type ProtocolsPreview = {
  ok: boolean;
  vote_count: number;
  spaces: { id: string; name: string; votes: number }[];
};

export function ConnectorCards() {
  const [conn, setConn] = useState<ConnectionsResponse | null>(null);
  const [credentials, setCredentials] = useState<CredentialsPreview | null>(null);
  const [protocols, setProtocols] = useState<ProtocolsPreview | null>(null);
  const [scanning, setScanning] = useState<"credentials" | "protocols" | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/me/connections", { cache: "no-store" });
      if (r.ok) setConn((await r.json()) as ConnectionsResponse);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function scan(source: "credentials" | "protocols") {
    setScanning(source);
    try {
      const r = await fetch(`/api/me/connections/scan?source=${source}`, { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (source === "credentials") setCredentials(j.passport ?? null);
      if (source === "protocols") setProtocols(j.snapshot ?? null);
    } finally {
      setScanning(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {/* GitHub — OAuth-verified */}
      <Card
        icon={<Github className="h-4 w-4" />}
        title="GitHub"
        sub="Verified developer activity — PRs, repos, follower graph."
        right={
          conn?.providers.github.connected ? (
            <Pill variant="success">
              @{conn.providers.github.handle ?? "linked"}
            </Pill>
          ) : conn?.providers.github.configured ? (
            <ActionBtn
              onClick={() => signIn("github", { callbackUrl: "/dashboard/analyzer" })}
            >
              Connect GitHub
            </ActionBtn>
          ) : (
            <Pill variant="muted">Provider not configured</Pill>
          )
        }
      />

      {/* Twitter / X — identity-only on the free tier */}
      <Card
        icon={<Twitter className="h-4 w-4" />}
        title="X (Twitter)"
        sub="Verifies handle + follower count. Tweet history requires paid Twitter tier."
        right={
          conn?.providers.twitter.connected ? (
            <Pill variant="success">@{conn.providers.twitter.handle ?? "linked"}</Pill>
          ) : conn?.providers.twitter.configured ? (
            <ActionBtn
              onClick={() => signIn("twitter", { callbackUrl: "/dashboard/analyzer" })}
            >
              Connect X
            </ActionBtn>
          ) : (
            <Pill variant="muted">Provider not configured</Pill>
          )
        }
      />

      {/* Telegram — Login Widget */}
      <Card
        icon={<Send className="h-4 w-4" />}
        title="Telegram"
        sub="Verifies your Telegram identity via the official Login Widget."
        right={
          conn?.providers.telegram.configured ? (
            <TelegramLogin onLinked={refresh} />
          ) : (
            <Pill variant="muted">Provider not configured</Pill>
          )
        }
        body={
          conn?.providers.telegram.configured ? (
            <Hint>
              If no Telegram button appears above, the bot&apos;s domain isn&apos;t
              whitelisted yet. Open <strong>@BotFather</strong> → <code className="rounded bg-foreground/10 px-1">/mybots</code> →
              your bot → <strong>Bot Settings</strong> → <strong>Domain</strong> → send{" "}
              <code className="rounded bg-foreground/10 px-1">reputon-mocha.vercel.app</code>.
            </Hint>
          ) : null
        }
      />

      {/* Credentials — Gitcoin Passport */}
      <Card
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Credentials"
        sub="Gitcoin Passport humanity score + stamps attached to your wallet."
        right={
          <ActionBtn onClick={() => scan("credentials")} disabled={scanning === "credentials"}>
            {scanning === "credentials" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {credentials?.ok ? "Re-scan" : "Scan wallet"}
          </ActionBtn>
        }
        body={
          credentials ? (
            credentials.ok ? (
              <ScanResult
                label={`Score ${credentials.score ?? "—"} · ${credentials.stamps} stamps`}
                ok={credentials.passing}
                okLabel="Passing humanity threshold"
                offLabel="Below humanity threshold"
              />
            ) : credentials.reason === "missing_key" ? (
              <Hint>
                Passport API key not configured. Get one at{" "}
                <a
                  className="underline underline-offset-2"
                  href="https://developer.passport.xyz/"
                  target="_blank"
                  rel="noreferrer"
                >
                  developer.passport.xyz
                </a>{" "}
                and set <code className="rounded bg-foreground/10 px-1">PASSPORT_API_KEY</code> +{" "}
                <code className="rounded bg-foreground/10 px-1">PASSPORT_SCORER_ID</code>.
              </Hint>
            ) : (
              <Hint>Passport scorer didn&apos;t return a result for this wallet.</Hint>
            )
          ) : null
        }
      />

      {/* Protocols — Snapshot governance */}
      <Card
        icon={<Vote className="h-4 w-4" />}
        title="Protocols"
        sub="Snapshot governance votes across DAOs, scanned from your connected wallet."
        right={
          <ActionBtn onClick={() => scan("protocols")} disabled={scanning === "protocols"}>
            {scanning === "protocols" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {protocols?.ok ? "Re-scan" : "Scan wallet"}
          </ActionBtn>
        }
        body={
          protocols ? (
            protocols.ok ? (
              <ScanResult
                label={`${protocols.vote_count} votes · ${protocols.spaces.length} DAOs`}
                ok={protocols.vote_count > 0}
                okLabel={protocols.spaces.slice(0, 3).map((s) => s.name).join(" · ")}
                offLabel="No Snapshot activity found"
              />
            ) : (
              <Hint>Snapshot could not be read for this wallet.</Hint>
            )
          ) : null
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Atomic UI pieces
// ---------------------------------------------------------------------------

function Card({
  icon,
  title,
  sub,
  right,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  right: React.ReactNode;
  body?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-[2px] text-foreground">{icon}</span>
          <div className="space-y-0.5">
            <p className="font-display text-[14px] font-semibold tracking-tight text-foreground">
              {title}
            </p>
            <p className="text-[12px] leading-snug text-accent">{sub}</p>
          </div>
        </div>
        <div className="shrink-0">{right}</div>
      </div>
      {body && <div className="mt-3">{body}</div>}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Pill({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "success" | "muted";
}) {
  const cls =
    variant === "success"
      ? "border-success/30 bg-success/10 text-success"
      : "border-border bg-background text-accent";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${cls} px-2 py-1 text-[11px]`}>
      {variant === "success" && <CheckCircle2 className="h-3 w-3" />}
      {children}
    </span>
  );
}

function ScanResult({
  label,
  ok,
  okLabel,
  offLabel,
}: {
  label: string;
  ok: boolean;
  okLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/70 bg-background px-3 py-2 text-[12px]">
      {ok ? (
        <CheckCircle2 className="mt-[2px] h-3.5 w-3.5 text-success" />
      ) : (
        <AlertTriangle className="mt-[2px] h-3.5 w-3.5 text-accent" />
      )}
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-accent">{ok ? okLabel : offLabel}</p>
      </div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border/70 bg-background px-3 py-2 text-[12px] text-accent">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Telegram Login Widget
// ---------------------------------------------------------------------------

const TG_BOT_NAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ?? "";

/**
 * Renders the official Telegram Login Widget. Telegram serves the widget
 * as a script that posts auth_data to a global callback once the user
 * approves. We forward that payload to /api/me/connections/telegram for
 * HMAC verification + persistence.
 */
function TelegramLogin({ onLinked }: { onLinked: () => void }) {
  // Register the global callback Telegram will invoke after login. Hooks
  // must be called unconditionally, so this runs even when TG_BOT_NAME
  // is missing — the widget just never loads in that case.
  useEffect(() => {
    if (!TG_BOT_NAME) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).onTelegramAuth = async (payload: Record<string, unknown>) => {
      try {
        const r = await fetch("/api/me/connections/telegram", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (r.ok) onLinked();
      } catch {
        /* swallow */
      }
    };
  }, [onLinked]);

  // Inject the widget script with innerHTML on first mount. We do NOT use
  // a React <script> element (React refuses to execute them) and we do
  // NOT use document.createElement + appendChild with async=true, because
  // Telegram's widget reads document.currentScript at load to know where
  // to place the iframe, and currentScript is null for async-appended
  // scripts in some browsers. innerHTML injection executes synchronously
  // and gives the widget a real currentScript reference.
  useEffect(() => {
    if (!TG_BOT_NAME) return;
    const slot = document.getElementById("tg-login-slot");
    if (!slot || slot.dataset.mounted === "1") return;
    slot.dataset.mounted = "1";
    slot.innerHTML =
      `<script async src="https://telegram.org/js/telegram-widget.js?22" ` +
      `data-telegram-login="${TG_BOT_NAME}" ` +
      `data-size="medium" ` +
      `data-onauth="onTelegramAuth(user)" ` +
      `data-request-access="write"></script>`;
    // innerHTML doesn't execute injected <script> tags. Recreate them so
    // they actually run.
    Array.from(slot.querySelectorAll("script")).forEach((old) => {
      const fresh = document.createElement("script");
      for (const a of Array.from(old.attributes)) fresh.setAttribute(a.name, a.value);
      fresh.text = old.text;
      old.replaceWith(fresh);
    });
  }, []);

  if (!TG_BOT_NAME) {
    return (
      <span className="text-[11px] text-accent">
        Set <code className="rounded bg-background px-1">NEXT_PUBLIC_TELEGRAM_BOT_NAME</code> to your bot&apos;s @username.
      </span>
    );
  }

  return <div id="tg-login-slot" />;
}
