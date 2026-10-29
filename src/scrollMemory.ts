/** Obsidian rebuilds a Base view when you come back to it (Back, tab restore), and a rebuilt view starts at the top. */
const positions = new Map<string, number>();

export function rememberScroll(key: string, top: number): void {
  if (top > 0) positions.set(key, top);
  else positions.delete(key);
}

export function recallScroll(key: string): number | undefined {
  return positions.get(key);
}

export function forgetAllScroll(): void {
  positions.clear();
}
