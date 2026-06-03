import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@reputon/db/client";
import { webhooks } from "@reputon/db/schema";
import { auth } from "@/lib/auth";

const db = getDb();

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
  }
  const { id } = await params;
  const r = await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.userId, session.user.id)))
    .returning({ id: webhooks.id });
  if (r.length === 0) return NextResponse.json({ error: { message: "not found" } }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
