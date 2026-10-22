import { describe, expect, it } from "vitest";
import { needsInitialization, parseOrder, planWrites, sortByOrder } from "../src/order";

const item = (id: string, order: number | null) => ({ id, order });
const obj = (m: Map<string, number>) => Object.fromEntries(m);

describe("parseOrder", () => {
  it("reads numbers and numeric strings", () => {
    expect(parseOrder("3")).toBe(3);
    expect(parseOrder(2.5)).toBe(2.5);
  });
  it("treats everything else as unset", () => {
    expect(parseOrder("abc")).toBeNull();
    expect(parseOrder([1])).toBeNull();
    expect(parseOrder(NaN)).toBeNull();
    expect(parseOrder(undefined)).toBeNull();
    expect(parseOrder("")).toBeNull();
  });
});

describe("planWrites", () => {
  it("writes only the moved card, halfway between its neighbours", () => {
    const list = [item("a", 1), item("c", 3), item("b", 2)];
    expect(obj(planWrites(list, "c"))).toEqual({ c: 1.5 });
  });
  it("puts a card dropped first at next minus one", () => {
    const list = [item("c", 3), item("a", 1), item("b", 2)];
    expect(obj(planWrites(list, "c"))).toEqual({ c: 0 });
  });
  it("puts a card dropped last at previous plus one", () => {
    const list = [item("b", 2), item("c", 3), item("a", 1)];
    expect(obj(planWrites(list, "a"))).toEqual({ a: 4 });
  });
  it("numbers every note when none has an order yet", () => {
    const list = [item("a", null), item("b", null), item("c", null)];
    expect(obj(planWrites(list, "b"))).toEqual({ a: 1, b: 2, c: 3 });
  });
  it("writes only the moved note when another note in the folder is unset", () => {
    const list = [item("a", 10), item("c", 30), item("b", 20), item("n", null)];
    expect(obj(planWrites(list, "c"))).toEqual({ c: 15 });
  });
  it("writes nothing for an in-place drop even when an unset note exists", () => {
    const list = [item("a", 10), item("b", 20), item("n", null)];
    expect(planWrites(list, "a").size).toBe(0);
  });
  it("gives an unset note dropped among ordered ones a value between its neighbours", () => {
    const list = [item("a", 1), item("b", null), item("c", 2)];
    expect(obj(planWrites(list, "b"))).toEqual({ b: 1.5 });
  });
  it("numbers only the unset tail up to a card dropped among unset notes", () => {
    const list = [item("a", 10), item("n1", null), item("n2", null), item("n3", null)];
    expect(obj(planWrites(list, "n2"))).toEqual({ n1: 11, n2: 12 });
  });
  it("puts a card dropped after the ordered notes just past the last one", () => {
    const list = [item("a", 10), item("b", 20), item("n", null)];
    expect(obj(planWrites(list, "n"))).toEqual({ n: 21 });
  });
  it("renumbers when the neighbours share a value", () => {
    const list = [item("a", 2), item("c", 9), item("b", 2)];
    expect(obj(planWrites(list, "c"))).toEqual({ a: 1, c: 2, b: 3 });
  });
  it("renumbers only the tied notes around the drop, not the rest of the list", () => {
    const list = [item("a", 1), item("x", 5), item("b", 1), item("c", 2), item("d", 3)];
    expect(obj(planWrites(list, "x"))).toEqual({ a: -1, x: 0 });
  });
  it("leaves ties alone when the card is dropped back in place", () => {
    const list = [item("a", 1), item("b", 1), item("c", 2)];
    expect(planWrites(list, "b").size).toBe(0);
  });
  it("renumbers when the midpoint cannot be told apart from a neighbour", () => {
    const list = [item("a", 2), item("c", 9), item("b", 2.0000000000000004)];
    expect(obj(planWrites(list, "c"))).toEqual({ a: 1, c: 2, b: 3 });
  });
  it("writes nothing when the card is dropped back where it was", () => {
    const list = [item("a", 1), item("b", 2), item("c", 3)];
    expect(planWrites(list, "b").size).toBe(0);
    expect(planWrites(list, "a").size).toBe(0);
    expect(planWrites(list, "c").size).toBe(0);
  });
});

describe("sortByOrder", () => {
  it("sorts ascending, puts unset last and keeps the given order for ties", () => {
    const items = [item("u1", null), item("b", 2), item("t1", 1), item("a", 1), item("u2", null)];
    expect(sortByOrder(items).map((i) => i.id)).toEqual(["t1", "a", "b", "u1", "u2"]);
  });
  it("does not change the original array", () => {
    const items = [item("b", 2), item("a", 1)];
    sortByOrder(items);
    expect(items.map((i) => i.id)).toEqual(["b", "a"]);
  });
});

describe("needsInitialization", () => {
  it("is true when no note has an order", () => {
    expect(needsInitialization([null, null, null])).toBe(true);
  });
  it("is false as soon as one note has an order", () => {
    expect(needsInitialization([null, 3, null])).toBe(false);
  });
  it("is false for an empty folder", () => {
    expect(needsInitialization([])).toBe(false);
  });
});
