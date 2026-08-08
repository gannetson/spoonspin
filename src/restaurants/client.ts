import type { Restaurant, RestaurantSearchParams, RestaurantSearchResult } from "./types";
import { buildMapsSearchUrl, withDistances } from "./shared";

export async function fetchRestaurantById(
  id: string,
): Promise<Restaurant | null> {
  const response = await fetch(`/api/restaurants/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Could not load restaurant.");
  }
  const data = (await response.json()) as { restaurant: Restaurant };
  return data.restaurant;
}

export async function fetchRestaurants(
  params: RestaurantSearchParams,
): Promise<RestaurantSearchResult> {
  try {
    const response = await fetch("/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cuisineAliases: params.cuisineAliases,
        countryName: params.countryName,
        countryCode: params.countryCode,
        cityOrPostcode: params.cityOrPostcode,
        visitorLocation: params.visitorLocation,
      }),
    });

    if (!response.ok) {
      const mapsSearchUrl = buildMapsSearchUrl(params);
      let message = "Restaurant search failed. You can still open Google Maps.";
      try {
        const errorBody = (await response.json()) as { message?: string };
        if (errorBody.message) message = errorBody.message;
      } catch {
        // keep default message
      }
      return {
        status: "error",
        restaurants: [],
        source: "fallback",
        mapsSearchUrl,
        message,
      };
    }

    const data = (await response.json()) as RestaurantSearchResult;
    return {
      ...data,
      restaurants: withDistances(data.restaurants, params.visitorLocation),
    };
  } catch {
    return {
      status: "error",
      restaurants: [],
      source: "fallback",
      mapsSearchUrl: buildMapsSearchUrl(params),
      message:
        "Restaurant search is unavailable right now. Country and recipe browsing still work.",
    };
  }
}
