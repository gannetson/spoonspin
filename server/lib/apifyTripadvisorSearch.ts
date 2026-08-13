/**
 * Tripadvisor restaurant search via Apify
 * (meticulous_snail/tripadvisor-restaurant-leads).
 * Uses cuisine + location inputs; normalizes profile URLs to English tripadvisor.com.
 */

import { isTripadvisorRestaurantUrl } from "../../src/restaurants/reviewLinks.ts";
import {
  extractCity,
  isInNetherlands,
  NL_DISCOVER_CITIES,
  officialWebsiteOrUndefined,
  type GroundedPlace,
} from "./googlePlacesLookup.ts";
import {
  envActor,
  isApifyConfigured,
  runActorDatasetItems,
} from "./apifyClient.ts";

const DEFAULT_TA_ACTOR = "meticulous_snail/tripadvisor-restaurant-leads";

const NL_CITY_ALIASES: { city: string; aliases: string[] }[] = [
  { city: "Amsterdam", aliases: ["amsterdam", "ams"] },
  { city: "Rotterdam", aliases: ["rotterdam", "rtm"] },
  { city: "Utrecht", aliases: ["utrecht"] },
  {
    city: "Den Haag",
    aliases: ["den haag", "the hague", "hague", "'s-gravenhage", "gravenhage"],
  },
  { city: "Leiden", aliases: ["leiden"] },
  { city: "Eindhoven", aliases: ["eindhoven"] },
  { city: "Groningen", aliases: ["groningen"] },
  { city: "Maastricht", aliases: ["maastricht"] },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (typeof value === "string") {
    const parts = value
      .split(/[,|/]/)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  }
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      const row = asRecord(item);
      return asString(row?.name) ?? asString(row?.localizedName) ?? "";
    })
    .filter(Boolean);
  return out.length > 0 ? out : undefined;
}

function absoluteHttpUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const cleaned = url.replace(/^<|>$/g, "").trim();
    const parsed = new URL(
      cleaned.startsWith("//") ? `https:${cleaned}` : cleaned,
    );
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/** Force English tripadvisor.com Restaurant_Review URLs when possible. */
export function normalizeTripadvisorRestaurantUrl(
  url: string | undefined,
): string | undefined {
  const absolute = absoluteHttpUrl(url);
  if (!absolute) return undefined;
  try {
    const parsed = new URL(absolute);
    if (!/(^|\.)tripadvisor\./i.test(parsed.hostname)) return undefined;
    parsed.hostname = "www.tripadvisor.com";
    parsed.search = "";
    parsed.hash = "";
    const href = parsed.toString();
    return isTripadvisorRestaurantUrl(href) ? href : undefined;
  } catch {
    return undefined;
  }
}

export function resolveTripadvisorCities(query?: string): {
  cities: string[];
  focusTerms: string[];
} {
  const raw = query?.trim() ?? "";
  const lower = raw.toLowerCase();
  const matched = NL_CITY_ALIASES.filter((hub) =>
    hub.aliases.some(
      (alias) =>
        lower === alias ||
        lower.includes(alias) ||
        new RegExp(
          `\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i",
        ).test(raw),
    ),
  );

  let remainder = raw;
  for (const hub of matched) {
    for (const alias of hub.aliases) {
      remainder = remainder.replace(new RegExp(alias, "ig"), " ");
    }
  }
  remainder = remainder.replace(/\s+/g, " ").trim();
  const focusTerms = remainder ? [remainder] : [];

  if (matched.length > 0) {
    return {
      cities: matched.map((hub) => hub.city),
      focusTerms,
    };
  }

  return {
    cities: [...NL_DISCOVER_CITIES].slice(0, 2),
    focusTerms: raw ? [raw] : [],
  };
}

function looksRestaurant(row: Record<string, unknown>): boolean {
  const type = asString(row.type)?.toUpperCase();
  const category = asString(row.category)?.toLowerCase();
  if (type === "RESTAURANT") return true;
  if (category === "restaurant") return true;
  // Lead scrapers are restaurant-only — accept rows with a name + address.
  if (asString(row.name) && (asString(row.address) || asString(row.street))) {
    return true;
  }
  const webUrl =
    asString(row.webUrl) ||
    asString(row.url) ||
    asString(row.tripadvisorUrl) ||
    asString(row.tripadvisor_url) ||
    asString(row.profileUrl);
  return Boolean(webUrl && /Restaurant_Review-/i.test(webUrl));
}

function isNetherlandsListing(row: Record<string, unknown>): boolean {
  const addressObj = asRecord(row.addressObj) || asRecord(row.address_obj);
  const country =
    asString(addressObj?.country) ||
    asString(row.country) ||
    asString(row.countryName);
  if (country) {
    return /nederland|netherlands|\bnl\b/i.test(country);
  }
  const locationString =
    asString(row.locationString) ||
    asString(row.location) ||
    asString(row.city) ||
    "";
  const address =
    asString(row.address) ||
    asString(row.fullAddress) ||
    asString(row.street) ||
    "";
  // Location was requested as "{city}, Netherlands" — keep NL postcode matches.
  if (isInNetherlands(`${address}, ${locationString}`)) return true;
  // Soft accept when the city is a known NL discover hub and no foreign country.
  const city = (asString(addressObj?.city) || asString(row.city) || "")
    .trim()
    .toLowerCase();
  return NL_CITY_ALIASES.some(
    (hub) =>
      hub.city.toLowerCase() === city ||
      hub.aliases.includes(city) ||
      locationString.toLowerCase().includes(hub.city.toLowerCase()),
  );
}

function buildAddress(row: Record<string, unknown>): string | undefined {
  const direct =
    asString(row.address) ||
    asString(row.fullAddress) ||
    asString(row.localAddress);
  if (direct) return direct;

  const addressObj = asRecord(row.addressObj) || asRecord(row.address_obj);
  if (addressObj) {
    const parts = [
      asString(addressObj.street1) || asString(addressObj.street),
      asString(addressObj.postalcode) || asString(addressObj.zip),
      asString(addressObj.city),
      asString(addressObj.country),
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }

  const street = asString(row.street) || asString(row.streetAddress);
  const city = asString(row.city);
  const postal =
    asString(row.postalCode) ||
    asString(row.postalcode) ||
    asString(row.zip);
  const composed = [street, postal, city].filter(Boolean).join(", ");
  return composed || undefined;
}

export function mapTripadvisorRestaurantItem(
  item: unknown,
  matchedQuery?: string,
): GroundedPlace | null {
  const row = asRecord(item);
  if (!row || !looksRestaurant(row)) return null;
  if (!isNetherlandsListing(row)) return null;

  const name =
    asString(row.name) ||
    asString(row.restaurantName) ||
    asString(row.title) ||
    asString(row.localName);
  const address = buildAddress(row);
  if (!name || !address) return null;

  const addressObj = asRecord(row.addressObj) || asRecord(row.address_obj);
  const city =
    asString(addressObj?.city) ||
    asString(row.city) ||
    extractCity(address) ||
    asString(row.locationString)?.split(",")[0]?.trim() ||
    asString(row.location)?.split(",")[0]?.trim();
  if (!city) return null;

  const webUrl = normalizeTripadvisorRestaurantUrl(
    asString(row.webUrl) ||
      asString(row.url) ||
      asString(row.tripadvisorUrl) ||
      asString(row.tripAdvisorUrl) ||
      asString(row.tripadvisor_url) ||
      asString(row.profileUrl) ||
      asString(row.link),
  );
  const website = officialWebsiteOrUndefined(
    asString(row.website) ||
      asString(row.websiteUrl) ||
      asString(row.officialWebsite),
  );
  const postcode = (
    asString(addressObj?.postalcode) ||
    asString(row.postalCode) ||
    asString(row.postalcode) ||
    asString(row.zip)
  )?.replace(/\s+/g, " ");
  const lat =
    asNumber(row.latitude) ||
    asNumber(row.lat) ||
    asNumber(asRecord(row.coordinates)?.lat);
  const lng =
    asNumber(row.longitude) ||
    asNumber(row.lng) ||
    asNumber(row.lon) ||
    asNumber(asRecord(row.coordinates)?.lng);
  const rating =
    asNumber(row.rating) ||
    asNumber(row.averageRating) ||
    asNumber(row.bubbleRating);
  const reviewCount =
    asNumber(row.numberOfReviews) ||
    asNumber(row.reviewCount) ||
    asNumber(row.reviewsCount) ||
    asNumber(row.numReviews) ||
    asNumber(row.rankingDenominator);
  const idHint =
    asString(row.id) ||
    asString(row.restaurantId) ||
    asString(row.locationId);
  const placeId = idHint
    ? `tripadvisor:${idHint}`
    : webUrl
      ? `tripadvisor:${webUrl}`
      : `tripadvisor:${name.toLowerCase()}|${city.toLowerCase()}`;

  const cuisines =
    asStringArray(row.cuisines) ||
    asStringArray(row.cuisine) ||
    asStringArray(row.cuisineTypes);
  const priceLevel =
    asString(row.priceLevel) ||
    asString(row.priceRange) ||
    asString(row.price);
  const cuisineHint = [
    ...(cuisines?.slice(0, 4) ?? []),
    priceLevel ? `price ${priceLevel}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    placeId,
    name,
    address,
    city,
    postcode,
    lat,
    lng,
    website,
    mapsUrl: undefined,
    tripadvisorUrl: webUrl,
    phone: asString(row.phone) || asString(row.phoneNumber),
    rating,
    reviewCount,
    matchedQuery:
      [matchedQuery, cuisineHint].filter(Boolean).join(" · ") || undefined,
    source: "tripadvisor",
  };
}

async function runTripadvisorLeadsQuery(input: {
  cuisine: string;
  location: string;
  maxResults: number;
}): Promise<GroundedPlace[]> {
  const actor = envActor("APIFY_TRIPADVISOR_ACTOR", DEFAULT_TA_ACTOR);
  const matchedQuery = `${input.cuisine} · ${input.location}`;
  const items = await runActorDatasetItems({
    actor,
    body: {
      cuisine: input.cuisine,
      location: input.location,
      maxResults: input.maxResults,
    },
    timeoutSecs: 240,
  });

  return items
    .map((item) => mapTripadvisorRestaurantItem(item, matchedQuery))
    .filter((place): place is GroundedPlace => place != null);
}

/**
 * Search Tripadvisor for restaurants in NL via cuisine + city leads actor.
 */
export async function searchTripadvisorRestaurants(input: {
  countryName: string;
  query?: string;
  cuisineAliases?: string[];
  maxPerCity?: number;
}): Promise<{ places: GroundedPlace[]; notes: string }> {
  if (!isApifyConfigured()) {
    return {
      places: [],
      notes: "Tripadvisor skipped (APIFY_TOKEN not configured).",
    };
  }

  const maxPerCity = Math.min(Math.max(input.maxPerCity ?? 10, 3), 20);
  const { cities, focusTerms } = resolveTripadvisorCities(input.query);
  const cuisine =
    focusTerms[0]?.trim() ||
    input.cuisineAliases?.[0]?.trim() ||
    input.countryName.trim();

  // Cap cities to control Apify cost/latency.
  const searchCities = cities.slice(0, 2);

  const settled = await Promise.allSettled(
    searchCities.map((city) =>
      runTripadvisorLeadsQuery({
        cuisine,
        // English location string so tripadvisor.com returns EN listings.
        location: `${city}, Netherlands`,
        maxResults: maxPerCity,
      }),
    ),
  );

  const places: GroundedPlace[] = [];
  const seen = new Set<string>();
  const errors: string[] = [];

  for (const result of settled) {
    if (result.status === "rejected") {
      console.error("Tripadvisor Apify search failed", result.reason);
      errors.push(
        result.reason instanceof Error
          ? result.reason.message
          : "Tripadvisor search failed",
      );
      continue;
    }
    for (const place of result.value) {
      const key = `${place.name.trim().toLowerCase()}|${place.city.trim().toLowerCase()}`;
      if (seen.has(key) || seen.has(place.placeId)) continue;
      seen.add(key);
      seen.add(place.placeId);
      places.push(place);
    }
  }

  const notes = [
    `Tripadvisor leads (en): ${places.length} restaurant(s) for “${cuisine}” near ${searchCities.join(", ")}.`,
    errors.length > 0 ? `Partial failures: ${errors.join(" | ")}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return { places, notes };
}
