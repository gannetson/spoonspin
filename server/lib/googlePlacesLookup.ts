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
  /** Google's own cuisine/category vocabulary, e.g. ["turkish_restaurant", "restaurant"]. */
  placeTypes?: string[];
  primaryType?: string;
  /** Localized label for `primaryType`, e.g. "Turkish restaurant". */
  primaryTypeLabel?: string;
  /** Google's editorial one-liner about the venue, when it has one. */
  editorialSummary?: string;
};

/** Places-grounded venue used by admin discover and suggestions. */
export type GroundedPlace = GooglePlaceMatch & {
  /** Alias or query that found this place. */
  matchedQuery?: string;
  /** 0-based position in the result list of `matchedQuery`. */
  rank?: number;
  /** Cuisine labels the source itself assigned (Tripadvisor cuisines, OSM cuisine=*). */
  sourceCuisineTags?: string[];
  source: "google" | "osm" | "tripadvisor" | "zenchef" | "thefork";
  /** Tripadvisor Restaurant_Review profile when found via Apify. */
  tripadvisorUrl?: string;
  /** Zenchef booking widget when found via the partner restaurant list. */
  zenchefUrl?: string;
  /** Canonical thefork.nl restaurant URL when a profile id is known. */
  theForkUrl?: string;
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
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  editorialSummary?: { text?: string };
};

async function searchGooglePlaces(
  apiKey: string,
  textQuery: string,
  options?: {
    maxResultCount?: number;
    includedType?: string;
    locationBias?: {
      low: { latitude: number; longitude: number };
      high: { latitude: number; longitude: number };
    };
  },
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
  if (options?.locationBias) {
    body.locationBias = { rectangle: options.locationBias };
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
        "places.types",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.editorialSummary",
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
    placeTypes: match.types?.filter(Boolean),
    primaryType: match.primaryType,
    primaryTypeLabel: match.primaryTypeDisplayName?.text,
    editorialSummary: match.editorialSummary?.text,
  };
}

function hitToGrounded(
  hit: PlacesSearchHit,
  matchedQuery: string,
  rank?: number,
): GroundedPlace | null {
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
    rank,
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
  onProgress?: (message: string) => void;
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

  for (const [index, city] of cities.entries()) {
    input.onProgress?.(`Google Places · ${city} (${index + 1}/${cities.length})`);
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

/** Netherlands mainland + islands, used to bias Text Search away from BE/DE. */
const NL_RECTANGLE = {
  low: { latitude: 50.75, longitude: 3.2 },
  high: { latitude: 53.6, longitude: 7.23 },
};

export type RankedQueryResult = {
  query: string;
  places: GroundedPlace[];
  /** Hits Google returned before the Netherlands filter, for diagnostics. */
  rawCount: number;
};

/**
 * Run one nationwide Text Search per query and keep each hit's rank.
 *
 * Nationwide beats the old per-city fan-out for two reasons. Google ranks a
 * country-wide query by how well the venue actually matches the cuisine, while
 * "<cuisine> in <city>" always backfills with that city's popular restaurants
 * whether or not any of them serve the cuisine — which is how the same venues
 * ended up under every country. And rank is itself evidence: the venues a
 * cuisine's queries agree on, near the top, are the real specialists.
 */
export async function searchGoogleRestaurantsRanked(input: {
  queries: string[];
  maxPerQuery?: number;
  onProgress?: (message: string) => void;
}): Promise<RankedQueryResult[]> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return [];

  const queries = input.queries.map((query) => query.trim()).filter(Boolean);
  if (queries.length === 0) return [];
  const maxPerQuery = input.maxPerQuery ?? 20;

  const settled = await Promise.all(
    queries.map(async (query): Promise<RankedQueryResult> => {
      try {
        const hits = await searchGooglePlaces(apiKey, query, {
          maxResultCount: maxPerQuery,
          includedType: "restaurant",
          locationBias: NL_RECTANGLE,
        });
        const places = hits
          .map((hit, index) => hitToGrounded(hit, query, index))
          .filter((place): place is GroundedPlace => Boolean(place));
        return { query, places, rawCount: hits.length };
      } catch (error) {
        console.warn(`Places nationwide search failed for "${query}"`, error);
        return { query, places: [], rawCount: 0 };
      }
    }),
  );

  for (const result of settled) {
    input.onProgress?.(
      `Google \u00b7 \u201c${result.query}\u201d: ${result.places.length} NL hit(s)` +
        (result.rawCount > result.places.length
          ? ` (${result.rawCount - result.places.length} outside NL)`
          : ""),
    );
  }

  return settled;
}
