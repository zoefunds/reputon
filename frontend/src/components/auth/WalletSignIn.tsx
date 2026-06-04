"use client";

/**
 * Wallet sign-in via RainbowKit + wagmi.
 *
 * UX:
 *   1. User clicks the button; RainbowKit's modal opens. Modal lists every
 *      detected EIP-6963 wallet, WalletConnect (QR for mobile), Coinbase
 *      Wallet, Trust, OKX, etc.
 *   2. User picks a wallet and approves the connection.
 *   3. We build a SIWE message, ask wagmi to sign it, and call our existing
 *      next-auth `siwe` credentials provider with the result.
 *
 * Step 3 runs automatically once the wallet connects, but we expose a
 * "Sign in" button as a fallback in case the auto-sign request is missed
 * by the wallet (some wallets reject background requests after the initial
 * approval flow).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useSignMessage, useSwitchChain } from "wagmi";
import { SiweMessage } from "siwe";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GENLAYER_CHAIN } from "@/lib/wagmi";

function humanise(raw: string): string {
  const e = raw.toLowerCase();
  if (e.includes("user rejected") || e.includes("denied") || e.includes("user disapproved")) {
    return "You rejected the signature in your wallet. Click again to retry.";
  }
  if (e.includes("credentialssignin")) {
    return "Signature verification failed on our server. Make sure your wallet is on the same chain you signed with, and retry.";
  }
  if (e.includes("connector not connected") || e.includes("no provider")) {
    return "Wallet is not connected. Open the modal again and pick a wallet.";
  }
  return raw || "Wallet sign-in failed.";
}

export function WalletSignIn({ callbackUrl }: { callbackUrl: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoTried, setAutoTried] = useState(false);
  // Track per-connection-session whether we've already nudged the wallet to
  // switch to GenLayer Studionet. Don't re-prompt every re-render.
  const switchedFor = useRef<string | null>(null);

  const handleSignIn = useCallback(async () => {
    if (!address) return;
    setError(null);
    setBusy(true);
    try {
      const nonceRes = await fetch("/api/auth/siwe-nonce", { cache: "no-store" });
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Reputon, the universal on-chain reputation layer.",
        uri: window.location.origin,
        version: "1",
        chainId: chainId ?? 1,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const prepared = message.prepareMessage();
      const signature = await signMessageAsync({ message: prepared });

      const res = await signIn("siwe", {
        message: JSON.stringify(message),
        signature,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) throw new Error(res.error);
      if (res?.ok) {
        window.location.href = res.url ?? callbackUrl;
      } else {
        throw new Error("Sign-in returned no result.");
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error("[reputon-auth]", e);
      setError(humanise(raw));
    } finally {
      setBusy(false);
    }
  }, [address, chainId, signMessageAsync, callbackUrl]);

  // The instant a wallet connects, prompt it to add + switch to GenLayer
  // Studionet so every subsequent action (mint, evaluate) lands on the
  // right chain. We only nudge once per connected address to avoid a
  // popup loop if the user dismisses.
  useEffect(() => {
    if (!isConnected || !address) return;
    if (chainId === GENLAYER_CHAIN.id) return;
    if (switchedFor.current === address) return;
    switchedFor.current = address;
    void switchChainAsync({ chainId: GENLAYER_CHAIN.id }).catch(() => {
      // User dismissed — we'll re-prompt at the moment they actually try
      // to sign an on-chain action (via useGenLayerWrite).
    });
  }, [isConnected, address, chainId, switchChainAsync]);

  // Auto-trigger sign-in once a wallet is connected (one-shot).
  useEffect(() => {
    if (isConnected && address && !autoTried && !busy) {
      setAutoTried(true);
      void handleSignIn();
    }
  }, [isConnected, address, autoTried, busy, handleSignIn]);

  return (
    <div className="space-y-3">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openConnectModal,
          openAccountModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== "loading";
          const connected = ready && account && chain;
          if (!connected) {
            return (
              <Button
                onClick={openConnectModal}
                size="lg"
                className="w-full"
                disabled={!ready}
              >
                Connect a wallet
              </Button>
            );
          }
          return (
            <div className="space-y-2">
              <Button
                onClick={handleSignIn}
                size="lg"
                className="w-full"
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {busy ? "Signing in…" : `Sign in as ${short(account.address)}`}
              </Button>
              <button
                type="button"
                className="block w-full text-center text-[12px] text-accent underline-offset-4 hover:underline"
                onClick={() => {
                  setAutoTried(false);
                  setError(null);
                  disconnect();
                  openAccountModal?.();
                }}
              >
                Disconnect or switch wallet
              </button>
            </div>
          );
        }}
      </ConnectButton.Custom>

      {error && (
        <p className="flex items-start gap-2 text-[13px] text-error">
          <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none" />
          {error}
        </p>
      )}
    </div>
  );
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
