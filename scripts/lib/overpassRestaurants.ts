import {
  hasPrimaryCuisineMatch,
  osmTagsForCountry,
} from "../../src/restaurants/osmCuisineMap.ts";
import type { RestaurantUpsert } from "../../server/db/restaurants.ts";
import { upsertRestaurant } from "../../server/db/restaurants.ts";

export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export const OVERPASS_USER_AGENT =
  "SpoonSpinRestaurantAgent/0.3 (local research; NL specialty restaurants)";

export type Hub = { id: string; name: string; lat: number; lng: number };

export const HUBS: Record<string, Hub[]> = {
  leiden: [{ id: "leiden", name: "Leiden", lat: 52.1601, lng: 4.497 }],
  randstad: [
    { id: "leiden", name: "Leiden", lat: 52.1601, lng: 4.497 },
    { id: "amsterdam", name: "Amsterdam", lat: 52.3676, lng: 4.9041 },
    { id: "rotterdam", name: "Rotterdam", lat: 51.9244, lng: 4.4777 },
    { id: "den-haag", name: "The Hague", lat: 52.0705, lng: 4.3007 },
    { id: "utrecht", name: "Utrecht", lat: 52.0907, lng: 5.1214 },
  ],
  "nl-major": [
    { id: "leiden", name: "Leiden", lat: 52.1601, lng: 4.497 },
    { id: "amsterdam", name: "Amsterdam", lat: 52.3676, lng: 4.9041 },
    { id: "rotterdam", name: "Rotterdam", lat: 51.9244, lng: 4.4777 },
    { id: "den-haag", name: "The Hague", lat: 52.0705, lng: 4.3007 },
    { id: "utrecht", name: "Utrecht", lat: 52.0907, lng: 5.1214 },
    { id: "eindhoven", name: "Eindhoven", lat: 51.4416, lng: 5.4697 },
    { id: "groningen", name: "Groningen", lat: 53.2194, lng: 6.5665 },
    { id: "maastricht", name: "Maastricht", lat: 50.8514, lng: 5.691 },
  ],
};

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Netherlands mainland + islands, Overpass south,west,north,east. */
export const NL_BBOX = {
  south: 50.75,
  west: 3.2,
  north: 53.6,
  east: 7.23,
};

function cuisineRegex(tags: string[]): string {
  return tags.map((tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}

export function buildOverpassQuery(
  tags: string[],
  lat: number,
  lng: number,
  radiusMeters: number,
  timeoutSeconds = 90,
): string {
  return `
[out:json][timeout:${timeoutSeconds}];
(
  nwr["amenity"~"^(restaurant|fast_food|cafe)$"]["cuisine"~"${cuisineRegex(tags)}",i](around:${radiusMeters},${lat},${lng});
);
out center tags;
`.trim();
}

export function buildOverpassBboxQuery(
  tags: string[],
  bbox: { south: number; west: number; north: number; east: number } = NL_BBOX,
  timeoutSeconds = 25,
): string {
  return `
[out:json][timeout:${timeoutSeconds}];
(
  nwr["amenity"~"^(restaurant|fast_food|cafe)$"]["cuisine"~"${cuisineRegex(tags)}",i](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out center tags;
`.trim();
}

export type FetchOverpassOptions = {
  /** Client abort. Overpass can hang indefinitely without this. */
  timeoutMs?: number;
  maxAttempts?: number;
  retryWaitMs?: (attempt: number) => number;
  /** Harvest retries a timed-out hub on the next mirror. Live search should not. */
  retryOnAbort?: boolean;
};

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "TimeoutError") ||
    (error instanceof Error && error.name === "AbortError") ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

export async function fetchOverpass(
  query: string,
  attempt = 1,
  endpointIndex = 0,
  options: FetchOverpassOptions = {},
): Promise<OverpassElement[]> {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const maxAttempts = options.maxAttempts ?? 6;
  const retryWaitMs = options.retryWaitMs ?? ((n: number) => n * 10_000);
  const retryOnAbort = options.retryOnAbort ?? true;
  const endpoint = OVERPASS_ENDPOINTS[endpointIndex % OVERPASS_ENDPOINTS.length]!;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": OVERPASS_USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (retryOnAbort && isAbortError(error) && attempt < maxAttempts) {
      console.log(`overpass timed out on ${endpoint}, retry #${attempt} on next mirror…`);
      return fetchOverpass(query, attempt + 1, endpointIndex + 1, options);
    }
    throw error;
  }

  if (
    (response.status === 429 || response.status === 504 || response.status === 502) &&
    attempt < maxAttempts
  ) {
    const waitMs = retryWaitMs(attempt);
    console.log(
      `overpass ${response.status} on ${endpoint}, retry #${attempt} in ${waitMs}ms…`,
    );
    await sleep(waitMs);
    return fetchOverpass(query, attempt + 1, endpointIndex + 1, options);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Overpass ${response.status}: ${text.slice(0, 240)}`);
  }

  // A loaded Overpass instance answers 200 with an OSM3S *HTML error page*
  // ("The server is probably too busy to handle your request"), not JSON. Left
  // to JSON.parse that surfaces as an unrelated syntax error, so it is detected
  // here and retried on the next mirror like any other overload response.
  const body = await response.text();
  if (!body.trimStart().startsWith("{")) {
    const reason =
      /runtime error:([^<]*)/i.exec(body)?.[1]?.trim() || "non-JSON response";
    if (attempt < maxAttempts) {
      const waitMs = retryWaitMs(attempt);
      console.log(
        `overpass busy on ${endpoint} (${reason.slice(0, 80)}), retry #${attempt} in ${waitMs}ms…`,
      );
      await sleep(waitMs);
      return fetchOverpass(query, attempt + 1, endpointIndex + 1, options);
    }
    throw new Error(`Overpass busy: ${reason.slice(0, 200)}`);
  }

  const data = JSON.parse(body) as { elements?: OverpassElement[] };
  return data.elements ?? [];
}

export function elementToRestaurant(
  element: OverpassElement,
  countryCode: string,
): RestaurantUpsert | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null;

  const cuisineTags = (tags.cuisine ?? "")
    .split(";")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (!hasPrimaryCuisineMatch(countryCode, cuisineTags)) {
    return null;
  }

  const lat = element.lat ?? element.center?.lat ?? null;
  const lng = element.lon ?? element.center?.lon ?? null;
  const street = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ")
    .trim();
  const city = tags["addr:city"] || tags["addr:place"] || tags["addr:town"] || "";
  const postcode = tags["addr:postcode"] || null;
  const addressParts = [street, postcode, city].filter(Boolean);
  const address =
    addressParts.join(", ") ||
    (lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Netherlands");

  const osmId = `${element.type}/${element.id}`;
  const mapsQuery = encodeURIComponent(`${name} ${address}`);

  return {
    id: `osm:${osmId}`,
    name,
    address,
    city: city || "Netherlands",
    postcode,
    lat,
    lng,
    cuisineCodes: [countryCode],
    cuisineTags,
    website: tags.website || tags["contact:website"] || null,
    phone: tags.phone || tags["contact:phone"] || null,
    source: "overpass",
    osmId,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
  };
}

export async function harvestCountryAtHub(options: {
  countryCode: string;
  hub: Hub;
  radiusKm: number;
}): Promise<number> {
  const tags = osmTagsForCountry(options.countryCode);
  if (tags.length === 0) return 0;

  const query = buildOverpassQuery(
    tags,
    options.hub.lat,
    options.hub.lng,
    Math.round(options.radiusKm * 1000),
  );
  const elements = await fetchOverpass(query);
  let upserted = 0;
  for (const element of elements) {
    const restaurant = elementToRestaurant(element, options.countryCode);
    if (!restaurant) continue;
    await upsertRestaurant(restaurant);
    upserted += 1;
  }
  return upserted;
}
