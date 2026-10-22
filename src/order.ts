export interface OrderedItem {
  id: string;
  order: number | null;
}

export function parseOrder(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function renumberAll(list: OrderedItem[]): Map<string, number> {
  const writes = new Map<string, number>();
  list.forEach((it, k) => {
    if (it.order !== k + 1) writes.set(it.id, k + 1);
  });
  return writes;
}

function changed(list: OrderedItem[], from: number, values: number[]): Map<string, number> {
  const writes = new Map<string, number>();
  values.forEach((v, k) => {
    if (list[from + k].order !== v) writes.set(list[from + k].id, v);
  });
  return writes;
}

const strictlyIncreasing = (values: number[]) => values.every((v, k) => k === 0 || values[k - 1] < v);

/**
 * `list` is the display order after the drop (unset notes last). Returns the
 * notes whose `order` must be written, as id -> new value. Only the moved note
 * is written unless the neighbourhood cannot take it: a folder with no orders
 * at all is numbered once; tied or exhausted neighbours are renumbered locally.
 */
export function planWrites(list: OrderedItem[], movedId: string): Map<string, number> {
  const i = list.findIndex((it) => it.id === movedId);
  if (i < 0) throw new Error(`unknown id: ${movedId}`);
  if (list.every((it) => it.order === null)) return renumberAll(list);

  // Unset notes directly before the moved card: it was dropped into the unset tail.
  let s = i;
  while (s > 0 && list[s - 1].order === null) s--;
  const prevOrder = s > 0 ? list[s - 1].order : null;
  const nextOrder = i + 1 < list.length ? list[i + 1].order : null;

  if (s < i) {
    const values = Array.from({ length: i - s + 1 }, (_, k) => (prevOrder ?? 0) + k + 1);
    if (nextOrder !== null && values[values.length - 1] >= nextOrder) return renumberAll(list);
    return changed(list, s, values);
  }

  const cur = list[i].order;
  if (cur !== null && (prevOrder === null || prevOrder <= cur) && (nextOrder === null || cur <= nextOrder)) {
    return new Map();
  }

  if (prevOrder !== null && nextOrder !== null) {
    if (prevOrder > nextOrder) return renumberAll(list);
    if (prevOrder < nextOrder) {
      const mid = (prevOrder + nextOrder) / 2;
      return prevOrder < mid && mid < nextOrder ? new Map([[movedId, mid]]) : renumberAll(list);
    }
    return renumberTied(list, i, prevOrder);
  }
  if (nextOrder !== null) return new Map([[movedId, nextOrder - 1]]);
  if (prevOrder !== null) return new Map([[movedId, prevOrder + 1]]);
  return renumberAll(list);
}

/** Spread the run of notes tied at `tie` (plus the moved card) between the values around the run. */
function renumberTied(list: OrderedItem[], i: number, tie: number): Map<string, number> {
  let l = i;
  while (l > 0 && list[l - 1].order === tie) l--;
  let r = i;
  while (r < list.length - 1 && list[r + 1].order === tie) r++;
  const lower = l > 0 ? list[l - 1].order : null;
  const upper = r < list.length - 1 ? list[r + 1].order : null;
  const k = r - l + 1;

  let values: number[];
  if (lower !== null && upper !== null) {
    values = Array.from({ length: k }, (_, t) => lower + ((upper - lower) * (t + 1)) / (k + 1));
  } else if (upper !== null) {
    values = Array.from({ length: k }, (_, t) => upper - (k - t));
  } else if (lower !== null) {
    values = Array.from({ length: k }, (_, t) => lower + t + 1);
  } else {
    return renumberAll(list);
  }
  if (!strictlyIncreasing(values)) return renumberAll(list);
  return changed(list, l, values);
}

/** Ascending by order, unset last; ties keep their given order. Returns a new array. */
export function sortByOrder<T extends { order: number | null }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((x, y) => {
      const a = x.item.order;
      const b = y.item.order;
      if (a === b) return x.index - y.index;
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b || x.index - y.index;
    })
    .map((x) => x.item);
}

/** True when the folder has notes but none has an order yet, so ordering must be set up first. */
export function needsInitialization(orders: (number | null)[]): boolean {
  return orders.length > 0 && orders.every((o) => o === null);
}
