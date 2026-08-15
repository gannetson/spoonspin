import { describe, expect, it } from "vitest";
import { formatPageEvidence, type PageEvidence } from "./pageEvidence.ts";

describe("formatPageEvidence", () => {
  it("formats fetched page fields for prompts", () => {
    const pages: PageEvidence[] = [
      {
        url: "https://example.com/yemeni",
        sourceLabel: "website",
        title: "Yemeni Restaurant Leiden",
        description: "Authentic Yemeni cuisine in Leiden",
        snippet: "Mandi, saltah and more…",
      },
    ];
    const text = formatPageEvidence(pages);
    expect(text).toContain("Yemeni Restaurant Leiden");
    expect(text).toContain("Authentic Yemeni cuisine");
    expect(text).toContain("[website]");
  });

  it("returns a placeholder when empty", () => {
    expect(formatPageEvidence([])).toBe("(no page text fetched)");
  });
});
