import { describe, expect, it } from "vitest";
import {
  aggregateGuestRating,
  listReviewLinks,
  listSourceRatings,
  normalizeToFive,
} from "./ratings";
import {
  isTheForkRestaurantUrl,
  isTripadvisorRestaurantUrl,
  pickReviewProfileUrl,
} from "./reviewLinks";

describe("restaurant ratings", () => {
  it("normalizes The Fork /10 scores to a 5-point scale", () => {
    expect(normalizeToFive({ score: 9.0, scale: 10 })).toBe(4.5);
  });

  it("aggregates multi-source ratings with review-volume weighting", () => {
    const aggregated = aggregateGuestRating({
      google: { score: 4.6, count: 400 },
      theFork: { score: 9.0, scale: 10, count: 80 },
      tripadvisor: { score: 4.0, count: 120 },
    });
    expect(aggregated.rating).toBeGreaterThan(4);
    expect(aggregated.rating).toBeLessThan(5);
    expect(aggregated.reviewCount).toBe(600);
  });

  it("lists sources in display order", () => {
    const listed = listSourceRatings({
      tripadvisor: { score: 4.2, count: 10 },
      google: { score: 4.5, count: 20 },
    });
    expect(listed.map((item) => item.source)).toEqual(["google", "tripadvisor"]);
  });

  it("only lists real stored profile URLs (no search fallbacks)", () => {
    const links = listReviewLinks({
      name: "Marani",
      city: "Delft",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Marani+Delft",
      ratings: {
        google: {
          score: 4.6,
          url: "https://maps.google.com/?cid=123",
        },
        tripadvisor: {
          score: 4.2,
          url: "https://www.tripadvisor.nl/Restaurant_Review-g188590-d1234567-Reviews-Marani-Delft.html",
        },
      },
    });
    expect(links.map((link) => link.source)).toEqual(["google", "tripadvisor"]);
    expect(links[0]?.href).toBe("https://maps.google.com/?cid=123");
    expect(links[1]?.href).toContain("Restaurant_Review");
    expect(links[1]?.href).not.toContain("/Search");
  });

  it("omits platforms without a verified profile URL", () => {
    const links = listReviewLinks({
      name: "Marani",
      city: "Delft",
      ratings: {
        google: { score: 4.6 },
      },
    });
    expect(links).toEqual([]);
  });
});

describe("review profile URL matching", () => {
  it("accepts Tripadvisor and The Fork restaurant paths", () => {
    expect(
      isTripadvisorRestaurantUrl(
        "https://www.tripadvisor.nl/Restaurant_Review-g188590-d123-Reviews-Foo-Amsterdam.html",
      ),
    ).toBe(true);
    expect(
      isTheForkRestaurantUrl("https://www.thefork.nl/restaurant/foo-bar-r123456"),
    ).toBe(true);
    expect(isTripadvisorRestaurantUrl("https://www.tripadvisor.nl/Search?q=foo")).toBe(
      false,
    );
  });

  it("picks a matching profile from search sources", () => {
    const url = pickReviewProfileUrl(
      "theFork",
      [
        "https://www.thefork.nl/search?text=Marani",
        "https://www.thefork.nl/restaurant/marani-delft-r654321",
        "https://www.thefork.nl/restaurant/other-place-r111",
      ],
      { name: "Marani", city: "Delft" },
    );
    expect(url).toBe("https://www.thefork.nl/restaurant/marani-delft-r654321");
  });
});
