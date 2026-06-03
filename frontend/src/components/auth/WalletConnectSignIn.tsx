"use client";

/**
 * WalletConnect v2 sign-in via Universal Provider.
 *
 * The Universal Provider exposes a standard EIP-1193 interface over the
 * WalletConnect protocol so we can call `request({ method, params })` the
 * same way we do with browser extension wallets. The Reown relay handles
 * the QR pairing and routes the user's signature back from their mobile
 * wallet.
 *
 * Every phase logs to `console` with the `[reputon-wc]` prefix so DevTools
 * shows exactly where things stand.
 */

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

type Eip1193 = {
  request: <T = unknown>(args: { method: string; params?: unknown[] }) => Promise<T>;
};

type Universal = Eip1193 & {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  off?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  connect: (opts: unknown) => Promise<unknown>;
  disconnect: () => Promise<void>;
  session?: { topic: string };
};

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

type Phase =
  | "idle"
  | "initializing"
  | "awaiting-scan"
  | "awaiting-signature"
  | "verifying"
  | "done";

function log(...args: unknown[]) {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.info("[reputon-wc]", ...args);
  }
}

function humanise(raw: string): string {
  const e = raw.toLowerCase();
  if (e.includes("user rejected") || e.includes("rejected the request") || e.includes("user disapproved")) {
    return "You rejected the request in your wallet. Try again.";
  }
  if (e.includes("session topic doesn't exist") || e.includes("no matching key")) {
    return "Pairing expired. Close this and click connect again to get a fresh QR.";
  }
  if (e.includes("relay") || e.includes("websocket")) {
    return "Could not reach the WalletConnect relay. Check your network and retry.";
  }
  if (e.includes("credentialssignin")) {
    return "Signature verification failed on our server. Make sure your wallet is on the same chain you signed with, and retry.";
  }
  return raw || "WalletConnect sign-in failed.";
}

export function WalletConnectSignIn({ callbackUrl }: { callbackUrl: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [uri, setUri] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const providerRef = useRef<Universal | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!uri) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(uri, { width: 280, margin: 1, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch((e) => {
        log("qr render error", e);
        setQr(null);
      });
  }, [uri]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      const p = providerRef.current;
      if (p?.session) p.disconnect().catch(() => {});
    };
  }, []);

  if (!PROJECT_ID) {
    log("missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, hiding button");
    return null;
  }

  async function start() {
    setError(null);
    setUri(null);
    setQr(null);
    setOpen(true);
    setPhase("initializing");
    cancelledRef.current = false;
    log("phase: initializing");

    try {
      const mod = await import("@walletconnect/universal-provider");
      const UniversalProvider = mod.UniversalProvider ?? (mod as unknown as { default: typeof mod.UniversalProvider }).default;
      log("module loaded", { hasInit: typeof UniversalProvider?.init === "function" });

      const provider = (await UniversalProvider.init({
        projectId: PROJECT_ID,
        relayUrl: "wss://relay.walletconnect.com",
        metadata: {
          name: "Reputon",
          description: "The Universal On-Chain Reputation Layer",
          url:
            typeof window !== "undefined"
              ? window.location.origin
              : "https://reputon-mocha.vercel.app",
          icons: [
            (typeof window !== "undefined"
              ? window.location.origin
              : "https://reputon-mocha.vercel.app") + "/favicon.svg",
          ],
        },
      })) as unknown as Universal;
      providerRef.current = provider;
      log("provider initialized");

      // Listen for the display URI before we await `connect()`
      provider.on("display_uri", (...args: unknown[]) => {
        const u = args[0] as string;
        log("display_uri", u.slice(0, 40) + "…");
        if (cancelledRef.current) return;
        setUri(u);
        setPhase("awaiting-scan");
      });

      const accounts = await provider.connect({
        namespaces: {
          eip155: {
            methods: ["personal_sign"],
            chains: ["eip155:1"],
            events: ["chainChanged", "accountsChanged"],
            rpcMap: { 1: "https://cloudflare-eth.com" },
          },
        },
        optionalNamespaces: {
          eip155: {
            methods: ["personal_sign"],
            chains: ["eip155:1", "eip155:8453", "eip155:10", "eip155:137"],
            events: ["chainChanged", "accountsChanged"],
            rpcMap: { 1: "https://cloudflare-eth.com" },
          },
        },
      });
      log("connect resolved", accounts);
      if (cancelledRef.current) return;

      const ethAccounts = await provider.request<string[]>({ method: "eth_accounts" });
      log("eth_accounts", ethAccounts);
      const address = ethAccounts?.[0];
      if (!address) throw new Error("Wallet returned no account.");

      const chainIdHex = await provider.request<string>({ method: "eth_chainId" });
      const chainId = Number.parseInt(chainIdHex, 16) || 1;
      log("chainId", chainId);

      setPhase("awaiting-signature");
      log("phase: awaiting-signature");

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

      const signature = await provider.request<string>({
        method: "personal_sign",
        params: [prepared, address],
      });
      log("signature received", signature.slice(0, 16) + "…");
      if (cancelledRef.current) return;

      setPhase("verifying");
      log("phase: verifying");

      const res = await signIn("siwe", {
        message: JSON.stringify(message),
        signature,
        redirect: false,
        callbackUrl,
      });
      log("signIn result", res);
      if (res?.error) throw new Error(res.error);
      if (res?.ok) {
        setPhase("done");
        log("phase: done, redirecting to", res.url ?? callbackUrl);
        window.location.href = res.url ?? callbackUrl;
      } else {
        throw new Error("Sign-in returned no result.");
      }
    } catch (e) {
      if (cancelledRef.current) return;
      const raw = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error("[reputon-wc] error", e);
      setError(humanise(raw));
      setPhase("idle");
    }
  }

  async function close() {
    log("close()");
    cancelledRef.current = true;
    const p = providerRef.current;
    if (p?.session) {
      try {
        await p.disconnect();
      } catch (e) {
        log("disconnect failed", e);
      }
    }
    providerRef.current = null;
    setUri(null);
    setQr(null);
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
              {phase === "initializing" && (
                <div className="grid h-64 w-64 place-items-center text-center text-[13px] text-accent">
                  <div>
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-foreground" />
                    <p className="mt-3">Opening WalletConnect relay…</p>
                  </div>
                </div>
              )}

              {phase === "awaiting-scan" && qr && (
                <>
                  <div className="rounded-lg border border-border bg-card p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr} alt="WalletConnect QR" className="h-64 w-64" />
                  </div>
                  <p className="mt-4 text-center text-[13px] text-accent">
                    Scan this QR with MetaMask Mobile, Rainbow, Trust or any WalletConnect-compatible wallet.
                  </p>
                  {uri && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyUri}
                      className="mt-3 w-full"
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
                </>
              )}

              {phase === "awaiting-signature" && (
                <div className="grid h-64 w-64 place-items-center text-center text-[13px] text-accent">
                  <div>
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-foreground" />
                    <p className="mt-3">Approve the sign-in request in your wallet.</p>
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
              Powered by WalletConnect v2. Works with MetaMask Mobile, Rainbow, Trust, Zerion, Phantom and any WalletConnect-compatible wallet.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
