import { describe, expect, it } from "vitest";
import {
  mapTripadvisorRestaurantItem,
  normalizeTripadvisorRestaurantUrl,
  resolveTripadvisorCities,
} from "./apifyTripadvisorSearch.ts";

describe("normalizeTripadvisorRestaurantUrl", () => {
  it("forces english tripadvisor.com Restaurant_Review URLs", () => {
    expect(
      normalizeTripadvisorRestaurantUrl(
        "https://www.tripadvisor.nl/Restaurant_Review-g188590-d123-Reviews-Foo-Amsterdam.html",
      ),
    ).toBe(
      "https://www.tripadvisor.com/Restaurant_Review-g188590-d123-Reviews-Foo-Amsterdam.html",
    );
  });

  it("rejects search pages", () => {
    expect(
      normalizeTripadvisorRestaurantUrl(
        "https://www.tripadvisor.com/Search?q=thai",
      ),
    ).toBeUndefined();
  });
});

describe("resolveTripadvisorCities", () => {
  it("defaults to major NL cities", () => {
    const { cities } = resolveTripadvisorCities();
    expect(cities.length).toBeGreaterThanOrEqual(2);
    expect(cities[0]).toBe("Amsterdam");
  });

  it("picks a city from the query", () => {
    const { cities, focusTerms } = resolveTripadvisorCities("Leiden family-run");
    expect(cities).toEqual(["Leiden"]);
    expect(focusTerms.join(" ").toLowerCase()).toContain("family");
  });
});

describe("mapTripadvisorRestaurantItem", () => {
  it("maps lead-scraper style restaurant rows in the Netherlands", () => {
    const place = mapTripadvisorRestaurantItem(
      {
        name: "Thai Garden",
        address: "Haarlemmerstraat 10, 2312 GD Leiden, Netherlands",
        city: "Leiden",
        country: "Netherlands",
        rating: 4.5,
        reviewCount: 120,
        cuisine: "Thai, Asian",
        priceLevel: "€€",
        website: "https://example-thai.nl",
        phone: "+31 71 000 0000",
        url: "https://www.tripadvisor.com/Restaurant_Review-g188582-d123-Reviews-Thai_Garden-Leiden.html",
      },
      "Thai · Leiden, Netherlands",
    );
    expect(place).toMatchObject({
      source: "tripadvisor",
      name: "Thai Garden",
      city: "Leiden",
      rating: 4.5,
      website: "https://example-thai.nl",
    });
    expect(place?.tripadvisorUrl).toContain("tripadvisor.com/Restaurant_Review-");
    expect(place?.matchedQuery).toContain("Thai");
  });

  it("maps English restaurant listings in the Netherlands", () => {
    const place = mapTripadvisorRestaurantItem(
      {
        id: "123",
        type: "RESTAURANT",
        category: "restaurant",
        name: "Thai Garden",
        address: "Haarlemmerstraat 10, 2312 GD Leiden, Netherlands",
        addressObj: {
          street1: "Haarlemmerstraat 10",
          city: "Leiden",
          country: "The Netherlands",
          postalcode: "2312 GD",
        },
        rating: 4.5,
        numberOfReviews: 120,
        cuisines: ["Thai", "Asian"],
        webUrl:
          "https://www.tripadvisor.com/Restaurant_Review-g188582-d123-Reviews-Thai_Garden-Leiden.html",
        website: "https://example-thai.nl",
        latitude: 52.16,
        longitude: 4.49,
      },
      "Thai · Leiden, Netherlands",
    );
    expect(place).toMatchObject({
      source: "tripadvisor",
      name: "Thai Garden",
      city: "Leiden",
      rating: 4.5,
      website: "https://example-thai.nl",
    });
    expect(place?.tripadvisorUrl).toContain("tripadvisor.com/Restaurant_Review-");
  });

  it("rejects non-NL restaurants", () => {
    expect(
      mapTripadvisorRestaurantItem({
        type: "RESTAURANT",
        name: "Paris Bistro",
        address: "1 Rue de Rivoli, Paris",
        addressObj: { city: "Paris", country: "France" },
        webUrl:
          "https://www.tripadvisor.com/Restaurant_Review-g187147-d1-Reviews-Paris_Bistro-Paris.html",
      }),
    ).toBeNull();
  });
});
