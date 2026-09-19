/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  isHighConfidenceVenueMatch,
  mapPlacesPriceLevel,
  placesContentNeedsRefresh,
  scoreVenueMatch,
} from "./googlePlacesService";

describe("mapPlacesPriceLevel", () => {
  it("maps Places API enums to SpoonSpin 1–4 bands", () => {
    expect(mapPlacesPriceLevel("PRICE_LEVEL_INEXPENSIVE")).toBe(1);
    expect(mapPlacesPriceLevel("PRICE_LEVEL_MODERATE")).toBe(2);
    expect(mapPlacesPriceLevel("PRICE_LEVEL_EXPENSIVE")).toBe(3);
    expect(mapPlacesPriceLevel("PRICE_LEVEL_VERY_EXPENSIVE")).toBe(4);
    expect(mapPlacesPriceLevel("PRICE_LEVEL_FREE")).toBeUndefined();
    expect(mapPlacesPriceLevel(undefined)).toBeUndefined();
  });
});

describe("placesContentNeedsRefresh", () => {
  it("needs refresh when never refreshed", () => {
    expect(placesContentNeedsRefresh(null)).toBe(true);
  });

  it("does not need refresh for recent timestamps", () => {
    expect(placesContentNeedsRefresh(new Date().toISOString())).toBe(false);
  });

  it("needs refresh for old timestamps", () => {
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    expect(placesContentNeedsRefresh(old)).toBe(true);
  });
});

describe("scoreVenueMatch", () => {
  it("scores name-only matches below auto-link threshold", () => {
    const result = scoreVenueMatch(
      { name: "Restaurant Blauw" },
      { name: "Restaurant Blauw Amsterdam" },
    );
    expect(result.signals).toEqual(["name"]);
    expect(isHighConfidenceVenueMatch(result)).toBe(false);
  });

  it("auto-links high-confidence multi-signal matches", () => {
    const result = scoreVenueMatch(
      {
        name: "Chummy Coffee",
        postcode: "2312 JS",
        lat: 52.16,
        lng: 4.49,
        phone: "+31 71 123 4567",
        website: "https://www.chummy.nl",
      },
      {
        name: "Chummy Coffee Leiden",
        postcode: "2312JS",
        lat: 52.16005,
        lng: 4.49005,
        phone: "0711234567",
        website: "https://chummy.nl/menu",
      },
    );
    expect(result.score).toBeGreaterThanOrEqual(0.75);
    expect(result.signals).toContain("name");
    expect(result.signals).toContain("postcode");
    expect(isHighConfidenceVenueMatch(result)).toBe(true);
  });

  it("rejects low-confidence different venues", () => {
    const result = scoreVenueMatch(
      { name: "Blauw", city: "Amsterdam" },
      { name: "Mamouche", city: "Amsterdam", postcode: "1075 XN" },
    );
    expect(isHighConfidenceVenueMatch(result)).toBe(false);
  });
});
