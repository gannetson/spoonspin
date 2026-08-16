import { describe, expect, it } from "vitest";
import { chinaRecipeSourcing } from "./china/index.ts";
import {
  recipeDiscoverSystemPrompt,
  recipeExpandSystemPrompt,
  resolveRecipeSourcing,
  sanitizeRecipeSourceUrl,
  sourcingContextFromCountry,
} from "./index.ts";

describe("recipe sourcing registry", () => {
  it("resolves china strategy for cn", () => {
    expect(resolveRecipeSourcing({ countryCode: "cn" }).id).toBe("china");
  });

  it("resolves default strategy for other countries", () => {
    expect(resolveRecipeSourcing({ countryCode: "it" }).id).toBe("default");
  });

  it("allows xiaohongshu source only for China", () => {
    const url = "https://www.xiaohongshu.com/explore/abc";
    const ctx = sourcingContextFromCountry("cn");
    expect(sanitizeRecipeSourceUrl(url, ctx)).toBe(url);
    expect(sanitizeRecipeSourceUrl(url, sourcingContextFromCountry("it"))).toBeUndefined();
  });

  it("includes xiaohongshu guidance only for China prompts", () => {
    expect(recipeExpandSystemPrompt("cn")).toContain("xiaohongshu.com");
    expect(recipeExpandSystemPrompt("it")).toContain("Do not use xiaohongshu.com");
    expect(recipeDiscoverSystemPrompt("cn")).toContain("xiaohongshu.com");
    expect(recipeDiscoverSystemPrompt("jp")).toContain("Do not use xiaohongshu.com");
  });

  it("registers china before default", () => {
    expect(chinaRecipeSourcing.priority).toBeGreaterThan(0);
  });
});
