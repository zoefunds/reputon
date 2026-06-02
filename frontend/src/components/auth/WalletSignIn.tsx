"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { SiweMessage } from "siwe";
import { Wallet, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export function WalletSignIn({ callbackUrl }: { callbackUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setBusy(true);
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("No EVM wallet detected. Install MetaMask or a compatible wallet.");
      }
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts[0];
      if (!address) throw new Error("No account returned from wallet.");

      const chainIdHex = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      const chainId = Number.parseInt(chainIdHex, 16);

      const nonceRes = await fetch("/api/auth/siwe-nonce", { cache: "no-store" });
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Reputon — the universal on-chain reputation layer.",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const prepared = message.prepareMessage();

      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [prepared, address],
      })) as string;

      const res = await signIn("siwe", {
        message: JSON.stringify(message),
        signature,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        throw new Error(res.error);
      }
      if (res?.ok) {
        window.location.href = res.url ?? callbackUrl;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={onClick} disabled={busy} size="lg" className="w-full">
        <Wallet className="h-4 w-4" />
        {busy ? "Waiting for wallet…" : "Continue with wallet"}
      </Button>
      {error && (
        <p className="flex items-start gap-2 text-[13px] text-error">
          <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none" />
          {error}
        </p>
      )}
    </div>
  );
}
