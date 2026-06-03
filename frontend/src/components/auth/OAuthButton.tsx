"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function OAuthButton({
 provider,
 callbackUrl,
 children,
}: {
 provider: string;
 callbackUrl: string;
 children: ReactNode;
}) {
 return (
 <Button
 variant="secondary"
 size="lg"
 className="w-full"
 onClick={() => signIn(provider, { callbackUrl })}
 >
 {children}
 </Button>
 );
}
