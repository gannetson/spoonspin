/**
 * Dry-run OSM Overpass search for admin restaurant discover (no DB upserts).
 */

import {
  buildOverpassQuery,
  elementToRestaurant,
  fetchOverpass,
  HUBS,
  sleep,
  type Hub,
} from "../../scripts/lib/overpassRestaurants.ts";
import { osmTagsForCountry } from "../../src/restaurants/osmCuisineMap.ts";
import type { GroundedPlace } from "./googlePlacesLookup.ts";
import { officialWebsiteOrUndefined } from "./googlePlacesLookup.ts";

const DEFAULT_RADIUS_KM = 25;

function looksLikeStreetAddress(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed || trimmed === "Netherlands") return false;
  // Reject lat,lng-only fallbacks from elementToRestaurant.
  if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(trimmed)) return false;
  return /[a-zA-Z]/.test(trimmed) && /\d/.test(trimmed);
}

/**
 * Search OSM specialty tags for a country across major NL hubs.
 * Failures are logged and return []; never throws to the caller.
 */
export async function searchOsmRestaurantsForCountry(input: {
  countryCode: string;
  hubs?: Hub[];
  radiusKm?: number;
}): Promise<GroundedPlace[]> {
  const tags = osmTagsForCountry(input.countryCode);
  if (tags.length === 0) return [];

  const hubs = input.hubs ?? HUBS["nl-major"] ?? [];
  const radiusKm = input.radiusKm ?? DEFAULT_RADIUS_KM;
  const byKey = new Map<string, GroundedPlace>();

  try {
    for (const hub of hubs) {
      const query = buildOverpassQuery(
        tags,
        hub.lat,
        hub.lng,
        Math.round(radiusKm * 1000),
      );
      let elements;
      try {
        elements = await fetchOverpass(query);
      } catch (error) {
        console.warn(
          `OSM discover failed for ${input.countryCode} @ ${hub.id}`,
          error,
        );
        continue;
      }

      for (const element of elements) {
        const row = elementToRestaurant(element, input.countryCode);
        if (!row) continue;
        if (!looksLikeStreetAddress(row.address)) continue;

        const key = row.osmId;
        if (byKey.has(key)) continue;

        byKey.set(key, {
          placeId: `osm:${key}`,
          name: row.name,
          address: row.address.split(",")[0]?.trim() || row.address,
          city: row.city,
          postcode: row.postcode ?? undefined,
          lat: row.lat ?? undefined,
          lng: row.lng ?? undefined,
          website: officialWebsiteOrUndefined(row.website ?? undefined),
          mapsUrl: row.mapsUrl,
          phone: row.phone ?? undefined,
          matchedQuery: `osm cuisine=${tags.join("|")} near ${hub.name}`,
          source: "osm",
        });
      }

      await sleep(800);
    }
  } catch (error) {
    console.warn(`OSM discover aborted for ${input.countryCode}`, error);
    return [];
  }

  return [...byKey.values()];
}
