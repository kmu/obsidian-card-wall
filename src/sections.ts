export function splitPinned(items: { id: string; pinned: boolean }[]): { pinned: string[]; others: string[] } {
  const pinned: string[] = [];
  const others: string[] = [];
  for (const item of items) (item.pinned ? pinned : others).push(item.id);
  return { pinned, others };
}
