import { dedupeRestaurantsByPlaceId } from "../../src/restaurants/utils.ts";
import type { Restaurant } from "../../src/restaurants/types.ts";
import {
  searchGoogleRestaurantsByCuisine,
} from "../lib/googlePlacesLookup.ts";
import type { LiveRestaurantProvider, ProviderSearchInput } from "./types.ts";
import { locationHint } from "./types.ts";

export function createGooglePlacesProvider(
  apiKey: string,
): LiveRestaurantProvider {
  void apiKey; // key is read from env inside the shared Places helper
  return {
    id: "google",
    async search(input: ProviderSearchInput): Promise<Restaurant[]> {
      const location = locationHint(input.cityOrPostcode);
      const cities =
        location.toLowerCase() === "netherlands" ? undefined : [location];
      const grounded = await searchGoogleRestaurantsByCuisine({
        aliases: input.cuisineAliases,
        cities,
        maxPerQuery: 10,
      });
      const mapped = grounded.map(
        (place) =>
          ({
            id: place.placeId,
            name: place.name,
            address: place.address,
            city: place.city,
            cuisineCodes: [],
            rating: place.rating,
            reviewCount: place.reviewCount,
            website: place.website,
            mapsUrl:
              place.mapsUrl ??
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`,
            location:
              place.lat != null && place.lng != null
                ? { lat: place.lat, lng: place.lng }
                : undefined,
          }) satisfies Restaurant,
      );
      return dedupeRestaurantsByPlaceId(mapped);
    },
  };
}
