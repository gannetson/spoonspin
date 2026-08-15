import type { Restaurant } from "../../src/restaurants/types.ts";

export type ProviderSearchInput = {
  cuisineAliases: string[];
  countryName: string;
  cityOrPostcode?: string;
  visitorLocation?: { lat: number; lng: number };
};

export type LiveProviderId = "google" | "mapbox";

export interface LiveRestaurantProvider {
  id: LiveProviderId;
  search(input: ProviderSearchInput): Promise<Restaurant[]>;
}

export function locationHint(cityOrPostcode?: string): string {
  return cityOrPostcode?.trim() ? `${cityOrPostcode.trim()}, Netherlands` : "Netherlands";
}
