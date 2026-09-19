import { describe, expect, it } from "vitest";
import {
  mapYelpRestaurantItem,
  normalizeYelpBizUrl,
  resolveYelpCities,
} from "./apifyYelpSearch.ts";

describe("normalizeYelpBizUrl", () => {
  it("canonicalizes biz URLs and drops tracking params", () => {
    expect(
      normalizeYelpBizUrl("https://www.yelp.nl/biz/Thai-Garden-Amsterdam?osq=thai"),
    ).toBe("https://www.yelp.com/biz/thai-garden-amsterdam");
  });

  it("rejects non-biz yelp pages", () => {
    expect(normalizeYelpBizUrl("https://www.yelp.com/search?find_desc=thai")).toBeUndefined();
  });

  it("rejects non-yelp hosts", () => {
    expect(normalizeYelpBizUrl("https://example.com/biz/foo")).toBeUndefined();
  });
});

describe("resolveYelpCities", () => {
  it("defaults to major NL cities", () => {
    const { cities } = resolveYelpCities();
    expect(cities.length).toBeGreaterThanOrEqual(2);
    expect(cities[0]).toBe("Amsterdam");
  });

  it("picks a city from the query", () => {
    const { cities, focusTerms } = resolveYelpCities("Leiden family-run");
    expect(cities).toEqual(["Leiden"]);
    expect(focusTerms.join(" ").toLowerCase()).toContain("family");
  });
});

describe("mapYelpRestaurantItem", () => {
  it("maps a fusion-style row with nested location", () => {
    const place = mapYelpRestaurantItem(
      {
        id: "abc123",
        name: "Thai Garden",
        url: "https://www.yelp.com/biz/thai-garden-amsterdam?adjust=1",
        categories: [{ alias: "thai", title: "Thai" }],
        location: {
          address1: "Haarlemmerstraat 10",
          zipCode: "1013 EJ",
          city: "Amsterdam",
          country: "NL",
        },
        coordinates: { latitude: 52.38, longitude: 4.89 },
        rating: 4.5,
        reviewCount: 120,
        price: "€€",
        phone: "+31201234567",
      },
      "thai · Amsterdam, Netherlands",
    );

    expect(place).not.toBeNull();
    expect(place?.source).toBe("yelp");
    expect(place?.placeId).toBe("yelp:abc123");
    expect(place?.city).toBe("Amsterdam");
    expect(place?.yelpUrl).toBe("https://www.yelp.com/biz/thai-garden-amsterdam");
    expect(place?.matchedQuery).toContain("Thai");
    expect(place?.rating).toBe(4.5);
  });

  it("drops listings outside the Netherlands", () => {
    expect(
      mapYelpRestaurantItem({
        name: "Thai Palace",
        url: "https://www.yelp.com/biz/thai-palace-berlin",
        categories: [{ title: "Thai" }],
        location: { address1: "Torstr 1", city: "Berlin", country: "DE" },
      }),
    ).toBeNull();
  });

  it("drops non-food businesses", () => {
    expect(
      mapYelpRestaurantItem({
        name: "Thai Massage Center",
        url: "https://www.yelp.com/biz/thai-massage-amsterdam",
        categories: [{ title: "Massage" }],
        location: { address1: "Damrak 1", city: "Amsterdam", country: "NL" },
      }),
    ).toBeNull();
  });

  it("uses displayAddress arrays when no flat address exists", () => {
    const place = mapYelpRestaurantItem({
      name: "Sofra",
      url: "https://www.yelp.com/biz/sofra-rotterdam",
      categories: [{ title: "Restaurants" }],
      location: {
        displayAddress: ["Witte de Withstraat 5", "3012 BL Rotterdam", "Netherlands"],
        city: "Rotterdam",
        country: "NL",
      },
    });
    expect(place?.address).toContain("Witte de Withstraat 5");
    expect(place?.city).toBe("Rotterdam");
  });

  it("returns null for rows without a usable name or address", () => {
    expect(mapYelpRestaurantItem({ categories: [{ title: "Restaurants" }] })).toBeNull();
  });
});
