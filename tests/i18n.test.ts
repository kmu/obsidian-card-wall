import { describe, expect, it } from "vitest";
import { MESSAGES, pickLocale, translate } from "../src/i18n";
import { PALETTE } from "../src/palette";

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe("pickLocale", () => {
  it("uses Japanese for ja and regional variants", () => {
    expect(pickLocale("ja")).toBe("ja");
    expect(pickLocale("ja-JP")).toBe("ja");
    expect(pickLocale("JA")).toBe("ja");
  });
  it("falls back to English for everything else", () => {
    expect(pickLocale("en")).toBe("en");
    expect(pickLocale("fr")).toBe("en");
    expect(pickLocale("zh-TW")).toBe("en");
    expect(pickLocale("")).toBe("en");
    expect(pickLocale(undefined)).toBe("en");
    expect(pickLocale(null)).toBe("en");
  });
});

describe("translate", () => {
  it("fills in placeholders", () => {
    expect(translate("en", "hint.init", { property: "order", count: 8000 })).toContain("8000");
    expect(translate("ja", "hint.init", { property: "order", count: 8000 })).toContain("8000 件");
  });
  it("replaces every occurrence of a placeholder", () => {
    expect(translate("en", "notice.writing", { property: "p", done: 1, total: 2 })).toMatch(/1.*2/);
  });
  it("returns different text per language", () => {
    expect(translate("en", "section.pinned")).not.toBe(translate("ja", "section.pinned"));
  });
});

describe("message tables", () => {
  const enKeys = Object.keys(MESSAGES.en).sort();
  const jaKeys = Object.keys(MESSAGES.ja).sort();

  it("have exactly the same keys in both languages", () => {
    expect(jaKeys).toEqual(enKeys);
  });
  it("use the same placeholders in both languages", () => {
    for (const key of enKeys) {
      expect(placeholders(MESSAGES.ja[key as keyof typeof MESSAGES.ja]), key).toEqual(
        placeholders(MESSAGES.en[key as keyof typeof MESSAGES.en]),
      );
    }
  });
  it("have no empty text", () => {
    for (const locale of ["en", "ja"] as const) {
      for (const [key, text] of Object.entries(MESSAGES[locale])) expect(text.length, `${locale}:${key}`).toBeGreaterThan(0);
    }
  });
  it("name every palette colour", () => {
    for (const { name } of PALETTE) expect(MESSAGES.en).toHaveProperty(`color.${name}`);
  });
});
