/**
 * Look up / search restaurants via Google Places Text Search (Places API New).
 * Used for admin discover, community suggestions, and name verification.
 */

import { getGooglePlacesApiKey, isGooglePlacesConfigured } from "./googlePlacesPhoto.ts";

export { isGooglePlacesConfigured };

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function namesLikelyMatch(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const leftTokens = new Set(left.split(" ").filter((t) => t.length > 2));
  const rightTokens = right.split(" ").filter((t) => t.length > 2);
  if (rightTokens.length === 0) return false;
  const overlap = rightTokens.filter((t) => leftTokens.has(t)).length;
  return overlap / rightTokens.length >= 0.6;
}

export function extractCity(formattedAddress: string): string | undefined {
  // With country: "Street 1, 1234 AB City, Netherlands"
  // Without country (common with regionCode=NL): "Street 1, 1234 AB City"
  const parts = formattedAddress.split(",").map((p) => p.trim());
  if (parts.length < 2) return undefined;
  const last = parts[parts.length - 1] ?? "";
  const cityPart = /nederland|netherlands|\bnl\b/i.test(last)
    ? (parts[parts.length - 2] ?? "")
    : last;
  const withoutPostcode = cityPart.replace(/^\d{4}\s*[A-Z]{2}\s+/i, "").trim();
  return withoutPostcode || cityPart || undefined;
}

/** Dutch postcode: 4 digits + 2 letters (e.g. 1075 XN). */
const DUTCH_POSTCODE = /\b\d{4}\s*[A-Z]{2}\b/i;

/**
 * Places Text Search with regionCode=NL often omits the country from
 * formattedAddress ("… Amsterdam" instead of "… Amsterdam, Netherlands").
 * Accept explicit country labels or a Dutch postcode.
 */
export function isInNetherlands(formattedAddress: string): boolean {
  if (/nederland|netherlands|\bnl\b/i.test(formattedAddress)) return true;
  return DUTCH_POSTCODE.test(formattedAddress);
}

/** Directory / delivery aggregators — never store as the official website. */
const DIRECTORY_WEBSITE_HOSTS = [
  "tripadvisor.",
  "thefork.",
  "thuisbezorgd.",
  "ubereats.",
  "uber.com",
  "deliveroo.",
  "justeattakeaway.",
  "just-eat.",
  "yelp.",
  "facebook.com",
  "instagram.com",
  "maps.google.",
  "google.com/maps",
  "goo.gl",
  "maps.app.goo.gl",
];

export function isDirectoryOrDeliveryWebsite(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    const hostPath = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
    return DIRECTORY_WEBSITE_HOSTS.some((fragment) => hostPath.includes(fragment));
  } catch {
    return true;
  }
}

export function officialWebsiteOrUndefined(url: string | undefined): string | undefined {
  if (!url?.trim() || !/^https?:\/\//i.test(url.trim())) return undefined;
  if (isDirectoryOrDeliveryWebsite(url)) return undefined;
  return url.trim();
}

export type GooglePlaceMatch = {
  placeId: string;
  name: string;
  address: string;
  city: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  website?: string;
  mapsUrl?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
};

/** Places-grounded venue used by admin discover and suggestions. */
export type GroundedPlace = GooglePlaceMatch & {
  /** Alias or query that found this place. */
  matchedQuery?: string;
  source: "google" | "osm" | "tripadvisor";
  /** Tripadvisor Restaurant_Review profile when found via Apify. */
  tripadvisorUrl?: string;
};

export const NL_DISCOVER_CITIES = [
  "Amsterdam",
  "Rotterdam",
  "Den Haag",
  "Utrecht",
  "Leiden",
  "Eindhoven",
  "Groningen",
  "Maastricht",
] as const;

type PlacesSearchHit = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  websiteUri?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
};

async function searchGooglePlaces(
  apiKey: string,
  textQuery: string,
  options?: { maxResultCount?: number; includedType?: string },
): Promise<PlacesSearchHit[]> {
  const body: Record<string, unknown> = {
    textQuery,
    languageCode: "en",
    regionCode: "NL",
    maxResultCount: options?.maxResultCount ?? 5,
  };
  if (options?.includedType) {
    body.includedType = options.includedType;
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.nationalPhoneNumber",
        "places.rating",
        "places.userRatingCount",
      ].join(","),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google search ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as { places?: PlacesSearchHit[] };
  return data.places ?? [];
}

function pickNetherlandsMatch(
  places: PlacesSearchHit[],
  name: string,
): PlacesSearchHit | null {
  const candidates = places.filter(
    (candidate) =>
      candidate.id &&
      candidate.displayName?.text &&
      candidate.formattedAddress &&
      isInNetherlands(candidate.formattedAddress),
  );

  return (
    candidates.find((candidate) =>
      namesLikelyMatch(name, candidate.displayName?.text ?? ""),
    ) ?? null
  );
}

function toMatch(match: PlacesSearchHit, fallbackCity: string): GooglePlaceMatch {
  const formattedAddress = match.formattedAddress!;
  const postcodeMatch = formattedAddress.match(/\b(\d{4}\s*[A-Z]{2})\b/i);
  const city = extractCity(formattedAddress) ?? (fallbackCity.trim() || "Netherlands");

  return {
    placeId: match.id!,
    name: match.displayName!.text!,
    address: formattedAddress.split(",")[0]?.trim() || formattedAddress,
    city,
    postcode: postcodeMatch?.[1]?.replace(/\s+/g, " ").toUpperCase(),
    lat: match.location?.latitude,
    lng: match.location?.longitude,
    website: officialWebsiteOrUndefined(match.websiteUri),
    mapsUrl: match.googleMapsUri,
    phone: match.nationalPhoneNumber,
    rating: match.rating,
    reviewCount: match.userRatingCount,
  };
}

function hitToGrounded(hit: PlacesSearchHit, matchedQuery: string): GroundedPlace | null {
  if (
    !hit.id ||
    !hit.displayName?.text ||
    !hit.formattedAddress ||
    !isInNetherlands(hit.formattedAddress)
  ) {
    return null;
  }
  const base = toMatch(hit, extractCity(hit.formattedAddress) ?? "Netherlands");
  return {
    ...base,
    matchedQuery,
    source: "google",
  };
}

export async function lookupGoogleRestaurant(place: {
  name: string;
  city: string;
  address?: string | null;
}): Promise<GooglePlaceMatch | null> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return null;

  const city = place.city.trim();
  const address = place.address?.trim() || "";

  // Prefer name + city first — LLM-suggested street addresses are often wrong
  // and poison Text Search when included.
  const queries = [
    [place.name, "restaurant", city, "Netherlands"].filter(Boolean).join(" "),
    address
      ? [place.name, "restaurant", address, city, "Netherlands"].filter(Boolean).join(" ")
      : null,
  ].filter((query, index, all): query is string => {
    if (!query) return false;
    return all.indexOf(query) === index;
  });

  for (const textQuery of queries) {
    const places = await searchGooglePlaces(apiKey, textQuery);
    const match = pickNetherlandsMatch(places, place.name);
    if (match) return toMatch(match, city);
  }

  return null;
}

/**
 * Free-text search for a restaurant suggestion query.
 * Retries with a city bias when the query mentions a known NL city.
 */
export async function searchGoogleRestaurantsByQuery(
  query: string,
): Promise<GroundedPlace[]> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  const cityHint = NL_DISCOVER_CITIES.find((city) =>
    new RegExp(`\\b${city.replace(/\s+/g, "\\s+")}\\b`, "i").test(trimmed),
  );

  const queries = [
    `${trimmed} restaurant Netherlands`,
    cityHint ? `${trimmed} restaurant ${cityHint} Netherlands` : null,
    `${trimmed} restaurant in Netherlands`,
  ].filter((value, index, all): value is string => {
    if (!value) return false;
    return all.indexOf(value) === index;
  });

  const byId = new Map<string, GroundedPlace>();
  for (const textQuery of queries) {
    try {
      const hits = await searchGooglePlaces(apiKey, textQuery, {
        maxResultCount: 8,
        includedType: "restaurant",
      });
      for (const hit of hits) {
        const grounded = hitToGrounded(hit, textQuery);
        if (!grounded) continue;
        if (!byId.has(grounded.placeId)) {
          byId.set(grounded.placeId, grounded);
        }
      }
      if (byId.size > 0) break;
    } catch (error) {
      console.warn(`Places query search failed for "${textQuery}"`, error);
    }
  }

  const results = [...byId.values()];
  results.sort((a, b) => {
    const aMatch = namesLikelyMatch(trimmed, a.name) ? 1 : 0;
    const bMatch = namesLikelyMatch(trimmed, b.name) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  });
  return results;
}

/**
 * Cuisine discovery: Text Search for each alias × city across the Netherlands.
 */
export async function searchGoogleRestaurantsByCuisine(input: {
  aliases: string[];
  cities?: string[];
  focus?: string;
  maxPerQuery?: number;
}): Promise<GroundedPlace[]> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return [];

  const aliases = input.aliases
    .map((alias) => alias.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (aliases.length === 0) return [];

  const cities = (input.cities?.length ? input.cities : [...NL_DISCOVER_CITIES])
    .map((city) => city.trim())
    .filter(Boolean);
  const focus = input.focus?.trim();
  const maxPerQuery = input.maxPerQuery ?? 8;
  const byId = new Map<string, GroundedPlace>();

  for (const city of cities) {
    const batch = await Promise.all(
      aliases.map(async (alias) => {
        const textQuery = focus
          ? `${alias} restaurant ${focus} in ${city}, Netherlands`
          : `${alias} restaurant in ${city}, Netherlands`;
        try {
          const hits = await searchGooglePlaces(apiKey, textQuery, {
            maxResultCount: maxPerQuery,
            includedType: "restaurant",
          });
          return hits
            .map((hit) => hitToGrounded(hit, textQuery))
            .filter((place): place is GroundedPlace => Boolean(place));
        } catch (error) {
          console.warn(`Places cuisine search failed for "${textQuery}"`, error);
          return [] as GroundedPlace[];
        }
      }),
    );
    for (const place of batch.flat()) {
      const existing = byId.get(place.placeId);
      if (!existing) {
        byId.set(place.placeId, place);
        continue;
      }
      if ((place.reviewCount ?? 0) > (existing.reviewCount ?? 0)) {
        byId.set(place.placeId, place);
      }
    }
  }

  return [...byId.values()].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
}
