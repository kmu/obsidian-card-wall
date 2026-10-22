import { describe, expect, it } from "vitest";
import { replaceBody, splitFrontmatter, toggleNthTask } from "../src/edit";

describe("splitFrontmatter", () => {
  it("separates a leading frontmatter block from the body", () => {
    expect(splitFrontmatter("---\norder: 1\n---\nhello\n")).toEqual({ frontmatter: "---\norder: 1\n---\n", body: "hello\n" });
  });
  it("returns an empty frontmatter when there is none", () => {
    expect(splitFrontmatter("hello\n")).toEqual({ frontmatter: "", body: "hello\n" });
  });
  it("does not treat a horizontal rule later in the note as frontmatter", () => {
    expect(splitFrontmatter("intro\n---\nmore\n---\n").frontmatter).toBe("");
  });
  it("handles frontmatter with no body", () => {
    expect(splitFrontmatter("---\na: 1\n---")).toEqual({ frontmatter: "---\na: 1\n---", body: "" });
  });
  it("copes with Windows line endings", () => {
    expect(splitFrontmatter("---\r\na: 1\r\n---\r\nx").body).toBe("x");
  });
});

describe("replaceBody", () => {
  it("keeps the frontmatter and swaps the body", () => {
    expect(replaceBody("---\norder: 1\n---\nold\n", "new\n")).toBe("---\norder: 1\n---\nnew\n");
  });
  it("works on a note without frontmatter", () => {
    expect(replaceBody("old", "new")).toBe("new");
  });
});

describe("toggleNthTask", () => {
  const note = "intro\n- [ ] one\n- [x] two\n  - [ ] nested\n";

  it("checks an unchecked task", () => {
    expect(toggleNthTask(note, 0)).toBe("intro\n- [x] one\n- [x] two\n  - [ ] nested\n");
  });
  it("unchecks a checked task", () => {
    expect(toggleNthTask(note, 1)).toBe("intro\n- [ ] one\n- [ ] two\n  - [ ] nested\n");
  });
  it("counts nested tasks in document order", () => {
    expect(toggleNthTask(note, 2)).toBe("intro\n- [ ] one\n- [x] two\n  - [x] nested\n");
  });
  it("ignores task-like lines inside code fences", () => {
    const text = "```\n- [ ] not a task\n```\n- [ ] real\n";
    expect(toggleNthTask(text, 0)).toBe("```\n- [ ] not a task\n```\n- [x] real\n");
  });
  it("ignores a task-like line in the frontmatter", () => {
    const text = "---\nnote: \"- [ ] x\"\n---\n- [ ] real\n";
    expect(toggleNthTask(text, 0)).toBe("---\nnote: \"- [ ] x\"\n---\n- [x] real\n");
  });
  it("handles numbered lists and callouts", () => {
    expect(toggleNthTask("1. [ ] a\n> - [ ] b\n", 1)).toBe("1. [ ] a\n> - [x] b\n");
  });
  it("treats a custom status as unchecked-to-checked", () => {
    expect(toggleNthTask("- [/] half\n", 0)).toBe("- [x] half\n");
  });
  it("returns the text unchanged when there is no such task", () => {
    expect(toggleNthTask(note, 9)).toBe(note);
  });
});
