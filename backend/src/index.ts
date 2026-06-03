import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./env";
import { errorHandler } from "./middleware/error";
import { rateLimit } from "./middleware/rateLimit";
import { apiAuth } from "./middleware/apiAuth";
import { bodyLimit } from "./middleware/bodyLimit";
import health from "./routes/health";
import profiles from "./routes/profiles";
import onchain from "./routes/onchain";
import nft from "./routes/nft";
import sybil from "./routes/sybil";
import api from "./routes/api";
import meKeys from "./routes/me/keys";
import meWebhooks from "./routes/me/webhooks";
import openapi from "./routes/openapi";
import { startScheduler } from "./services/scheduler";

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
app.use("*", bodyLimit(256 * 1024));
// Caller resolution before rate-limit so the limiter can key by API key.
app.use("/v1/*", apiAuth());
app.use("/v1/*", rateLimit());

app.get("/", (c) =>
  c.json({
    name: "reputon-backend",
    version: "0.1.0",
    docs: "/v1/openapi.json",
    health: "/v1/health",
    endpoints: [
      "/v1/health",
      "/v1/openapi.json",
      "/v1/api/{profile,score,history,endorsements,evaluate,verify}",
      "/v1/me/{api-keys,webhooks}",
      "/v1/onchain/{info,profile,score,history,verify,endorsements/{given,received}}",
      "/v1/onchain/nft/{info,supply,credential/:id,of,has,self-mint-allowed/:tier,minter/:address}",
      "/v1/onchain/sybil/{info,flags,active-flags,severity,is-suspicious,flagged}",
      "/v1/profile (legacy DB-cached, deprecated in favor of /v1/api/*)",
    ],
  })
);

app.route("/v1", openapi);
app.route("/v1/health", health);
app.route("/v1/api", api);
app.route("/v1/me/api-keys", meKeys);
app.route("/v1/me/webhooks", meWebhooks);
app.route("/v1/profile", profiles);
app.route("/v1/onchain", onchain);
app.route("/v1/onchain/nft", nft);
app.route("/v1/onchain/sybil", sybil);

app.notFound((c) => c.json({ error: { message: "Not found", code: 404 } }, 404));

const port = env().BACKEND_PORT;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[reputon-backend] listening on http://localhost:${info.port}`);
  startScheduler();
  console.log("[reputon-backend] scheduler started");
});

export type AppType = typeof app;
