"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { SiweMessage } from "siwe";
import { Wallet, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type EthProvider = {
 request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
 isMetaMask?: boolean;
 isCoinbaseWallet?: boolean;
 isRabby?: boolean;
 providers?: EthProvider[];
};

declare global {
 interface Window {
 ethereum?: EthProvider;
 }
}

/**
 * Pick a single EVM provider when several wallet extensions are installed
 * (MetaMask, Rabby, Coinbase, Brave, OKX, etc. all set window.ethereum and
 * sometimes provide a `providers` array). Preference: MetaMask. Then any
 * non Coinbase provider. Then the first available.
 */
function pickProvider(root: EthProvider | undefined): EthProvider | null {
 if (!root) return null;
 const list = Array.isArray(root.providers) && root.providers.length
 ? root.providers
 : [root];
 const metamask = list.find((p) => p?.isMetaMask && !p?.isRabby);
 if (metamask) return metamask;
 const nonCoinbase = list.find((p) => p && !p.isCoinbaseWallet);
 return nonCoinbase ?? list[0] ?? null;
}

function humanise(raw: string): string {
 const e = raw.toLowerCase();
 if (e.includes("user rejected") || e.includes("user denied")) {
 return "You rejected the signature request in your wallet. Try again to sign in.";
 }
 if (e.includes("already pending") || e.includes("already processing")) {
 return "There is already a pending request in your wallet. Open it and approve.";
 }
 if (e.includes("credentialssignin")) {
 return "Signature verification failed on the server. Make sure your wallet is on the same chain you signed with, and try again.";
 }
 if (e.includes("no evm wallet")) {
 return "No EVM wallet detected. Install MetaMask, Rabby, Coinbase Wallet or another EVM wallet. Then refresh.";
 }
 return raw;
}

export function WalletSignIn({ callbackUrl }: { callbackUrl: string }) {
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState<string | null>(null);

 async function onClick() {
 setError(null);
 setBusy(true);
 try {
 const provider = pickProvider(typeof window !== "undefined" ? window.ethereum : undefined);
 if (!provider) {
 throw new Error("No EVM wallet detected");
 }
 const accounts = (await provider.request({
 method: "eth_requestAccounts",
 })) as string[];
 const address = accounts[0];
 if (!address) throw new Error("No account returned from wallet.");

 const chainIdHex = (await provider.request({ method: "eth_chainId" })) as string;
 const chainId = Number.parseInt(chainIdHex, 16);

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

 const signature = (await provider.request({
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
 const raw = e instanceof Error ? e.message : "Wallet sign-in failed.";
 setError(humanise(raw));
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
