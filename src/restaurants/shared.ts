import type { Restaurant } from "./types";
import { haversineKm } from "../lib/haversine";
export { buildMapsSearchUrl, dedupeRestaurantsByPlaceId } from "./utils";

export function withDistances(
  restaurants: Restaurant[],
  visitorLocation?: { lat: number; lng: number },
): Restaurant[] {
  if (!visitorLocation) return restaurants;

  return restaurants
    .map((restaurant) => {
      if (!restaurant.location) return { ...restaurant };
      return {
        ...restaurant,
        distanceKm: haversineKm(visitorLocation, restaurant.location),
      };
    })
    .sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
}
