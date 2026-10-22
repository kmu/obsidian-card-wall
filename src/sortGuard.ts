export interface SortKey {
  property: string;
  direction: "ASC" | "DESC";
}

/** Dragging is only meaningful when the Base itself orders notes by `order`, ascending. */
export function isSortedByOrderAsc(sort: SortKey[], orderProperty: string): boolean {
  const first = sort[0];
  return !!first && first.property === `note.${orderProperty}` && first.direction === "ASC";
}
