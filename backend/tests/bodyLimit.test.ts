import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { bodyLimit } from "../src/middleware/bodyLimit";

describe("bodyLimit middleware", () => {
  const app = new Hono();
  app.use("*", bodyLimit(100));
  app.post("/", (c) => c.text("ok"));

  it("allows small bodies", async () => {
    const res = await app.request("/", {
      method: "POST",
      headers: { "content-length": "50", "content-type": "application/json" },
      body: "x".repeat(50),
    });
    expect(res.status).toBe(200);
  });

  it("rejects oversized bodies with 413", async () => {
    const res = await app.request("/", {
      method: "POST",
      headers: { "content-length": "1000", "content-type": "application/json" },
      body: "x".repeat(1000),
    });
    expect(res.status).toBe(413);
  });
});
