import { describe, expect, it } from "vitest";
import {
  bareCuisineTerm,
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

describe("bare demonyms from curated aliases", () => {
  const aliasIndex = buildCuisineTermIndex([
    { code: "ma", name: "Morocco", cuisineAliases: ["Marokkaans restaurant"] },
    { code: "ge", name: "Georgia", cuisineAliases: ["restaurant uit Georgië"] },
    { code: "dz", name: "Algeria", cuisineAliases: ["Algerijns restaurant"] },
  ]);

  it("matches a demonym written the way venues actually write it", () => {
    // The curated alias is the phrase "Marokkaans restaurant"; venue text says
    // "Traditioneel Marokkaans eten".
    const result = findCuisineMentions({
      text: "Hello Couscous | Traditioneel Marokkaans eten",
      searchCode: "ma",
      index: aliasIndex,
    });
    expect(result.mentioned).toBe(true);
  });

  it("reports that Moroccan naming when the search was Algerian", () => {
    const result = findCuisineMentions({
      text: "Hello Couscous | Traditioneel Marokkaans eten",
      searchCode: "dz",
      index: aliasIndex,
    });
    expect(result.mentioned).toBe(false);
    expect(result.otherCountryCodes).toContain("ma");
  });

  it("drops connective words rather than indexing them as terms", () => {
    expect(bareCuisineTerm("restaurant uit Georgië")).toBe("georgie");
  });
});
