import { dedupeRestaurantsByPlaceId } from "../../src/restaurants/utils.ts";
import type { Restaurant } from "../../src/restaurants/types.ts";
import type { LiveRestaurantProvider, ProviderSearchInput } from "./types.ts";
import { locationHint } from "./types.ts";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.googleMapsUri",
].join(",");

export function createGooglePlacesProvider(
  apiKey: string,
): LiveRestaurantProvider {
  return {
    id: "google",
    async search(input: ProviderSearchInput): Promise<Restaurant[]> {
      const batches = await Promise.all(
        input.cuisineAliases.map((alias) =>
          textSearch(alias, input.cityOrPostcode, apiKey),
        ),
      );
      return dedupeRestaurantsByPlaceId(batches.flat());
    },
  };
}

async function textSearch(
  alias: string,
  cityOrPostcode: string | undefined,
  apiKey: string,
): Promise<Restaurant[]> {
  const textQuery = `${alias} in ${locationHint(cityOrPostcode)}`;

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "en",
        regionCode: "NL",
        maxResultCount: 10,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Places API ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      rating?: number;
      userRatingCount?: number;
      websiteUri?: string;
      googleMapsUri?: string;
    }>;
  };

  return (data.places ?? [])
    .filter((place) => place.id && place.displayName?.text)
    .map((place) => {
      const address = place.formattedAddress ?? "";
      return {
        id: place.id!,
        name: place.displayName!.text!,
        address,
        city: extractCity(address),
        cuisineCodes: [],
        rating: place.rating,
        reviewCount: place.userRatingCount,
        website: place.websiteUri,
        mapsUrl:
          place.googleMapsUri ??
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName!.text!)}`,
        location:
          place.location?.latitude != null &&
          place.location?.longitude != null
            ? {
                lat: place.location.latitude,
                lng: place.location.longitude,
              }
            : undefined,
      } satisfies Restaurant;
    });
}

function extractCity(address: string): string {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2] ?? parts[0] ?? "";
    return candidate.replace(/^\d{4}\s*[A-Z]{2}\s+/, "");
  }
  return parts[0] ?? "Netherlands";
}
