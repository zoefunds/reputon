/**
 * Public REST surface — `/v1/api/*`
 *
 * Routes mirror the spec from the master prompt:
 *   GET  /profile        ?address=
 *   GET  /score          ?address=
 *   GET  /history        ?address=&limit=
 *   GET  /endorsements   ?address=&direction=given|received
 *   POST /evaluate       { address, signals }   — queues an evaluation job
 *   POST /verify         { address, score }     — returns a signed proof
 *
 * Reads are open (heavy rate-limit on anon, generous with a key).
 * Writes (POST) require an API key with the right scope.
 */

import { Hono } from "hono";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import crypto from "node:crypto";
import { apiAuth } from "../../middleware/apiAuth";
import { rateLimit } from "../../middleware/rateLimit";
import { reputon, isContractConfigured } from "../../services/genlayer";
import { memo } from "../../services/cache";
import { enqueueEvaluation, getJob, emit } from "../../services/jobs";
import { SCOPES } from "../../lib/scopes";

const app = new Hono();

app.use("*", apiAuth());

const AddrQ = z.object({ address: z.string().min(4).max(64) });
const evaluateBody = z.object({
  address: z.string().min(4).max(64),
  signals: z.record(z.unknown()).default({}),
});
const verifyBody = z.object({
  address: z.string().min(4).max(64),
  score: z.number().int().min(0).max(1000),
});

function ensureContract() {
  if (!isContractConfigured("reputon")) {
    throw new HTTPException(503, { message: "Reputon contract not configured" });
  }
}

// ----- reads -----------------------------------------------------------

app.get("/profile", async (c) => {
  ensureContract();
  const p = AddrQ.safeParse({ address: c.req.query("address") });
  if (!p.success) throw new HTTPException(400, { message: "Invalid address" });
  const data = await memo(`profile:${p.data.address}`, 15, () =>
    reputon.profile(p.data.address).catch(() => null)
  );
  if (!data) throw new HTTPException(404, { message: "profile not found" });
  return c.json(data);
});

app.get("/score", async (c) => {
  ensureContract();
  const p = AddrQ.safeParse({ address: c.req.query("address") });
  if (!p.success) throw new HTTPException(400, { message: "Invalid address" });
  const data = await memo(`score:${p.data.address}`, 15, () =>
    reputon.score(p.data.address).catch(() => null)
  );
  if (!data) throw new HTTPException(404, { message: "profile not found" });
  return c.json(data);
});

app.get("/history", async (c) => {
  ensureContract();
  const p = AddrQ.safeParse({ address: c.req.query("address") });
  if (!p.success) throw new HTTPException(400, { message: "Invalid address" });
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? 20), 1), 200);
  const data = await memo(`hist:${p.data.address}:${limit}`, 15, () =>
    reputon.history(p.data.address, limit).catch(() => [])
  );
  return c.json({ address: p.data.address, history: data });
});

app.get("/endorsements", async (c) => {
  ensureContract();
  const p = AddrQ.safeParse({ address: c.req.query("address") });
  if (!p.success) throw new HTTPException(400, { message: "Invalid address" });
  const dir = (c.req.query("direction") ?? "received").toLowerCase();
  if (dir !== "given" && dir !== "received") {
    throw new HTTPException(400, { message: "direction must be 'given' or 'received'" });
  }
  const fn = dir === "given" ? reputon.endorsementsGiven : reputon.endorsementsReceived;
  const data = await memo(`endorse:${dir}:${p.data.address}`, 15, () =>
    fn(p.data.address).catch(() => [])
  );
  return c.json({ address: p.data.address, direction: dir, endorsements: data });
});

// ----- writes ----------------------------------------------------------

// Writes are sharply rate-limited per-key: 10/min by default.
app.post(
  "/evaluate",
  apiAuth({ required: true, scope: SCOPES.WRITE_EVALUATE }),
  rateLimit({ windowSec: 60, max: 10, anonMax: 0, prefix: "rl:evaluate" }),
  async (c) => {
  ensureContract();
  const body = evaluateBody.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) throw new HTTPException(400, { message: "Invalid body" });
  const caller = c.get("apiCaller");
  const job = await enqueueEvaluation({
    userId: caller?.userId,
    address: body.data.address,
    signals: body.data.signals,
  });
  await emit("evaluation.completed", {
    job_id: job.id,
    address: job.address,
    status: "queued",
    queued_at: job.createdAt.toISOString(),
  }).catch(() => {});
  return c.json({ job_id: job.id, status: job.status, address: job.address }, 202);
  }
);

app.get("/evaluate/:id", apiAuth({ required: true }), async (c) => {
  const job = await getJob(c.req.param("id"));
  if (!job) throw new HTTPException(404, { message: "job not found" });
  return c.json(job);
});

app.post("/verify", async (c) => {
  ensureContract();
  const body = verifyBody.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) throw new HTTPException(400, { message: "Invalid body" });
  const ok = await reputon.verifyScore(body.data.address, body.data.score).catch(() => false);
  const ts = Math.floor(Date.now() / 1000);
  const payload = {
    address: body.data.address,
    expected_score: body.data.score,
    verified: ok,
    ts,
  };
  // Server-signed proof so the consumer can re-check without re-querying.
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  return c.json({ ...payload, signature });
});

export default app;
