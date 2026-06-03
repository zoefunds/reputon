import { describe, it, expect } from "vitest";
import { sha256Hex } from "../src/services/apiKeys";

describe("apiKeys.sha256Hex", () => {
  it("is deterministic", () => {
    expect(sha256Hex("rk_test_ABC")).toBe(sha256Hex("rk_test_ABC"));
  });

  it("differs across inputs", () => {
    expect(sha256Hex("rk_test_A")).not.toBe(sha256Hex("rk_test_B"));
  });

  it("produces a 64-char hex string", () => {
    expect(sha256Hex("x")).toMatch(/^[a-f0-9]{64}$/);
  });
});
