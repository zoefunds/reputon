import { Hono } from "hono";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { sybilOracle, isContractConfigured, type Severity } from "../services/genlayer";

const app = new Hono();

const VALID_SEV = ["low", "medium", "high", "critical"] as const;
const AddressQ = z.object({ address: z.string().min(4).max(64) });

function guard() {
  if (!isContractConfigured("sybil")) {
    throw new HTTPException(503, {
      message: "Sybil oracle contract address not set.",
    });
  }
}

app.get("/info", async (c) => {
  guard();
  return c.json(await sybilOracle.contractInfo());
});

app.get("/flags", async (c) => {
  guard();
  const parsed = AddressQ.safeParse({ address: c.req.query("address") });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid address" });
  return c.json({
    address: parsed.data.address,
    flags: await sybilOracle.flags(parsed.data.address),
  });
});

app.get("/active-flags", async (c) => {
  guard();
  const parsed = AddressQ.safeParse({ address: c.req.query("address") });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid address" });
  return c.json({
    address: parsed.data.address,
    flags: await sybilOracle.activeFlags(parsed.data.address),
  });
});

app.get("/severity", async (c) => {
  guard();
  const parsed = AddressQ.safeParse({ address: c.req.query("address") });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid address" });
  return c.json({
    address: parsed.data.address,
    severity: await sybilOracle.severity(parsed.data.address),
  });
});

app.get("/is-suspicious", async (c) => {
  guard();
  const parsed = AddressQ.safeParse({ address: c.req.query("address") });
  if (!parsed.success) throw new HTTPException(400, { message: "Invalid address" });
  const minRaw = (c.req.query("min") ?? "medium").toLowerCase();
  if (!VALID_SEV.includes(minRaw as Severity)) {
    throw new HTTPException(400, { message: `min must be one of ${VALID_SEV.join(", ")}` });
  }
  return c.json({
    address: parsed.data.address,
    min: minRaw,
    suspicious: await sybilOracle.isSuspicious(parsed.data.address, minRaw as Severity),
  });
});

app.get("/flagged", async (c) => {
  guard();
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 500);
  return c.json({ addresses: await sybilOracle.listFlagged(limit) });
});

export default app;
