"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SiweMessage } from "siwe";
import { Wallet, AlertTriangle, CheckCircle2, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
type Eip6963ProviderInfo = { uuid: string; name: string; icon: string; rdns: string };
type DiscoveredWallet = { info: Eip6963ProviderInfo; provider: EthProvider };

function useDiscoveredWallets(): DiscoveredWallet[] {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    function onAnnounce(e: Event) {
      const ev = e as unknown as { detail: DiscoveredWallet };
      const uuid = ev.detail?.info?.uuid;
      if (!uuid || seen.current.has(uuid)) return;
      seen.current.add(uuid);
      setWallets((prev) => [...prev, ev.detail]);
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () =>
      window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  }, []);
  return wallets;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export function WalletLinker() {
  const router = useRouter();
  const wallets = useDiscoveredWallets();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function link(target: DiscoveredWallet | "legacy") {
    setError(null);
    setPickerOpen(false);
    const id = target === "legacy" ? "legacy" : target.info.uuid;
    setBusy(id);
    try {
      const provider: EthProvider | undefined =
        target === "legacy"
          ? (window as unknown as { ethereum?: EthProvider }).ethereum
          : target.provider;
      if (!provider) throw new Error("No EVM wallet detected.");

      const accounts = (await withTimeout(
        provider.request({ method: "eth_requestAccounts" }),
        90_000,
        "Wallet connection"
      )) as string[] | undefined;
      const address = accounts?.[0];
      if (!address) throw new Error("Your wallet returned no account.");

      const chainIdHex = (await withTimeout(
        provider.request({ method: "eth_chainId" }),
        15_000,
        "chainId lookup"
      )) as string;
      const chainId = Number.parseInt(chainIdHex, 16) || 1;

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
      const signature = (await withTimeout(
        provider.request({ method: "personal_sign", params: [prepared, address] }),
        90_000,
        "Signature"
      )) as string;

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
      setBusy(null);
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

  if (wallets.length === 1) {
    const w = wallets[0];
    return (
      <div className="space-y-2">
        <Button onClick={() => link(w)} disabled={busy !== null}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          {busy ? "Waiting for wallet…" : `Link ${w.info.name}`}
        </Button>
        {error && (
          <p className="flex items-center gap-1 text-[12px] text-error">
            <AlertTriangle className="h-3 w-3" /> {error}
          </p>
        )}
      </div>
    );
  }

  if (wallets.length > 1) {
    return (
      <div className="space-y-2">
        <Button onClick={() => setPickerOpen((v) => !v)} disabled={busy !== null}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          {busy ? "Waiting for wallet…" : "Link a wallet"}
          <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
        </Button>
        {pickerOpen && (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-md border border-border bg-card">
            {wallets.map((w) => (
              <li key={w.info.uuid}>
                <button
                  onClick={() => link(w)}
                  disabled={busy !== null}
                  className="flex w-full items-center gap-3 p-3 text-left text-[13.5px] hover:bg-foreground/[0.04] disabled:opacity-50"
                >
                  {w.info.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.info.icon} alt={w.info.name} className="h-6 w-6 rounded" />
                  ) : (
                    <span className="grid h-6 w-6 place-items-center rounded bg-foreground/10 text-[10px] font-semibold text-foreground">
                      {w.info.name[0]}
                    </span>
                  )}
                  <span className="flex-1 text-foreground">{w.info.name}</span>
                  {busy === w.info.uuid && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p className="flex items-center gap-1 text-[12px] text-error">
            <AlertTriangle className="h-3 w-3" /> {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button onClick={() => link("legacy")} disabled={busy !== null}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        {busy ? "Waiting for wallet…" : "Link a wallet"}
      </Button>
      <p className="text-[12px] text-accent">
        No EIP-6963 wallets detected. Install MetaMask, Rabby or Coinbase
        Wallet, then reload.
      </p>
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
