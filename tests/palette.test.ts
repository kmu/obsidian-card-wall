import { describe, expect, it } from "vitest";
import { PALETTE, parseColor } from "../src/palette";

describe("parseColor", () => {
  it("accepts every palette name", () => {
    for (const { name } of PALETTE) expect(parseColor(name)).toBe(name);
  });
  it("ignores case and surrounding spaces", () => {
    expect(parseColor("  Red ")).toBe("red");
  });
  it("treats unknown names and non-strings as no colour", () => {
    expect(parseColor("chartreuse")).toBeNull();
    expect(parseColor(3)).toBeNull();
    expect(parseColor(null)).toBeNull();
    expect(parseColor(undefined)).toBeNull();
    expect(parseColor(["red"])).toBeNull();
    expect(parseColor("")).toBeNull();
  });
});

describe("PALETTE", () => {
  it("has unique names", () => {
    const names = PALETTE.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
