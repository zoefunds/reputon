/**
 * Auth.js v5 root config.
 *
 * Providers enabled at runtime based on which env vars are set, so a fresh
 * developer can start with just wallet sign-in (zero external config) and
 * add Google / email later without code changes.
 */

import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Twitter from "next-auth/providers/twitter";
import Nodemailer from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { SiweMessage } from "siwe";
import { getDb } from "@reputon/db/client";
import {
 users,
 accounts,
 sessions,
 verificationTokens,
 authenticators,
 wallets,
} from "@reputon/db/schema";
import { eq } from "drizzle-orm";

const db = getDb();

const providers: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
 providers.push(
 Google({
 clientId: process.env.AUTH_GOOGLE_ID,
 clientSecret: process.env.AUTH_GOOGLE_SECRET,
 allowDangerousEmailAccountLinking: true,
 })
 );
}

// GitHub OAuth — used by the analyzer's "Connect GitHub" flow so the
// handle is verified rather than typed in. read:user gives us username +
// follower count + bio, public_repo lets us iterate their public PRs and
// repos with their own token (avoids GitHub's anonymous rate limits).
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
 providers.push(
 GitHub({
 clientId: process.env.AUTH_GITHUB_ID,
 clientSecret: process.env.AUTH_GITHUB_SECRET,
 authorization: { params: { scope: "read:user public_repo" } },
 allowDangerousEmailAccountLinking: true,
 })
 );
}

// Twitter / X OAuth 2.0 — identity-only on the free tier. We get the
// verified handle and follower count via /users/me; tweet history
// requires a paid Twitter API tier we don't pull from yet.
if (process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET) {
 providers.push(
 Twitter({
 clientId: process.env.AUTH_TWITTER_ID,
 clientSecret: process.env.AUTH_TWITTER_SECRET,
 allowDangerousEmailAccountLinking: true,
 })
 );
}

if (process.env.SMTP_HOST && process.env.AUTH_EMAIL_FROM) {
 providers.push(
 Nodemailer({
 server: {
 host: process.env.SMTP_HOST,
 port: Number(process.env.SMTP_PORT ?? 587),
 auth: process.env.SMTP_USER
 ? {
 user: process.env.SMTP_USER,
 pass: process.env.SMTP_PASSWORD,
 }
 : undefined,
 },
 from: process.env.AUTH_EMAIL_FROM,
 })
 );
}

// SIWE , Sign-In With Ethereum (works with any EVM wallet, including MetaMask).
providers.push(
 Credentials({
 id: "siwe",
 name: "Ethereum",
 credentials: {
 message: { label: "Message", type: "text" },
 signature: { label: "Signature", type: "text" },
 },
 async authorize(credentials) {
 try {
 if (!credentials?.message || !credentials?.signature) return null;
 const siwe = new SiweMessage(JSON.parse(String(credentials.message)));
 const result = await siwe.verify({
 signature: String(credentials.signature),
 domain: new URL(process.env.AUTH_URL ?? "http://localhost:3000").host,
 nonce: siwe.nonce,
 });
 if (!result.success) return null;

 const address = siwe.address.toLowerCase();

 // Wallets listed in ADMIN_WALLETS (comma-separated, case-insensitive)
 // get role=admin auto-promoted on sign-in. Lets us seed the admin
 // wallet declaratively without a DB migration.
 const adminSet = new Set(
 (process.env.ADMIN_WALLETS ?? "")
 .split(",")
 .map((s) => s.trim().toLowerCase())
 .filter(Boolean)
 );
 const isAdminWallet = adminSet.has(address);

 // Find or create wallet → user
 const existingWallet = await db
 .select()
 .from(wallets)
 .where(eq(wallets.address, address))
 .limit(1);

 let userId: string;
 if (existingWallet[0]?.userId) {
 userId = existingWallet[0].userId;
 } else {
 const [created] = await db
 .insert(users)
 .values({
 name: `Wallet ${address.slice(0, 6)}…${address.slice(-4)}`,
 image: null,
 role: isAdminWallet ? "admin" : "user",
 })
 .returning({ id: users.id });
 userId = created.id;
 await db
 .insert(wallets)
 .values({
 userId,
 address,
 chain: "evm",
 isPrimary: true,
 })
 .onConflictDoNothing();
 }

 // Idempotently promote on every sign-in so we can move the admin
 // role between wallets just by editing env.
 if (isAdminWallet) {
 await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
 }

 const [user] = await db
 .select()
 .from(users)
 .where(eq(users.id, userId))
 .limit(1);

 return user
 ? {
 id: user.id,
 email: user.email,
 name: user.name,
 image: user.image,
 }
 : null;
 } catch (e) {
 console.error("[auth/siwe] verification failed:", e);
 return null;
 }
 },
 })
);

declare module "next-auth" {
 interface Session {
 user: {
 id: string;
 role?: string;
 } & DefaultSession["user"];
 }
}

export const config: NextAuthConfig = {
 adapter: DrizzleAdapter(db, {
 usersTable: users,
 accountsTable: accounts,
 sessionsTable: sessions,
 verificationTokensTable: verificationTokens,
 authenticatorsTable: authenticators,
 }),
 providers,
 session: { strategy: "jwt" },
 pages: {
 signIn: "/sign-in",
 },
 trustHost: true,
 callbacks: {
 async jwt({ token, user }) {
 if (user) {
 token.id = user.id;
 // role is loaded fresh on session()
 }
 return token;
 },
 async session({ session, token }) {
 if (token?.id && session.user) {
 session.user.id = String(token.id);
 const [u] = await db
 .select({ role: users.role })
 .from(users)
 .where(eq(users.id, String(token.id)))
 .limit(1);
 session.user.role = u?.role ?? "user";
 }
 return session;
 },
 },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);

/** Convenience used in landing components to know which providers are wired. */
export const enabledProviders = {
 google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
 email: Boolean(process.env.SMTP_HOST && process.env.AUTH_EMAIL_FROM),
 github: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
 twitter: Boolean(process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET),
 telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
 wallet: true,
};
