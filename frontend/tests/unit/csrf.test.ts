import { describe, it, expect, beforeAll } from "vitest";
import { sameOrigin } from "@/lib/server/csrf";

beforeAll(() => {
  process.env.AUTH_URL = "http://localhost:3000";
});

function req(method: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/me/api-keys", {
    method,
    headers,
  });
}

describe("sameOrigin", () => {
  it("allows safe methods regardless of origin", () => {
    expect(sameOrigin(req("GET"))).toBe(true);
    expect(sameOrigin(req("HEAD", { origin: "https://evil.example" }))).toBe(true);
    expect(sameOrigin(req("OPTIONS"))).toBe(true);
  });

  it("allows same-origin POST", () => {
    expect(sameOrigin(req("POST", { origin: "http://localhost:3000" }))).toBe(true);
  });

  it("rejects cross-origin POST", () => {
    expect(sameOrigin(req("POST", { origin: "https://evil.example" }))).toBe(false);
  });

  it("falls back to Referer when Origin is absent", () => {
    expect(sameOrigin(req("DELETE", { referer: "http://localhost:3000/foo" }))).toBe(true);
    expect(sameOrigin(req("DELETE", { referer: "https://evil.example/" }))).toBe(false);
  });

  it("rejects when both Origin and Referer are missing", () => {
    expect(sameOrigin(req("POST"))).toBe(false);
  });
});
