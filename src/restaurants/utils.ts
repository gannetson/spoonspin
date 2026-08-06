import type { Restaurant, RestaurantSearchParams } from "./types";

export function buildMapsSearchUrl(params: RestaurantSearchParams): string {
  const locationPart = params.cityOrPostcode?.trim()
    ? `${params.cityOrPostcode.trim()}, Netherlands`
    : "Netherlands";
  const query = `${params.countryName} restaurant ${locationPart}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function dedupeRestaurantsByPlaceId(restaurants: Restaurant[]): Restaurant[] {
  const seen = new Set<string>();
  const unique: Restaurant[] = [];
  for (const restaurant of restaurants) {
    if (seen.has(restaurant.id)) continue;
    seen.add(restaurant.id);
    unique.push(restaurant);
  }
  return unique;
}
