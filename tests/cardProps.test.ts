import { describe, expect, it } from "vitest";
import { propertyRows } from "../src/cardProps";

const names: Record<string, string> = { "file.path": "path", "note.tags": "Tags", "note.year": "year" };
const values: Record<string, string | null> = {
  "file.path": "cards/a.md",
  "note.tags": "x, y",
  "note.year": "",
  "file.name": "a",
};
const rows = (ids: string[]) =>
  propertyRows(ids, (id) => names[id] ?? id, (id) => values[id] ?? null);

describe("propertyRows", () => {
  it("labels each chosen property with its display name and value, in order", () => {
    expect(rows(["note.tags", "file.path"])).toEqual([
      { label: "Tags", text: "x, y" },
      { label: "path", text: "cards/a.md" },
    ]);
  });
  it("skips empty and missing values", () => {
    expect(rows(["note.year", "note.missing"])).toEqual([]);
  });
  it("skips file.name, which the card already shows as its title", () => {
    expect(rows(["file.name"])).toEqual([]);
  });
});
