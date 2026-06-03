"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, ShieldCheck } from "lucide-react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-20 animate-pulse rounded-md bg-foreground/[0.06]" />;
  }

  if (!session?.user) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/dashboard">Launch app</Link>
        </Button>
      </>
    );
  }

  const isAdmin = session.user.role === "admin";

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/admin">
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Link>
        </Button>
      )}
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href="/dashboard">
          <UserIcon className="h-4 w-4" />
          Dashboard
        </Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
