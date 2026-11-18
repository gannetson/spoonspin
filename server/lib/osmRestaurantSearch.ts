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
import { findCityAnchorInText } from "../../src/restaurants/coverage.ts";
import { osmTagsForCountry } from "../../src/restaurants/osmCuisineMap.ts";
import type { GroundedPlace } from "./googlePlacesLookup.ts";
import { officialWebsiteOrUndefined } from "./googlePlacesLookup.ts";

/**
 * Overpass regularly needs 30s+ for a nationwide query and frequently answers
 * "server too busy" instead of data. Discovery runs OSM concurrently with
 * Google, so waiting costs nothing when the other sources answer first — but
 * the client budget stays under the caller's source budget so a hung mirror
 * aborts cleanly rather than being abandoned mid-flight.
 */
const QUERY_TIMEOUT_SEC = 25;
const FETCH_TIMEOUT_MS = 27_000;

/**
 * OSM entries carry a `cuisine=` tag a human editor wrote, which makes them the
 * most precise source we have. Many lack full `addr:*` tags though, so only
 * coordinate-only fallbacks are rejected — requiring a house number used to
 * discard most of the matches this source exists to find.
 */
function usableAddress(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed || ["netherlands", "belgium", "germany"].includes(trimmed.toLowerCase())) {
    return false;
  }
  // Reject lat,lng-only fallbacks from elementToRestaurant.
  if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(trimmed)) return false;
  return /[a-zA-Z]/.test(trimmed);
}

function isTimeoutError(error: unknown): boolean {
  return (
    (error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")) ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

type SearchArea = {
  label: string;
  bbox: { south: number; west: number; north: number; east: number };
};

/** A city-sized box: about 30 km tall and 40 km wide, small enough for one quick request. */
const CITY_HALF_HEIGHT_DEG = 0.15;
const CITY_HALF_WIDTH_DEG = 0.25;

/**
 * Where to look. The Netherlands is always searched in one nationwide request, as before.
 * A nationwide request for Belgium and Germany would be far too heavy for a live search,
 * so those are covered only around a city the admin names in the focus text (the stored
 * harvest covers the rest of them).
 */
export function osmSearchAreas(focus?: string): SearchArea[] {
  const areas: SearchArea[] = [{ label: "Netherlands", bbox: NL_BBOX }];
  const city = focus ? findCityAnchorInText(focus) : undefined;
  if (city && city.country !== "nl") {
    areas.push({
      label: city.name,
      bbox: {
        south: city.lat - CITY_HALF_HEIGHT_DEG,
        north: city.lat + CITY_HALF_HEIGHT_DEG,
        west: city.lng - CITY_HALF_WIDTH_DEG,
        east: city.lng + CITY_HALF_WIDTH_DEG,
      },
    });
  }
  return areas;
}

/**
 * Search OSM specialty tags in one Overpass request per area (see `osmSearchAreas`).
 * Failures are logged and skipped; never throws to the caller.
 */
export async function searchOsmRestaurantsForCountry(input: {
  countryCode: string;
  /** Admin's optional focus text; a Belgian or German city in it adds a search around that city. */
  focus?: string;
  onProgress?: (message: string) => void;
}): Promise<GroundedPlace[]> {
  const tags = osmTagsForCountry(input.countryCode);
  if (tags.length === 0) return [];

  const batches = await Promise.all(
    osmSearchAreas(input.focus).map((area) => searchArea(area, tags, input)),
  );

  const byKey = new Map<string, GroundedPlace>();
  for (const place of batches.flat()) {
    if (!byKey.has(place.placeId)) byKey.set(place.placeId, place);
  }
  return [...byKey.values()];
}

async function searchArea(
  area: SearchArea,
  tags: string[],
  input: { countryCode: string; onProgress?: (message: string) => void },
): Promise<GroundedPlace[]> {
  input.onProgress?.(`OpenStreetMap · ${area.label}`);
  const query = buildOverpassBboxQuery(tags, area.bbox, QUERY_TIMEOUT_SEC);

  let elements;
  try {
    elements = await fetchOverpass(query, 1, 0, {
      timeoutMs: FETCH_TIMEOUT_MS,
      maxAttempts: 2,
      // A busy mirror gets one quick retry on the next one; a hung mirror does
      // not, because the whole search is waiting on a budget.
      retryOnAbort: false,
      retryWaitMs: () => 400,
    });
  } catch (error) {
    const reason = isTimeoutError(error) ? "timed out" : "failed";
    input.onProgress?.(`OpenStreetMap (${area.label}) ${reason}; continuing without it.`);
    console.warn(
      `OSM discover ${reason} for ${input.countryCode} in ${area.label}`,
      error,
    );
    return [];
  }

  const byKey = new Map<string, GroundedPlace>();
  for (const element of elements) {
    const row = elementToRestaurant(element, input.countryCode);
    if (!row) continue;
    if (!usableAddress(row.address)) continue;

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
      // The tag itself is the evidence; it is what a mapper recorded on site.
      sourceCuisineTags: (element.tags?.cuisine ?? "")
        .split(";")
        .map((tag) => tag.trim())
        .filter(Boolean),
      source: "osm",
    });
  }

  return [...byKey.values()];
}
