import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./env";
import { errorHandler } from "./middleware/error";
import { rateLimit } from "./middleware/rateLimit";
import health from "./routes/health";
import profiles from "./routes/profiles";
import onchain from "./routes/onchain";
import nft from "./routes/nft";
import sybil from "./routes/sybil";

const app = new Hono();

app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: env().CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use("*", errorHandler);
app.use("/v1/*", rateLimit());

app.get("/", (c) =>
  c.json({
    name: "reputon-backend",
    version: "0.1.0",
    docs: "/v1",
    health: "/v1/health",
  })
);

app.route("/v1/health", health);
app.route("/v1/profile", profiles);
app.route("/v1/onchain", onchain);
app.route("/v1/onchain/nft", nft);
app.route("/v1/onchain/sybil", sybil);

app.notFound((c) => c.json({ error: { message: "Not found", code: 404 } }, 404));

const port = env().BACKEND_PORT;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[reputon-backend] listening on http://localhost:${info.port}`);
});

export type AppType = typeof app;
