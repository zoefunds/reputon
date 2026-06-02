import { Hono } from "hono";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { reputon, isContractConfigured } from "../services/genlayer";

const app = new Hono();

const AddressQ = z.object({
  address: z.string().min(4).max(64),
});

function guard() {
  if (!isContractConfigured()) {
    throw new HTTPException(503, {
      message:
        "Reputon contract not configured — set NEXT_PUBLIC_REPUTON_CONTRACT_ADDRESS.",
    });
  }
}

app.get("/info", async (c) => {
  guard();
  return c.json(await reputon.contractInfo());
});

app.get("/profile", async (c) => {
  guard();
  const parsed = AddressQ.safeParse({ address: c.req.query("address") });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid address" });
  try {
    return c.json(await reputon.profile(parsed.data.address));
  } catch (e) {
    throw new HTTPException(404, {
      message: (e as Error).message ?? "profile not found",
    });
  }
});

app.get("/score", async (c) => {
  guard();
  const parsed = AddressQ.safeParse({ address: c.req.query("address") });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid address" });
  try {
    return c.json(await reputon.score(parsed.data.address));
  } catch (e) {
    throw new HTTPException(404, {
      message: (e as Error).message ?? "profile not found",
    });
  }
});

app.get("/history", async (c) => {
  guard();
  const parsed = AddressQ.safeParse({ address: c.req.query("address") });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid address" });
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 200);
  return c.json({
    history: await reputon.history(parsed.data.address, limit),
  });
});

app.get("/endorsements/given", async (c) => {
  guard();
  const parsed = AddressQ.safeParse({ address: c.req.query("address") });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid address" });
  return c.json({
    endorsements: await reputon.endorsementsGiven(parsed.data.address),
  });
});

app.get("/endorsements/received", async (c) => {
  guard();
  const parsed = AddressQ.safeParse({ address: c.req.query("address") });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid address" });
  return c.json({
    endorsements: await reputon.endorsementsReceived(parsed.data.address),
  });
});

app.get("/verify", async (c) => {
  guard();
  const address = c.req.query("address") ?? "";
  const expected = Number(c.req.query("score"));
  if (!address || Number.isNaN(expected)) {
    throw new HTTPException(400, { message: "Missing address or score" });
  }
  const ok = await reputon.verifyScore(address, expected);
  return c.json({ address, expected, verified: ok });
});

export default app;
