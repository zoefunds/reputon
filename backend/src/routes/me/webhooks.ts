import { Hono } from "hono";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { apiAuth } from "../../middleware/apiAuth";
import { register, listForUser, remove } from "../../services/webhooks";

const app = new Hono();
app.use("*", apiAuth({ required: true }));

const EVENT_TYPES = [
  "profile.created",
  "score.updated",
  "endorsement.added",
  "endorsement.revoked",
  "evaluation.completed",
  "sybil.flagged",
  "nft.minted",
] as const;

const createBody = z.object({
  url: z.string().url(),
  eventTypes: z.array(z.enum(EVENT_TYPES)).default([]),
});

app.get("/", async (c) => {
  const caller = c.get("apiCaller")!;
  const hooks = await listForUser(caller.userId);
  // strip secret in list view; only revealed on creation
  return c.json({
    webhooks: hooks.map(({ secret, ...h }) => ({ ...h, secret_hint: secret.slice(0, 12) + "…" })),
  });
});

app.post("/", async (c) => {
  const caller = c.get("apiCaller")!;
  const body = createBody.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) throw new HTTPException(400, { message: "Invalid body" });
  const hook = await register({
    userId: caller.userId,
    url: body.data.url,
    eventTypes: body.data.eventTypes,
  });
  // Return secret EXACTLY ONCE.
  return c.json(hook, 201);
});

app.delete("/:id", async (c) => {
  const caller = c.get("apiCaller")!;
  const ok = await remove(caller.userId, c.req.param("id"));
  if (!ok) throw new HTTPException(404, { message: "webhook not found" });
  return c.json({ deleted: true });
});

export default app;
