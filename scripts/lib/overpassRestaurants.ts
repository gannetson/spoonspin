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

export function buildOverpassQuery(
  tags: string[],
  lat: number,
  lng: number,
  radiusMeters: number,
): string {
  const cuisineRegex = tags
    .map((tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  return `
[out:json][timeout:90];
(
  nwr["amenity"~"^(restaurant|fast_food|cafe)$"]["cuisine"~"${cuisineRegex}",i](around:${radiusMeters},${lat},${lng});
);
out center tags;
`.trim();
}

export async function fetchOverpass(
  query: string,
  attempt = 1,
  endpointIndex = 0,
): Promise<OverpassElement[]> {
  const endpoint =
    OVERPASS_ENDPOINTS[endpointIndex % OVERPASS_ENDPOINTS.length]!;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": OVERPASS_USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (
    (response.status === 429 ||
      response.status === 504 ||
      response.status === 502) &&
    attempt < 6
  ) {
    const waitMs = attempt * 10000;
    console.log(
      `overpass ${response.status} on ${endpoint}, retry #${attempt} in ${waitMs}ms…`,
    );
    await sleep(waitMs);
    return fetchOverpass(query, attempt + 1, endpointIndex + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Overpass ${response.status}: ${text.slice(0, 240)}`);
  }

  const data = (await response.json()) as { elements?: OverpassElement[] };
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
  const city =
    tags["addr:city"] || tags["addr:place"] || tags["addr:town"] || "";
  const postcode = tags["addr:postcode"] || null;
  const addressParts = [street, postcode, city].filter(Boolean);
  const address =
    addressParts.join(", ") ||
    (lat != null && lng != null
      ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      : "Netherlands");

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
    upsertRestaurant(restaurant);
    upserted += 1;
  }
  return upserted;
}
