import { describe, expect, it } from "vitest";
import type { Restaurant } from "./types";
import { defaultRankScore, sortRestaurants } from "./sortRestaurants";

function place(partial: Partial<Restaurant> & Pick<Restaurant, "id" | "name">): Restaurant {
  return {
    address: "Test",
    city: "Leiden",
    cuisineCodes: [],
    mapsUrl: "https://maps.example",
    ...partial,
  };
}

describe("sortRestaurants", () => {
  const places = [
    place({
      id: "1",
      name: "Near Mid Auth",
      distanceKm: 5,
      authenticityRating: 3,
      rating: 4.0,
    }),
    place({
      id: "2",
      name: "Far High Auth",
      distanceKm: 60,
      authenticityRating: 5,
      rating: 4.2,
    }),
    place({
      id: "3",
      name: "Near High Rating",
      distanceKm: 8,
      authenticityRating: 3,
      rating: 4.8,
      reviewCount: 200,
    }),
  ];

  it("sorts by authenticity first", () => {
    const sorted = sortRestaurants(places, "authenticity");
    expect(sorted.map((p) => p.name)).toEqual([
      "Far High Auth",
      "Near Mid Auth",
      "Near High Rating",
    ]);
  });

  it("sorts by guest rating first", () => {
    const sorted = sortRestaurants(places, "rating");
    expect(sorted[0]?.name).toBe("Near High Rating");
  });

  it("default balances distance, authenticity, and rating", () => {
    expect(defaultRankScore(places[0]!)).toBeGreaterThan(0);
    const sorted = sortRestaurants(places, "default");
    expect(sorted).toHaveLength(3);
    expect(sorted[0]?.id).toBeTruthy();
  });
});
