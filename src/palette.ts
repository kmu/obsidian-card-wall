export const PALETTE = [
  { name: "red", hue: "#e5484d" },
  { name: "orange", hue: "#f76b15" },
  { name: "yellow", hue: "#e5a800" },
  { name: "green", hue: "#30a46c" },
  { name: "teal", hue: "#12a594" },
  { name: "blue", hue: "#0091ff" },
  { name: "purple", hue: "#8e4ec6" },
  { name: "pink", hue: "#e93d82" },
  { name: "gray", hue: "#8b8d98" },
] as const;

export type ColorName = (typeof PALETTE)[number]["name"];

/** Reads a frontmatter value; anything that is not a palette name means "no colour". */
export function parseColor(value: unknown): ColorName | null {
  if (typeof value !== "string") return null;
  const name = value.trim().toLowerCase();
  return PALETTE.find((c) => c.name === name)?.name ?? null;
}
