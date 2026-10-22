import { describe, expect, it } from "vitest";
import { columnGeometry, placeCards } from "../src/masonry";

describe("columnGeometry", () => {
  it("fits as many columns as the target width allows and shares the remainder", () => {
    const g = columnGeometry(1000, 260, 12);
    expect(g.cols).toBe(3);
    expect(g.colWidth).toBeCloseTo((1000 - 24) / 3, 5);
  });
  it("falls back to one column when the container is narrower than a column", () => {
    expect(columnGeometry(100, 260, 12)).toEqual({ cols: 1, colWidth: 100 });
  });
});

describe("placeCards", () => {
  it("puts each card in the lowest column, leftmost on ties", () => {
    const r = placeCards([100, 50, 50, 50], 2, 200, 10);
    expect(r.positions).toEqual([
      { x: 0, y: 0 },
      { x: 210, y: 0 },
      { x: 210, y: 60 },
      { x: 0, y: 110 },
    ]);
    expect(r.totalHeight).toBe(160);
  });
  it("handles no cards", () => {
    expect(placeCards([], 3, 100, 10)).toEqual({ positions: [], totalHeight: 0 });
  });
  it("copes with fewer cards than columns", () => {
    const r = placeCards([40, 60], 3, 100, 10);
    expect(r.positions).toEqual([
      { x: 0, y: 0 },
      { x: 110, y: 0 },
    ]);
    expect(r.totalHeight).toBe(60);
  });
});
