"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiweMessage } from "siwe";
import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export function WalletLinker() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onLink() {
    setError(null);
    setBusy(true);
    try {
      if (!window.ethereum) throw new Error("No EVM wallet detected.");
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts[0];
      const chainIdHex = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      const chainId = Number.parseInt(chainIdHex, 16);
      const nonceRes = await fetch("/api/auth/siwe-nonce", { cache: "no-store" });
      const { nonce } = (await nonceRes.json()) as { nonce: string };
      const msg = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Link this wallet to your Reputon account.",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const prepared = msg.prepareMessage();
      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [prepared, address],
      })) as string;
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
    <div className="space-y-2">
      <Button onClick={onLink} disabled={busy}>
        <Wallet className="h-4 w-4" />
        {busy ? "Waiting for wallet…" : "Link a wallet"}
      </Button>
      {error && (
        <p className="flex items-center gap-1 text-[12px] text-error">
          <AlertTriangle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
