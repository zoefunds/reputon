import { Hono } from "hono";

const app = new Hono();

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Reputon API",
    version: "0.1.0",
    description:
      "Universal on-chain reputation. All routes return JSON. Errors follow `{error:{message,code}}`.",
  },
  servers: [
    { url: "http://localhost:4001", description: "Local backend" },
    { url: "https://api.reputon.xyz", description: "Production" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "API key issued by `POST /v1/me/api-keys`. Format: `rk_<env>_<24chars>`",
      },
    },
    schemas: {
      Score: {
        type: "object",
        properties: {
          address: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 1000 },
          confidence: { type: "integer", minimum: 0, maximum: 1000 },
          category: {
            type: "string",
            enum: ["unverified", "emerging", "trusted", "eminent"],
          },
          last_evaluated_at: { type: "integer" },
        },
      },
      Profile: {
        allOf: [
          { $ref: "#/components/schemas/Score" },
          {
            type: "object",
            properties: {
              display_name: { type: "string" },
              bio: { type: "string" },
              created_at: { type: "integer" },
              evaluations: { type: "integer" },
            },
          },
        ],
      },
      HistoryEntry: {
        type: "object",
        properties: {
          score: { type: "integer" },
          confidence: { type: "integer" },
          category: { type: "string" },
          delta: { type: "integer" },
          reason: { type: "string" },
          explanation: { type: "string" },
          breakdown: { type: "object" },
          created_at: { type: "integer" },
        },
      },
      Endorsement: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          weight: { type: "integer" },
          note: { type: "string" },
          created_at: { type: "integer" },
          revoked_at: { type: "integer" },
          active: { type: "boolean" },
        },
      },
      VerifyResult: {
        type: "object",
        properties: {
          address: { type: "string" },
          expected_score: { type: "integer" },
          verified: { type: "boolean" },
          ts: { type: "integer" },
          signature: { type: "string" },
        },
      },
      ErrorBody: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              message: { type: "string" },
              code: { type: "integer" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/v1/api/profile": {
      get: {
        summary: "Get on-chain profile",
        parameters: [
          { name: "address", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Profile" } } } },
          404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorBody" } } } },
        },
      },
    },
    "/v1/api/score": {
      get: {
        summary: "Get current score",
        parameters: [{ name: "address", in: "query", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Score" } } } } },
      },
    },
    "/v1/api/history": {
      get: {
        summary: "Paginated score history (newest first)",
        parameters: [
          { name: "address", in: "query", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, minimum: 1, maximum: 200 } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    address: { type: "string" },
                    history: { type: "array", items: { $ref: "#/components/schemas/HistoryEntry" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/v1/api/endorsements": {
      get: {
        summary: "List endorsements for an address",
        parameters: [
          { name: "address", in: "query", required: true, schema: { type: "string" } },
          { name: "direction", in: "query", schema: { type: "string", enum: ["given", "received"], default: "received" } },
        ],
        responses: {
          200: { description: "OK" },
        },
      },
    },
    "/v1/api/evaluate": {
      post: {
        summary: "Queue an AI reputation evaluation",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["address"],
                properties: {
                  address: { type: "string" },
                  signals: { type: "object" },
                },
              },
            },
          },
        },
        responses: { 202: { description: "Queued" } },
      },
    },
    "/v1/api/verify": {
      post: {
        summary: "Verify a score against on-chain truth (signed)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["address", "score"],
                properties: {
                  address: { type: "string" },
                  score: { type: "integer", minimum: 0, maximum: 1000 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/VerifyResult" } } } },
        },
      },
    },
    "/v1/me/api-keys": {
      get: { summary: "List your API keys", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } },
      post: {
        summary: "Create a new API key (returned ONCE)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  env: { type: "string", enum: ["test", "live"], default: "test" },
                  scopes: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/v1/me/webhooks": {
      get: { summary: "List your webhooks", security: [{ bearerAuth: [] }], responses: { 200: { description: "OK" } } },
      post: {
        summary: "Register a webhook",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["url"],
                properties: {
                  url: { type: "string", format: "uri" },
                  eventTypes: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
  },
};

app.get("/openapi.json", (c) => c.json(spec));

export default app;
