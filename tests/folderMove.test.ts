import { describe, expect, it } from "vitest";
import { foldersToOffer, targetPath } from "../src/folderMove";

describe("targetPath", () => {
  it("joins folder and file name, and the vault root adds no folder", () => {
    expect(targetPath("Projects/2024", "Note.md")).toBe("Projects/2024/Note.md");
    expect(targetPath("/", "Note.md")).toBe("Note.md");
  });
});

describe("foldersToOffer", () => {
  it("leaves out the folder the note is already in, keeps the root, sorts by name", () => {
    expect(foldersToOffer(["/", "Zed", "Archive", "Inbox"], "Inbox")).toEqual(["/", "Archive", "Zed"]);
    expect(foldersToOffer(["/", "A"], "/")).toEqual(["A"]);
  });
});
