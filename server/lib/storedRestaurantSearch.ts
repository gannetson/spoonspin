/**
 * Discovery source: restaurants the OSM and Overture harvests already stored but nobody
 * has promoted yet. Instant (one database query, no API call), and it covers Belgium and
 * western Germany, which the live Google/Tripadvisor/Zenchef sources do not.
 *
 * Rows go through the same scoring, evidence gate and cuisine check as every other
 * source; this only supplies candidates. A place is marked with the source that found it
 * (`osm` or `overture`), so it is labelled and weighed accordingly.
 */
import { listUnreviewedForCuisine, type StoredRestaurant } from "../db/restaurants.ts";
import { findCityAnchorInText } from "../../src/restaurants/coverage.ts";
import { canPromote } from "./promotionPolicy.ts";
import { officialWebsiteOrUndefined, type GroundedPlace } from "./googlePlacesLookup.ts";

/** Search this far around a city named in the admin's focus text. */
export const STORED_SEARCH_RADIUS_KM = 30;

/** A real street address, not the coordinates or country name a harvest falls back to. */
export function hasUsableAddress(row: Pick<StoredRestaurant, "address">): boolean {
  const address = row.address.trim();
  if (!address) return false;
  if (["netherlands", "belgium", "germany"].includes(address.toLowerCase())) return false;
  if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(address)) return false;
  return /[a-zA-Z]/.test(address);
}

export function storedRowToGroundedPlace(row: StoredRestaurant): GroundedPlace {
  const fromOverture = row.source === "overture";
  return {
    // The same key the live OSM source uses, so one venue found by both stays one candidate.
    placeId: fromOverture ? `stored:${row.osmId}` : `osm:${row.osmId}`,
    name: row.name,
    address: row.address.split(",")[0]?.trim() || row.address,
    city: row.city,
    postcode: row.postcode ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    website: officialWebsiteOrUndefined(row.website ?? undefined),
    mapsUrl: row.mapsUrl,
    phone: row.phone ?? undefined,
    matchedQuery: fromOverture ? "overture category" : "stored osm cuisine tag",
    sourceCuisineTags: row.cuisineTags,
    source: fromOverture ? "overture" : "osm",
  };
}

export async function searchStoredRestaurantsForCountry(input: {
  countryCode: string;
  /** Admin's optional focus text; a city named in it narrows the search to around that city. */
  focus?: string;
  limit?: number;
  onProgress?: (message: string) => void;
}): Promise<GroundedPlace[]> {
  const city = input.focus ? findCityAnchorInText(input.focus) : undefined;
  const rows = await listUnreviewedForCuisine({
    cuisineCode: input.countryCode,
    near: city
      ? { lat: city.lat, lng: city.lng, radiusKm: STORED_SEARCH_RADIUS_KM }
      : undefined,
    limit: input.limit ?? 60,
  });
  const usable = rows.filter((row) => hasUsableAddress(row) && canPromote(row));
  input.onProgress?.(
    `Stored harvest${city ? ` near ${city.name}` : ""}: ${usable.length} candidate(s)`,
  );
  return usable.map(storedRowToGroundedPlace);
}
