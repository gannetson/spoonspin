import { describe, expect, it } from "vitest";
import {
  cuisineSearchTerms,
  mapThuisbezorgdItem,
  mapUberEatsItem,
  resolveSearchHubs,
} from "./apifyOrderSearch.ts";

describe("resolveSearchHubs", () => {
  it("defaults to Leiden", () => {
    const { hubs, focusTerms } = resolveSearchHubs();
    expect(hubs.map((hub) => hub.city)).toEqual(["Leiden"]);
    expect(focusTerms).toEqual([]);
  });

  it("uses an explicit city and keeps query as focus", () => {
    const { hubs, focusTerms } = resolveSearchHubs("Thai", "Leiden");
    expect(hubs).toEqual([{ city: "Leiden", address: "2312AB Leiden" }]);
    expect(focusTerms).toEqual(["Thai"]);
  });

  it("accepts a freeform city hint", () => {
    const { hubs, focusTerms } = resolveSearchHubs(undefined, "Haarlem");
    expect(hubs).toEqual([{ city: "Haarlem", address: "Haarlem Netherlands" }]);
    expect(focusTerms).toEqual([]);
  });

  it("picks a city from the query and keeps cuisine focus", () => {
    const { hubs, focusTerms } = resolveSearchHubs("Amsterdam Thai");
    expect(hubs).toEqual([{ city: "Amsterdam", address: "1012AB Amsterdam" }]);
    expect(focusTerms.join(" ").toLowerCase()).toContain("thai");
  });

  it("accepts a Dutch postcode", () => {
    const { hubs, focusTerms } = resolveSearchHubs("3011 AB sushi");
    expect(hubs[0]?.address).toMatch(/^3011AB/);
    expect(focusTerms.join(" ").toLowerCase()).toContain("sushi");
  });

  it("treats cuisine-only query as focus near Leiden", () => {
    const { hubs, focusTerms } = resolveSearchHubs("sushi");
    expect(hubs.map((hub) => hub.city)).toEqual(["Leiden"]);
    expect(focusTerms).toEqual(["sushi"]);
  });
});

describe("cuisineSearchTerms", () => {
  it("includes mapped cuisine labels", () => {
    const terms = cuisineSearchTerms("th", "Thailand");
    expect(terms).toContain("Thailand");
    expect(terms).toContain("thai");
    expect(terms).toContain("thais");
  });
});

describe("mapThuisbezorgdItem", () => {
  it("maps a restaurant listing with menu URL", () => {
    const listing = mapThuisbezorgdItem({
      name: "Pizza'dam Rozengracht",
      url: "https://www.thuisbezorgd.nl/en/menu/pizzadam-new",
      city: "Amsterdam",
      rating: 3.9,
      ratingCount: 878,
      cuisines: ["Italian style pizza"],
      deliveryFee: 1.49,
      minimumOrder: 14.99,
      deliveryEtaMinutes: "20-45",
    });
    expect(listing).toMatchObject({
      platform: "thuisbezorgd",
      name: "Pizza'dam Rozengracht",
      city: "Amsterdam",
      rating: 3.9,
    });
    expect(listing?.url).toContain("thuisbezorgd.nl");
    expect(listing?.notes).toContain("3.9★");
  });

  it("rejects non-platform URLs", () => {
    expect(
      mapThuisbezorgdItem({
        name: "Fake",
        url: "https://example.com/menu/x",
      }),
    ).toBeNull();
  });
});

describe("mapUberEatsItem", () => {
  it("maps store results and normalizes URL", () => {
    const listing = mapUberEatsItem({
      title: "Thai Garden",
      url: "https://ubereats.com/store/thai-garden/abc123",
      cuisineList: ["Thai", "Asian"],
      location: { city: "Amsterdam" },
      rating: { ratingValue: 4.6, reviewCount: "200+" },
      featuredItems: { title: "Pad Thai" },
      etaRange: "Delivered in 25 to 40 min",
    });
    expect(listing).toMatchObject({
      platform: "ubereats",
      name: "Thai Garden",
      city: "Amsterdam",
      signatureDishHint: "Pad Thai",
      rating: 4.6,
    });
    expect(listing?.url).toBe("https://www.ubereats.com/nl/store/thai-garden/abc123");
  });
});
