import { describe, it, expect } from "vitest";
import { SCOPES, hasScope, DEFAULT_KEY_SCOPES } from "../src/lib/scopes";

describe("scopes", () => {
  it("wildcard grants everything", () => {
    expect(hasScope([SCOPES.WILDCARD], SCOPES.WRITE_EVALUATE)).toBe(true);
    expect(hasScope([SCOPES.WILDCARD], SCOPES.READ_PROFILE)).toBe(true);
  });

  it("admin scope grants everything", () => {
    expect(hasScope([SCOPES.ADMIN], SCOPES.WRITE_EVALUATE)).toBe(true);
  });

  it("exact match grants only that scope", () => {
    expect(hasScope([SCOPES.READ_PROFILE], SCOPES.READ_PROFILE)).toBe(true);
    expect(hasScope([SCOPES.READ_PROFILE], SCOPES.WRITE_EVALUATE)).toBe(false);
  });

  it("empty scope list grants nothing", () => {
    expect(hasScope([], SCOPES.READ_PROFILE)).toBe(false);
  });

  it("default key scopes are read-only", () => {
    for (const s of DEFAULT_KEY_SCOPES) {
      expect(s.startsWith("read:")).toBe(true);
    }
    expect(hasScope(DEFAULT_KEY_SCOPES, SCOPES.WRITE_EVALUATE)).toBe(false);
  });
});
