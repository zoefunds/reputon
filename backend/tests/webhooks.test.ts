import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { sign, newSecret } from "../src/services/webhooks";

describe("webhook signing", () => {
  it("produces t=<unix>,v1=<hex64> format", () => {
    const sig = sign("whsec_test", '{"hello":"world"}');
    expect(sig).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
  });

  it("is reproducible when timestamp & body are identical", () => {
    const body = '{"a":1}';
    // Sign twice in quick succession; both should yield the same v1 when t matches.
    // We can't control t directly via the helper, so we re-derive the expected hash.
    const sigStr = sign("whsec_test", body);
    const [tPart, v1Part] = sigStr.split(",");
    const t = Number(tPart.replace("t=", ""));
    const v1 = v1Part.replace("v1=", "");
    const recomputed = crypto
      .createHmac("sha256", "whsec_test")
      .update(`${t}.${body}`)
      .digest("hex");
    expect(v1).toBe(recomputed);
  });

  it("different secrets produce different signatures", () => {
    const a = sign("whsec_a", "x").split("v1=")[1];
    const b = sign("whsec_b", "x").split("v1=")[1];
    expect(a).not.toBe(b);
  });

  it("newSecret returns whsec_ prefixed url-safe base64", () => {
    const s = newSecret();
    expect(s.startsWith("whsec_")).toBe(true);
    expect(s.length).toBeGreaterThan(20);
    expect(s).toMatch(/^whsec_[A-Za-z0-9_-]+$/);
  });
});
