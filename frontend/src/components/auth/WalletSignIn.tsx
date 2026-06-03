"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { SiweMessage } from "siwe";
import { Wallet, AlertTriangle, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isRabby?: boolean;
  providers?: EthProvider[];
};

type Eip6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

type Eip6963Announce = {
  detail: { info: Eip6963ProviderInfo; provider: EthProvider };
};

type DiscoveredWallet = {
  info: Eip6963ProviderInfo;
  provider: EthProvider;
};

declare global {
  interface Window {
    ethereum?: EthProvider;
  }
}

/**
 * EIP-6963 wallet discovery. Each compliant wallet (MetaMask, Coinbase,
 * Rabby, Trust, etc.) announces itself on demand. This is the modern
 * standard that replaces the brittle `window.ethereum` race.
 *
 * Reference: https://eips.ethereum.org/EIPS/eip-6963
 */
function useDiscoveredWallets(): DiscoveredWallet[] {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const seenUuids = useRef(new Set<string>());

  useEffect(() => {
    function onAnnounce(e: Event) {
      const ev = e as unknown as Eip6963Announce;
      if (!ev.detail?.info?.uuid) return;
      if (seenUuids.current.has(ev.detail.info.uuid)) return;
      seenUuids.current.add(ev.detail.info.uuid);
      setWallets((prev) => [...prev, ev.detail]);
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
    // Ask any installed wallet to announce itself.
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () =>
      window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  }, []);

  return wallets;
}

function humanise(raw: string): string {
  const e = raw.toLowerCase();
  if (e.includes("user rejected") || e.includes("user denied") || e.includes("rejected the request")) {
    return "You rejected the signature in your wallet. Click again to retry.";
  }
  if (e.includes("already pending") || e.includes("already processing")) {
    return "Your wallet already has a pending request. Open the extension and approve it.";
  }
  if (e.includes("no account")) {
    return "Your wallet has no account configured. Create or import one and try again.";
  }
  if (e.includes("credentialssignin")) {
    return "Signature verification failed. Make sure your wallet is on the chain you signed with.";
  }
  if (e.includes("timed out") || e.includes("timeout")) {
    return "Your wallet did not respond in time. Open the extension to check for prompts, then retry.";
  }
  return raw;
}

/** Wrap a wallet call in a timeout so we never spin forever. */
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

export function WalletSignIn({ callbackUrl }: { callbackUrl: string }) {
  const wallets = useDiscoveredWallets();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function connect(target: DiscoveredWallet | "legacy") {
    setError(null);
    setPickerOpen(false);
    const id = target === "legacy" ? "legacy" : target.info.uuid;
    setBusy(id);
    try {
      const provider: EthProvider | undefined =
        target === "legacy"
          ? typeof window !== "undefined"
            ? window.ethereum
            : undefined
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

      const signature = (await withTimeout(
        provider.request({ method: "personal_sign", params: [prepared, address] }),
        90_000,
        "Signature"
      )) as string;

      const res = await signIn("siwe", {
        message: JSON.stringify(message),
        signature,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) throw new Error(res.error);
      if (res?.ok) {
        window.location.href = res.url ?? callbackUrl;
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Wallet sign-in failed.";
      setError(humanise(raw));
    } finally {
      setBusy(null);
    }
  }

  // Case A: exactly one EIP-6963 wallet discovered. Use it directly.
  if (wallets.length === 1) {
    const w = wallets[0];
    return (
      <div className="space-y-3">
        <Button
          onClick={() => connect(w)}
          disabled={busy !== null}
          size="lg"
          className="w-full"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          {busy ? "Waiting for wallet…" : `Continue with ${w.info.name}`}
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

  // Case B: multiple wallets discovered. Show a picker.
  if (wallets.length > 1) {
    return (
      <div className="space-y-3">
        <Button
          onClick={() => setPickerOpen((v) => !v)}
          disabled={busy !== null}
          size="lg"
          className="w-full"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          {busy
            ? "Waiting for wallet…"
            : pickerOpen
            ? "Pick a wallet"
            : "Continue with wallet"}
          <ChevronDown className="ml-auto h-4 w-4 opacity-70" />
        </Button>
        {pickerOpen && (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-md border border-border bg-card">
            {wallets.map((w) => (
              <li key={w.info.uuid}>
                <button
                  onClick={() => connect(w)}
                  disabled={busy !== null}
                  className="flex w-full items-center gap-3 p-3 text-left text-[13.5px] hover:bg-foreground/[0.04] disabled:opacity-50"
                >
                  {w.info.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={w.info.icon}
                      alt={w.info.name}
                      className="h-6 w-6 rounded"
                    />
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
          <p className="flex items-start gap-2 text-[13px] text-error">
            <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none" />
            {error}
          </p>
        )}
      </div>
    );
  }

  // Case C: no EIP-6963 wallets discovered. Fall back to window.ethereum and
  // warn the user about extension conflicts.
  return (
    <div className="space-y-3">
      <Button
        onClick={() => connect("legacy")}
        disabled={busy !== null}
        size="lg"
        className="w-full"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        {busy ? "Waiting for wallet…" : "Continue with wallet"}
      </Button>
      <p className="text-[12px] text-accent">
        No EIP-6963 wallets detected. If sign-in stalls, disable other wallet
        extensions and reload, or install MetaMask, Rabby or Coinbase Wallet.
      </p>
      {error && (
        <p className="flex items-start gap-2 text-[13px] text-error">
          <AlertTriangle className="mt-[2px] h-3.5 w-3.5 flex-none" />
          {error}
        </p>
      )}
    </div>
  );
}
