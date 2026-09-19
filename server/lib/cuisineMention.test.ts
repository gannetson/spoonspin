import { describe, expect, it } from "vitest";
import {
  buildCuisineTermIndex,
  buildMentionHaystack,
  findCuisineMentions,
  normalizeText,
} from "./cuisineMention.ts";

const index = buildCuisineTermIndex([
  { code: "th", name: "Thailand", cuisineAliases: ["Thai", "Thais"] },
  { code: "al", name: "Albania", cuisineAliases: ["Albanian", "Albanees"] },
  { code: "it", name: "Italy", cuisineAliases: ["Italian", "Italiaans"] },
  { code: "nl", name: "Netherlands", cuisineAliases: ["Dutch"] },
]);

describe("normalizeText", () => {
  it("strips diacritics and punctuation", () => {
    expect(normalizeText("Café Itáliaans!")).toBe("cafe italiaans");
  });

  it("splits underscored osm tags", () => {
    expect(normalizeText("south_african")).toBe("south african");
  });
});

describe("findCuisineMentions", () => {
  it("accepts an explicit demonym in the listing name", () => {
    const result = findCuisineMentions({
      text: "Thai Garden — authentic Thai restaurant",
      searchCode: "th",
      index,
    });
    expect(result.mentioned).toBe(true);
    expect(result.matchedTerms).toContain("thai");
  });

  it("matches a dutch-language alias from page text", () => {
    const result = findCuisineMentions({
      text: buildMentionHaystack(["Restaurant Skenderbeu", "Albanese en Albanees eten"]),
      searchCode: "al",
      index,
    });
    expect(result.mentioned).toBe(true);
  });

  it("rejects when nothing names the searched cuisine", () => {
    const result = findCuisineMentions({
      text: "Grillroom Ali — shoarma en pizza",
      searchCode: "th",
      index,
    });
    expect(result.mentioned).toBe(false);
    expect(result.otherCountryCodes).toEqual([]);
  });

  it("suggests the country actually named in the evidence", () => {
    const result = findCuisineMentions({
      text: "Trattoria Bella — echte Italiaanse keuken met pasta",
      searchCode: "th",
      index,
    });
    expect(result.mentioned).toBe(false);
    expect(result.otherCountryCodes[0]).toBe("it");
  });

  it("does not match a term embedded in a longer word", () => {
    const result = findCuisineMentions({
      text: "Thailandia Imports BV Thaipark",
      searchCode: "th",
      index,
    });
    expect(result.mentioned).toBe(false);
  });

  it("ignores ambiguous words like turkey on a menu", () => {
    const turkeyIndex = buildCuisineTermIndex([
      { code: "tr", name: "Turkey", cuisineAliases: ["Turkey"] },
    ]);
    const result = findCuisineMentions({
      text: "Smoked turkey sandwich and roast turkey",
      searchCode: "tr",
      index: turkeyIndex,
    });
    expect(result.mentioned).toBe(false);
  });

  it("returns not-mentioned for empty evidence", () => {
    const result = findCuisineMentions({ text: "   ", searchCode: "th", index });
    expect(result.mentioned).toBe(false);
    expect(result.otherCountryCodes).toEqual([]);
  });
});
