const CHROME = 86; // title, footer row, padding and border around the body
const MIN_BODY = 24;
const LINE_HEIGHT = 22;
const CHAR_WIDTH = 7;
const SIDE_PADDING = 30;

/** Indices of cards overlapping the window (top, bottom), touching edges excluded. */
export function visibleIndices(ys: number[], hs: number[], top: number, bottom: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < ys.length; i++) {
    if (ys[i] < bottom && ys[i] + hs[i] > top) out.push(i);
  }
  return out;
}

/** Height guess for a card not rendered yet, from the file size alone. */
export function estimateCardHeight(sizeBytes: number, colWidth: number, maxBodyHeight: number): number {
  const charsPerLine = Math.max(8, (colWidth - SIDE_PADDING) / CHAR_WIDTH);
  const lines = Math.ceil(sizeBytes / charsPerLine);
  const body = Math.min(maxBodyHeight, Math.max(MIN_BODY, lines * LINE_HEIGHT));
  return CHROME + body;
}
