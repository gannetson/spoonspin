import { dedupeRestaurantsByPlaceId } from "../../src/restaurants/utils.ts";
import type { Restaurant } from "../../src/restaurants/types.ts";
import type { LiveRestaurantProvider, ProviderSearchInput } from "./types.ts";
import { locationHint } from "./types.ts";

type MapboxFeature = {
  properties?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    address?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
    context?: {
      place?: { name?: string };
      locality?: { name?: string };
    };
    metadata?: {
      website?: string;
    };
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

/**
 * Mapbox Search Box forward search.
 * Free monthly allowance on Mapbox accounts; token must stay server-side.
 */
export function createMapboxProvider(accessToken: string): LiveRestaurantProvider {
  return {
    id: "mapbox",
    async search(input: ProviderSearchInput): Promise<Restaurant[]> {
      const batches = await Promise.all(
        input.cuisineAliases.map((alias) =>
          forwardSearch(alias, input, accessToken),
        ),
      );
      return dedupeRestaurantsByPlaceId(batches.flat());
    },
  };
}

async function forwardSearch(
  alias: string,
  input: ProviderSearchInput,
  accessToken: string,
): Promise<Restaurant[]> {
  const query = `${alias} ${locationHint(input.cityOrPostcode)}`;
  const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");
  url.searchParams.set("q", query);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("country", "nl");
  url.searchParams.set("language", "en");
  url.searchParams.set("limit", "10");
  url.searchParams.set("types", "poi");
  if (input.visitorLocation) {
    url.searchParams.set(
      "proximity",
      `${input.visitorLocation.lng},${input.visitorLocation.lat}`,
    );
  }

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mapbox Search ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as { features?: MapboxFeature[] };

  return (data.features ?? [])
    .map((feature) => toRestaurant(feature))
    .filter((restaurant): restaurant is Restaurant => restaurant != null);
}

function toRestaurant(feature: MapboxFeature): Restaurant | null {
  const props = feature.properties;
  const id = props?.mapbox_id;
  const name = props?.name;
  if (!id || !name) return null;

  const address =
    props.full_address ??
    [props.address, props.place_formatted].filter(Boolean).join(", ");
  const city =
    props.context?.place?.name ??
    props.context?.locality?.name ??
    extractCity(address);

  const lat =
    props.coordinates?.latitude ?? feature.geometry?.coordinates?.[1];
  const lng =
    props.coordinates?.longitude ?? feature.geometry?.coordinates?.[0];

  const mapsQuery = encodeURIComponent(address || name);

  return {
    id,
    name,
    address: address || city || "Netherlands",
    city: city || "Netherlands",
    website: props.metadata?.website,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
    location:
      lat != null && lng != null
        ? {
            lat,
            lng,
          }
        : undefined,
  };
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
