"use client";

/**
 * Dashboard "link a wallet" flow. Uses the same RainbowKit / wagmi stack
 * as the sign-in page, so the same connection modal handles every wallet.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { Wallet, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WalletLinker() {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function link() {
    if (!address) return;
    setError(null);
    setBusy(true);
    try {
      const nonceRes = await fetch("/api/auth/siwe-nonce", { cache: "no-store" });
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const msg = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Link this wallet to your Reputon account.",
        uri: window.location.origin,
        version: "1",
        chainId: chainId ?? 1,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const prepared = msg.prepareMessage();
      const signature = await signMessageAsync({ message: prepared });

      const res = await fetch("/api/me/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: JSON.stringify(msg), signature }),
      });
      const body = (await res.json()) as { error?: { message?: string }; address?: string };
      if (!res.ok) throw new Error(body.error?.message ?? "Link failed");
      setDone(body.address ?? address);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet link failed.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/5 p-3 text-[13px]">
        <CheckCircle2 className="h-4 w-4 text-success" />
        Wallet <span className="font-mono">{short(done)}</span> linked.
      </div>
    );
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted, authenticationStatus }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected = ready && account && chain && isConnected;
        if (!connected) {
          return (
            <Button onClick={openConnectModal} disabled={!ready}>
              <Wallet className="h-4 w-4" />
              Connect a wallet
            </Button>
          );
        }
        return (
          <div className="space-y-2">
            <Button onClick={link} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {busy ? "Linking…" : `Link ${short(account.address)}`}
            </Button>
            <button
              type="button"
              className="block text-[12px] text-accent underline-offset-4 hover:underline"
              onClick={() => disconnect()}
            >
              Disconnect
            </button>
            {error && (
              <p className="flex items-center gap-1 text-[12px] text-error">
                <AlertTriangle className="h-3 w-3" /> {error}
              </p>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
