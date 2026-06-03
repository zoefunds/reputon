import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class-name merger)", () => {
  it("concatenates falsy-aware classes", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("dedups tailwind conflicts via twMerge", () => {
    // Later utility wins.
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});
