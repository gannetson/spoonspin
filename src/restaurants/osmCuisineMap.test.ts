import { describe, expect, it } from "vitest";
import {
  countryCodesForOsmCuisineTag,
  countryCodesFromOsmTags,
  hasPrimaryCuisineMatch,
  osmTagsForCountry,
} from "./osmCuisineMap";

describe("osmCuisineMap", () => {
  it("maps published countries to OSM cuisine tags", () => {
    expect(osmTagsForCountry("it")).toContain("italian");
    expect(osmTagsForCountry("ge")).toContain("georgian");
    expect(osmTagsForCountry("et")).toContain("ethiopian");
    expect(osmTagsForCountry("fr")).toContain("french");
    expect(osmTagsForCountry("xx")).toEqual([]);
  });

  it("ignores weak tags when resolving country codes", () => {
    expect(countryCodesForOsmCuisineTag("asian")).toEqual([]);
    expect(countryCodesForOsmCuisineTag("african")).toEqual([]);
    expect(countryCodesForOsmCuisineTag("georgian")).toEqual(["ge"]);
    expect(countryCodesFromOsmTags(["asian", "georgian"])).toEqual(["ge"]);
  });

  it("checks primary cuisine matches", () => {
    expect(hasPrimaryCuisineMatch("it", ["pizza", "italian"])).toBe(true);
    expect(hasPrimaryCuisineMatch("it", ["asian"])).toBe(false);
  });
});
