import { describe, expect, it } from "vitest";
import { isSortedByOrderAsc } from "../src/sortGuard";

describe("isSortedByOrderAsc", () => {
  it("is true when the first sort is the order property ascending", () => {
    expect(isSortedByOrderAsc([{ property: "note.order", direction: "ASC" }], "order")).toBe(true);
  });
  it("is false when the first sort is descending", () => {
    expect(isSortedByOrderAsc([{ property: "note.order", direction: "DESC" }], "order")).toBe(false);
  });
  it("is false for a different property", () => {
    expect(isSortedByOrderAsc([{ property: "file.mtime", direction: "ASC" }], "order")).toBe(false);
  });
  it("is false when order is only a later sort key", () => {
    const sort = [
      { property: "file.mtime", direction: "ASC" as const },
      { property: "note.order", direction: "ASC" as const },
    ];
    expect(isSortedByOrderAsc(sort, "order")).toBe(false);
  });
  it("is false when there is no sort", () => {
    expect(isSortedByOrderAsc([], "order")).toBe(false);
  });
  it("follows a renamed order property", () => {
    expect(isSortedByOrderAsc([{ property: "note.rank", direction: "ASC" }], "rank")).toBe(true);
  });
});
