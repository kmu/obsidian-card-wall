export interface SectionPlan {
  label: string | null;
  ids: string[];
}

/**
 * Turns the Base's groups (a single group with a null label when the Base is not grouped)
 * into the sections shown on the wall. Pinned notes from every group go to one section on top;
 * empty sections are dropped. Without grouping, the unpinned notes are labelled only when a
 * "Pinned" section exists above them.
 */
export function buildSections(
  groups: SectionPlan[],
  pinned: ReadonlySet<string>,
  labels: { pinned: string; notes: string },
): SectionPlan[] {
  const pinnedIds = groups.flatMap((g) => g.ids.filter((id) => pinned.has(id)));
  const sections: SectionPlan[] = [];
  if (pinnedIds.length > 0) sections.push({ label: labels.pinned, ids: pinnedIds });
  for (const group of groups) {
    const ids = group.ids.filter((id) => !pinned.has(id));
    if (ids.length === 0) continue;
    const label = group.label ?? (pinnedIds.length > 0 ? labels.notes : null);
    sections.push({ label, ids });
  }
  return sections;
}
