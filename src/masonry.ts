export interface Point {
  x: number;
  y: number;
}

export function columnGeometry(
  containerWidth: number,
  targetColWidth: number,
  gap: number,
): { cols: number; colWidth: number } {
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (targetColWidth + gap)));
  const colWidth = (containerWidth - gap * (cols - 1)) / cols;
  return { cols, colWidth };
}

export function placeCards(
  heights: number[],
  cols: number,
  colWidth: number,
  gap: number,
): { positions: Point[]; totalHeight: number } {
  const colHeights = Array.from({ length: cols }, () => 0);
  const positions: Point[] = [];
  for (const h of heights) {
    const c = colHeights.indexOf(Math.min(...colHeights));
    positions.push({ x: c * (colWidth + gap), y: colHeights[c] });
    colHeights[c] += h + gap;
  }
  const totalHeight = heights.length === 0 ? 0 : Math.max(...colHeights) - gap;
  return { positions, totalHeight };
}

export interface SectionInput {
  label: string | null;
  heights: number[];
}

/**
 * Stacks sections vertically. A labelled section gets a header row; each section's cards are
 * packed by placeCards. Positions are flattened in section order. Empty sections are skipped.
 */
export function placeSections(
  sections: SectionInput[],
  cols: number,
  colWidth: number,
  gap: number,
  headerHeight: number,
  sectionGap: number,
): { xs: number[]; ys: number[]; headers: { label: string; y: number }[]; totalHeight: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  const headers: { label: string; y: number }[] = [];
  let y = 0;
  let any = false;
  for (const section of sections) {
    if (section.heights.length === 0) continue;
    if (any) y += sectionGap;
    any = true;
    if (section.label !== null) {
      headers.push({ label: section.label, y });
      y += headerHeight;
    }
    const { positions, totalHeight } = placeCards(section.heights, cols, colWidth, gap);
    for (const p of positions) {
      xs.push(p.x);
      ys.push(y + p.y);
    }
    y += totalHeight;
  }
  return { xs, ys, headers, totalHeight: y };
}
