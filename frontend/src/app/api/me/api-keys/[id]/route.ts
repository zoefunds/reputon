import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { apiKeys } from "@reputon/db/schema";
import { auth } from "@/lib/auth";

const db = getDb();

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
  }
  const { id } = await params;
  const r = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, session.user.id), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id });
  if (r.length === 0) {
    return NextResponse.json({ error: { message: "key not found" } }, { status: 404 });
  }
  return NextResponse.json({ revoked: true });
}
