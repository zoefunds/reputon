/**
 * Auth.js v5 root config.
 *
 * Providers enabled at runtime based on which env vars are set, so a fresh
 * developer can start with just wallet sign-in (zero external config) and
 * add Google / email later without code changes.
 */

import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
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

// SIWE — Sign-In With Ethereum (works with any EVM wallet, including MetaMask).
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
  wallet: true,
};
