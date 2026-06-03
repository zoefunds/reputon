import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/user";
import { buildBundle, type SignalInputs } from "@/lib/server/signals";
import { sameOrigin } from "@/lib/server/csrf";

const Body = z.object({
  github_handle: z.string().max(80).optional(),
  governance: z
    .array(
      z.object({
        dao: z.string().min(1).max(80),
        role: z.enum(["voter", "author"]),
        quality_note: z.string().max(280).optional(),
        proposal_ids: z.array(z.string().max(120)).max(20).optional(),
      })
    )
    .max(20)
    .default([]),
  contributions: z
    .array(
      z.object({
        source: z.enum(["github", "content", "community", "education", "protocol"]),
        title: z.string().min(1).max(240),
        url: z.string().url().optional(),
        summary: z.string().max(400).optional(),
      })
    )
    .max(40)
    .default([]),
  endorsements_count: z.number().int().min(0).max(10_000).optional(),
  notes: z.string().max(800).optional(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: { message: "csrf check failed" } }, { status: 403 });
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: { message: "unauthorized" } }, { status: 401 });
  if (!u.primaryWallet?.address) {
    return NextResponse.json(
      { error: { message: "link a wallet first" } },
      { status: 412 }
    );
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "invalid body", issues: parsed.error.flatten() } },
      { status: 400 }
    );
  }
  const bundle = await buildBundle(u.primaryWallet.address, parsed.data as SignalInputs);
  return NextResponse.json({ bundle });
}
