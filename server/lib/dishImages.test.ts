import { describe, expect, it } from "vitest";
import { significantWords, titleMatchesDish } from "./dishImages.ts";

describe("dish image matching", () => {
  it("keeps the words that identify a dish", () => {
    expect(significantWords("Pasta alla Norma with eggplant")).toEqual([
      "pasta",
      "alla",
      "norma",
      "eggplant",
    ]);
  });

  it("accepts a candidate whose title shares a key word, ignoring accents", () => {
    expect(titleMatchesDish("Homemade svíčková na smetaně", "Svickova")).toBe(true);
    expect(titleMatchesDish("Tavë kosi baked lamb", "Tave Kosi")).toBe(true);
    expect(titleMatchesDish("Sunset over the harbour", "Feijoada")).toBe(false);
  });
});
