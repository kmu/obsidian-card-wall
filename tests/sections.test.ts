import { describe, expect, it } from "vitest";
import { splitPinned } from "../src/sections";
import { placeSections } from "../src/masonry";

describe("splitPinned", () => {
  it("separates pinned from the rest and keeps each group's order", () => {
    const items = [
      { id: "a", pinned: false },
      { id: "b", pinned: true },
      { id: "c", pinned: false },
      { id: "d", pinned: true },
    ];
    expect(splitPinned(items)).toEqual({ pinned: ["b", "d"], others: ["a", "c"] });
  });
  it("returns empty groups for no items", () => {
    expect(splitPinned([])).toEqual({ pinned: [], others: [] });
  });
});

describe("placeSections", () => {
  // args: sections, cols, colWidth, gap, headerHeight, sectionGap
  it("stacks sections, each with a header, and flattens positions in section order", () => {
    const r = placeSections(
      [
        { label: "ピン留め", heights: [100, 50] },
        { label: "その他", heights: [40] },
      ],
      2, 200, 10, 20, 30,
    );
    expect(r.xs).toEqual([0, 210, 0]);
    // header 0..20, cards from y=20; tallest column ends at 120; next header at 120 + 30
    expect(r.headers).toEqual([
      { label: "ピン留め", y: 0 },
      { label: "その他", y: 150 },
    ]);
    expect(r.ys).toEqual([20, 20, 170]);
    expect(r.totalHeight).toBe(210);
  });
  it("shows no header for a section without a label", () => {
    const r = placeSections([{ label: null, heights: [60, 60] }], 2, 100, 10, 20, 30);
    expect(r.headers).toEqual([]);
    expect(r.ys).toEqual([0, 0]);
    expect(r.totalHeight).toBe(60);
  });
  it("skips empty sections", () => {
    const r = placeSections(
      [
        { label: "ピン留め", heights: [] },
        { label: "その他", heights: [50] },
      ],
      1, 100, 10, 20, 30,
    );
    expect(r.headers).toEqual([{ label: "その他", y: 0 }]);
    expect(r.ys).toEqual([20]);
  });
  it("handles nothing at all", () => {
    expect(placeSections([], 3, 100, 10, 20, 30)).toEqual({ xs: [], ys: [], headers: [], totalHeight: 0 });
  });
});
