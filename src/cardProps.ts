export interface PropRow {
  label: string;
  text: string;
}

/** The properties picked in the Base's Properties menu, as label/value rows. Empty values are left out. */
export function propertyRows(
  ids: string[],
  displayName: (id: string) => string,
  valueText: (id: string) => string | null,
): PropRow[] {
  const rows: PropRow[] = [];
  for (const id of ids) {
    if (id === "file.name") continue;
    const text = valueText(id)?.trim() ?? "";
    if (text !== "") rows.push({ label: displayName(id), text });
  }
  return rows;
}
