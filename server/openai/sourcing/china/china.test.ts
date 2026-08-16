import { describe, expect, it } from "vitest";
import { isXiaohongshuUrl } from "./xiaohongshu";
import { chinaRecipeSourcing } from "./index";

describe("china recipe sourcing", () => {
  it("matches China country code only", () => {
    expect(chinaRecipeSourcing.matches({ countryCode: "cn" })).toBe(true);
    expect(chinaRecipeSourcing.matches({ countryCode: "it" })).toBe(false);
  });

  it("detects xiaohongshu URLs", () => {
    expect(isXiaohongshuUrl("https://www.xiaohongshu.com/explore/abc")).toBe(true);
    expect(isXiaohongshuUrl("https://example.com/recipe")).toBe(false);
  });

  it("declares xiaohongshu as its source domain", () => {
    expect(chinaRecipeSourcing.sourceDomains).toContain("xiaohongshu.com");
    expect(chinaRecipeSourcing.expandSystemExtra?.({ countryCode: "cn" })).toContain(
      "xiaohongshu.com",
    );
  });
});
