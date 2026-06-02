import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../services/db";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

const AddressQ = z.object({
  address: z.string().min(4).max(64),
  chain: z.string().default("genlayer"),
});

// GET /v1/profile?address=0x...&chain=genlayer
app.get("/", async (c) => {
  const parsed = AddressQ.safeParse({
    address: c.req.query("address"),
    chain: c.req.query("chain") ?? "genlayer",
  });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid query" });

  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(
      and(
        eq(schema.profiles.address, parsed.data.address),
        eq(schema.profiles.chain, parsed.data.chain)
      )
    )
    .limit(1);

  if (!profile) throw new HTTPException(404, { message: "Profile not found" });
  return c.json({ profile });
});

// GET /v1/profile/score?address=...
app.get("/score", async (c) => {
  const parsed = AddressQ.safeParse({
    address: c.req.query("address"),
    chain: c.req.query("chain") ?? "genlayer",
  });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid query" });

  const [row] = await db
    .select({
      address: schema.profiles.address,
      chain: schema.profiles.chain,
      score: schema.profiles.score,
      confidence: schema.profiles.confidence,
      category: schema.profiles.category,
      lastEvaluatedAt: schema.profiles.lastEvaluatedAt,
    })
    .from(schema.profiles)
    .where(
      and(
        eq(schema.profiles.address, parsed.data.address),
        eq(schema.profiles.chain, parsed.data.chain)
      )
    )
    .limit(1);

  if (!row) throw new HTTPException(404, { message: "Profile not found" });
  return c.json(row);
});

// GET /v1/profile/history?address=...&limit=20
app.get("/history", async (c) => {
  const parsed = AddressQ.safeParse({
    address: c.req.query("address"),
    chain: c.req.query("chain") ?? "genlayer",
  });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid query" });
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);

  const [profile] = await db
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(
      and(
        eq(schema.profiles.address, parsed.data.address),
        eq(schema.profiles.chain, parsed.data.chain)
      )
    )
    .limit(1);
  if (!profile) throw new HTTPException(404, { message: "Profile not found" });

  const rows = await db
    .select()
    .from(schema.scoreHistory)
    .where(eq(schema.scoreHistory.profileId, profile.id))
    .orderBy(desc(schema.scoreHistory.createdAt))
    .limit(limit);

  return c.json({ history: rows });
});

export default app;
