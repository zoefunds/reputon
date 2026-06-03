"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { SiweMessage } from "siwe";
import QRCode from "qrcode";
import {
  Smartphone,
  AlertTriangle,
  Loader2,
  X,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SignClientLike = {
  connect: (opts: unknown) => Promise<{ uri?: string; approval: () => Promise<unknown> }>;
  request: (opts: unknown) => Promise<unknown>;
  disconnect: (opts: unknown) => Promise<unknown>;
};

type Session = {
  topic: string;
  namespaces: {
    eip155?: { accounts: string[]; chains?: string[] };
  };
};

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
const SUPPORTED_CHAINS = ["eip155:1", "eip155:8453", "eip155:10", "eip155:137"];

function humanise(raw: string): string {
  const e = raw.toLowerCase();
  if (e.includes("rejected") || e.includes("denied")) {
    return "You rejected the request in your mobile wallet. Try again to sign in.";
  }
  if (e.includes("expired") || e.includes("timeout") || e.includes("timed out")) {
    return "The pairing request expired before you approved it. Click connect again to get a fresh QR.";
  }
  if (e.includes("credentialssignin")) {
    return "Signature verification failed. Make sure your wallet is on the same chain you signed with.";
  }
  return raw;
}

export function WalletConnectSignIn({ callbackUrl }: { callbackUrl: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "starting" | "awaiting-scan" | "awaiting-signature" | "verifying" | "done"
  >("idle");
  const [uri, setUri] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const clientRef = useRef<SignClientLike | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!uri) return;
    QRCode.toDataURL(uri, { width: 256, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [uri]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      const session = sessionRef.current;
      const client = clientRef.current;
      if (session && client) {
        client
          .disconnect({
            topic: session.topic,
            reason: { code: 6000, message: "User cancelled" },
          })
          .catch(() => {});
      }
    };
  }, []);

  if (!PROJECT_ID) return null;

  async function start() {
    setError(null);
    setOpen(true);
    setPhase("starting");
    cancelledRef.current = false;

    try {
      const { SignClient } = await import("@walletconnect/sign-client");
      const client = (await SignClient.init({
        projectId: PROJECT_ID,
        metadata: {
          name: "Reputon",
          description: "The Universal On-Chain Reputation Layer",
          url: typeof window !== "undefined" ? window.location.origin : "https://reputon-mocha.vercel.app",
          icons: [
            typeof window !== "undefined"
              ? `${window.location.origin}/favicon.svg`
              : "https://reputon-mocha.vercel.app/favicon.svg",
          ],
        },
      })) as unknown as SignClientLike;
      clientRef.current = client;

      const { uri: pairUri, approval } = await client.connect({
        requiredNamespaces: {
          eip155: {
            methods: ["personal_sign"],
            chains: ["eip155:1"],
            events: ["chainChanged", "accountsChanged"],
          },
        },
        optionalNamespaces: {
          eip155: {
            methods: ["personal_sign"],
            chains: SUPPORTED_CHAINS,
            events: ["chainChanged", "accountsChanged"],
          },
        },
      });

      if (cancelledRef.current) return;
      if (pairUri) {
        setUri(pairUri);
        setPhase("awaiting-scan");
      }

      const session = (await approval()) as Session;
      if (cancelledRef.current) return;
      sessionRef.current = session;

      const account = session.namespaces.eip155?.accounts?.[0];
      if (!account) throw new Error("Wallet returned no account.");
      // 'eip155:1:0xabc...' → chainId + address
      const parts = account.split(":");
      const chainId = Number.parseInt(parts[1] ?? "1", 10);
      const address = parts[2];
      if (!address) throw new Error("Wallet returned no address.");

      setPhase("awaiting-signature");

      const nonceRes = await fetch("/api/auth/siwe-nonce", { cache: "no-store" });
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Reputon, the universal on-chain reputation layer.",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const prepared = message.prepareMessage();

      const signature = (await client.request({
        topic: session.topic,
        chainId: `eip155:${chainId}`,
        request: {
          method: "personal_sign",
          params: [prepared, address],
        },
      })) as string;

      if (cancelledRef.current) return;
      setPhase("verifying");

      const res = await signIn("siwe", {
        message: JSON.stringify(message),
        signature,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) throw new Error(res.error);
      if (res?.ok) {
        setPhase("done");
        window.location.href = res.url ?? callbackUrl;
      }
    } catch (e) {
      if (cancelledRef.current) return;
      const raw = e instanceof Error ? e.message : "WalletConnect failed.";
      setError(humanise(raw));
      setPhase("idle");
    }
  }

  function close() {
    cancelledRef.current = true;
    const session = sessionRef.current;
    const client = clientRef.current;
    if (session && client) {
      client
        .disconnect({
          topic: session.topic,
          reason: { code: 6000, message: "User cancelled" },
        })
        .catch(() => {});
    }
    sessionRef.current = null;
    clientRef.current = null;
    setUri(null);
    setQrDataUrl(null);
    setOpen(false);
    setPhase("idle");
  }

  function copyUri() {
    if (!uri) return;
    navigator.clipboard.writeText(uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={start}
        disabled={open}
      >
        <Smartphone className="h-4 w-4" />
        Continue with mobile wallet
      </Button>

      {error && !open && (
        <p className="flex items-start gap-2 text-[13px] text-error">
          <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none" />
          {error}
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4 backdrop-blur"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
                {phase === "done" ? "Signed in" : "Scan with your wallet"}
              </h3>
              <button
                onClick={close}
                className="rounded p-1 text-accent hover:bg-foreground/[0.06]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid place-items-center">
              {phase === "starting" && (
                <div className="grid h-64 w-64 place-items-center text-accent">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}

              {phase === "awaiting-scan" && qrDataUrl && (
                <>
                  <div className="rounded-lg border border-border bg-card p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="WalletConnect QR" className="h-64 w-64" />
                  </div>
                  <p className="mt-4 text-center text-[13px] text-accent">
                    Open your mobile wallet, tap the scan button, and point at this QR.
                  </p>
                  <div className="mt-3 flex w-full items-center gap-2">
                    {uri && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyUri}
                        className="flex-1"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy connection URI
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </>
              )}

              {phase === "awaiting-signature" && (
                <div className="grid h-64 w-64 place-items-center text-center text-[13px] text-accent">
                  <div>
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-foreground" />
                    <p className="mt-3">Approve the sign-in message in your wallet.</p>
                  </div>
                </div>
              )}

              {phase === "verifying" && (
                <div className="grid h-64 w-64 place-items-center text-center text-[13px] text-accent">
                  <div>
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-foreground" />
                    <p className="mt-3">Verifying signature…</p>
                  </div>
                </div>
              )}

              {phase === "done" && (
                <div className="grid h-64 w-64 place-items-center text-center text-success">
                  <div>
                    <CheckCircle2 className="mx-auto h-7 w-7" />
                    <p className="mt-3 text-[14px]">Signed in. Redirecting…</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="mt-4 flex items-start gap-2 text-[13px] text-error">
                <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none" />
                {error}
              </p>
            )}

            <p className="mt-4 text-center text-[11px] text-accent">
              Powered by WalletConnect. Works with MetaMask Mobile, Rainbow, Trust, Zerion and any other WalletConnect-compatible wallet.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
