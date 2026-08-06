import { describe, expect, it } from "vitest";
import { dedupeRestaurantsByPlaceId } from "@/restaurants/utils";
import type { Restaurant } from "@/restaurants/types";

describe("restaurant deduplication", () => {
  it("deduplicates restaurants from multiple cuisine aliases by place id", () => {
    const restaurants: Restaurant[] = [
      {
        id: "place-1",
        name: "Tbilisi Table",
        address: "Street 1, Amsterdam",
        city: "Amsterdam",
        mapsUrl: "https://maps.example/1",
      },
      {
        id: "place-2",
        name: "Kavkaz Kitchen",
        address: "Street 2, Utrecht",
        city: "Utrecht",
        mapsUrl: "https://maps.example/2",
      },
      {
        id: "place-1",
        name: "Tbilisi Table",
        address: "Street 1, Amsterdam",
        city: "Amsterdam",
        mapsUrl: "https://maps.example/1",
      },
    ];

    const unique = dedupeRestaurantsByPlaceId(restaurants);
    expect(unique).toHaveLength(2);
    expect(unique.map((r) => r.id)).toEqual(["place-1", "place-2"]);
  });
});
