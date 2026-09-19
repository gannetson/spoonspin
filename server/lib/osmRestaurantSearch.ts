/**
 * Dry-run OSM Overpass search for admin restaurant discover (no DB upserts).
 * One nationwide query — sequential hub round-trips are too slow for live search.
 */

import {
  buildOverpassBboxQuery,
  elementToRestaurant,
  fetchOverpass,
  NL_BBOX,
} from "../../scripts/lib/overpassRestaurants.ts";
import { osmTagsForCountry } from "../../src/restaurants/osmCuisineMap.ts";
import type { GroundedPlace } from "./googlePlacesLookup.ts";
import { officialWebsiteOrUndefined } from "./googlePlacesLookup.ts";

const QUERY_TIMEOUT_SEC = 20;
const FETCH_TIMEOUT_MS = 22_000;

function looksLikeStreetAddress(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed || trimmed === "Netherlands") return false;
  // Reject lat,lng-only fallbacks from elementToRestaurant.
  if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(trimmed)) return false;
  return /[a-zA-Z]/.test(trimmed) && /\d/.test(trimmed);
}

function isTimeoutError(error: unknown): boolean {
  return (
    (error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")) ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

/**
 * Search OSM specialty tags across the Netherlands in a single Overpass request.
 * Failures are logged and skipped; never throws to the caller.
 */
export async function searchOsmRestaurantsForCountry(input: {
  countryCode: string;
  onProgress?: (message: string) => void;
}): Promise<GroundedPlace[]> {
  const tags = osmTagsForCountry(input.countryCode);
  if (tags.length === 0) return [];

  input.onProgress?.("OpenStreetMap · Netherlands");
  const query = buildOverpassBboxQuery(tags, NL_BBOX, QUERY_TIMEOUT_SEC);

  let elements;
  try {
    elements = await fetchOverpass(query, 1, 0, {
      timeoutMs: FETCH_TIMEOUT_MS,
      maxAttempts: 2,
      retryOnAbort: false,
      retryWaitMs: () => 400,
    });
  } catch (error) {
    const reason = isTimeoutError(error) ? "timed out" : "failed";
    input.onProgress?.(`OpenStreetMap ${reason}; continuing without it.`);
    console.warn(`OSM discover ${reason} for ${input.countryCode}`, error);
    return [];
  }

  const byKey = new Map<string, GroundedPlace>();
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
      matchedQuery: `osm cuisine=${tags.join("|")}`,
      source: "osm",
    });
  }

  return [...byKey.values()];
}
