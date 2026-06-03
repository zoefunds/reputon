import { Hono } from "hono";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { apiAuth } from "../../middleware/apiAuth";
import { issue, listForUser, revoke } from "../../services/apiKeys";

const app = new Hono();
app.use("*", apiAuth({ required: true }));

const createBody = z.object({
  name: z.string().min(1).max(80),
  env: z.enum(["test", "live"]).default("test"),
  scopes: z.array(z.string()).optional(),
});

app.get("/", async (c) => {
  const caller = c.get("apiCaller")!;
  return c.json({ keys: await listForUser(caller.userId) });
});

app.post("/", async (c) => {
  const caller = c.get("apiCaller")!;
  const body = createBody.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) throw new HTTPException(400, { message: "Invalid body" });
  const issued = await issue({
    userId: caller.userId,
    name: body.data.name,
    env: body.data.env,
    scopes: body.data.scopes,
  });
  // The plaintext key is returned exactly once.
  return c.json(issued, 201);
});

app.delete("/:id", async (c) => {
  const caller = c.get("apiCaller")!;
  const ok = await revoke(caller.userId, c.req.param("id"));
  if (!ok) throw new HTTPException(404, { message: "key not found" });
  return c.json({ revoked: true });
});

export default app;
