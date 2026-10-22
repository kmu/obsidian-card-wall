import { describe, expect, it } from "vitest";
import { estimateCardHeight, visibleIndices } from "../src/virtual";

describe("visibleIndices", () => {
  const ys = [0, 0, 120, 300, 5000];
  const hs = [100, 80, 150, 90, 100];

  it("returns the cards that overlap the window", () => {
    expect(visibleIndices(ys, hs, 90, 310)).toEqual([0, 2, 3]);
  });
  it("leaves out cards entirely above or below the window", () => {
    expect(visibleIndices(ys, hs, 101, 119)).toEqual([]);
    expect(visibleIndices(ys, hs, 4000, 6000)).toEqual([4]);
  });
  it("does not count a card that only touches the window edge", () => {
    expect(visibleIndices(ys, hs, 100, 120)).toEqual([]);
  });
  it("handles no cards", () => {
    expect(visibleIndices([], [], 0, 1000)).toEqual([]);
  });
});

describe("estimateCardHeight", () => {
  it("gives a tiny note a small card", () => {
    const h = estimateCardHeight(10, 260, 230);
    expect(h).toBeGreaterThan(40);
    expect(h).toBeLessThan(120);
  });
  it("caps a huge note at title + max body height", () => {
    const small = estimateCardHeight(10, 260, 230);
    const huge = estimateCardHeight(1_000_000, 260, 230);
    expect(huge).toBeGreaterThan(230);
    expect(huge).toBeLessThan(230 + small);
  });
  it("never shrinks as the note grows", () => {
    let prev = 0;
    for (const size of [0, 50, 200, 800, 3000, 20000]) {
      const h = estimateCardHeight(size, 260, 230);
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
  });
  it("is taller in a narrower column for the same note", () => {
    expect(estimateCardHeight(600, 200, 400)).toBeGreaterThan(estimateCardHeight(600, 400, 400));
  });
});
