"use client";

/**
 * Single-source-of-truth client provider tree. SessionProvider now lives
 * inside Web3Providers so it wraps both next-auth and the wagmi/rainbowkit
 * stack in the correct order.
 */

import { Web3Providers } from "./Web3Providers";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <Web3Providers>{children}</Web3Providers>;
}
