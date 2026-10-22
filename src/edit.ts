const FRONTMATTER = /^---\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/;
const TASK = /^((?:[ \t]*>)*[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[)(.)(\])/;
const FENCE = /^[ \t]*(```|~~~)/;

export function splitFrontmatter(content: string): { frontmatter: string; body: string } {
  const match = FRONTMATTER.exec(content);
  const frontmatter = match ? match[0] : "";
  return { frontmatter, body: content.slice(frontmatter.length) };
}

/** Replaces everything after the frontmatter, leaving the frontmatter untouched. */
export function replaceBody(content: string, newBody: string): string {
  return splitFrontmatter(content).frontmatter + newBody;
}

/** Flips the n-th task checkbox (document order, code fences and frontmatter skipped). */
export function toggleNthTask(content: string, n: number): string {
  const { frontmatter, body } = splitFrontmatter(content);
  const lines = body.split("\n");
  let count = 0;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = TASK.exec(lines[i]);
    if (!match) continue;
    if (count++ === n) {
      const mark = match[2] === "x" || match[2] === "X" ? " " : "x";
      lines[i] = match[1] + mark + match[3] + lines[i].slice(match[0].length);
      return frontmatter + lines.join("\n");
    }
  }
  return content;
}
