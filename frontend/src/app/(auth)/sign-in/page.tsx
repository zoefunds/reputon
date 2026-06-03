import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/common/Logo";
import { WalletSignIn } from "@/components/auth/WalletSignIn";
import { WalletConnectSignIn } from "@/components/auth/WalletConnectSignIn";
import { OAuthButton } from "@/components/auth/OAuthButton";
import { EmailSignIn } from "@/components/auth/EmailSignIn";
import { enabledProviders } from "../../../../auth";

const hasWalletConnect = Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);

export const metadata: Metadata = {
 title: "Sign in",
 description: "Sign in to Reputon to build and manage your portable reputation.",
};

type Props = {
 searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
 const { callbackUrl = "/dashboard", error } = await searchParams;

 return (
 <div className="min-h-[calc(100vh-3.5rem)] bg-background">
 <Container className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-16">
 <div className="w-full max-w-sm">
 <div className="flex flex-col items-center text-center">
 <Logo className="h-7" />
 <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground">
 Sign in to Reputon
 </h1>
 <p className="mt-2 text-[14px] text-accent">
 Continue with a wallet, Google, or your email.
 </p>
 </div>

 {error && (
 <p className="mt-6 rounded-md border border-error/40 bg-error/5 p-3 text-center text-[13px] text-error">
 {decodeURIComponent(error)}
 </p>
 )}

 <div className="mt-8 space-y-3">
 <WalletSignIn callbackUrl={callbackUrl} />

 {hasWalletConnect && <WalletConnectSignIn callbackUrl={callbackUrl} />}

 {(enabledProviders.google || enabledProviders.email) && (
 <div className="relative my-4">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-border/70" />
 </div>
 <div className="relative flex justify-center">
 <span className="bg-background px-3 text-[11px] uppercase tracking-[0.18em] text-accent">
 or
 </span>
 </div>
 </div>
 )}

 {enabledProviders.google && (
 <OAuthButton provider="google" callbackUrl={callbackUrl}>
 Continue with Google
 </OAuthButton>
 )}

 {enabledProviders.email && <EmailSignIn callbackUrl={callbackUrl} />}
 </div>

 <p className="mt-8 text-center text-[12px] text-accent">
 By continuing you agree to our{" "}
 <Link href="/docs" className="underline underline-offset-4">
 terms
 </Link>
 .
 </p>
 </div>
 </Container>
 </div>
 );
}
