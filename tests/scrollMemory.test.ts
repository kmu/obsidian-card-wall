import { beforeEach, describe, expect, it } from "vitest";
import { forgetAllScroll, recallScroll, rememberScroll } from "../src/scrollMemory";

beforeEach(forgetAllScroll);

describe("scroll memory", () => {
  it("returns what was remembered for a view, per view", () => {
    rememberScroll("a.base|Wall", 420);
    rememberScroll("b.base|Wall", 90);
    expect(recallScroll("a.base|Wall")).toBe(420);
    expect(recallScroll("b.base|Wall")).toBe(90);
    expect(recallScroll("c.base|Wall")).toBeUndefined();
  });

  it("forgets a view that is scrolled back to the top", () => {
    rememberScroll("a.base|Wall", 420);
    rememberScroll("a.base|Wall", 0);
    expect(recallScroll("a.base|Wall")).toBeUndefined();
  });
});
