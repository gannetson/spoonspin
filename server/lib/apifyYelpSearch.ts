/**
 * Yelp restaurant search via Apify (yin/yelp-scraper by default).
 * Mirrors the Tripadvisor lead search: cuisine + NL city inputs, normalized
 * yelp.com biz URLs, NL-only listings.
 */

import {
  extractCity,
  isInNetherlands,
  NL_DISCOVER_CITIES,
  officialWebsiteOrUndefined,
  type GroundedPlace,
} from "./googlePlacesLookup.ts";
import { envActor, isApifyConfigured, runActorDatasetItems } from "./apifyClient.ts";

const DEFAULT_YELP_ACTOR = "yin/yelp-scraper";

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

/** Yelp categories arrive as [{alias,title}], ["Thai"], or "Thai, Asian". */
function asCategoryNames(value: unknown): string[] | undefined {
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
      return asString(row?.title) ?? asString(row?.name) ?? asString(row?.alias) ?? "";
    })
    .filter(Boolean);
  return out.length > 0 ? out : undefined;
}

function absoluteHttpUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const cleaned = url.replace(/^<|>$/g, "").trim();
    const parsed = new URL(cleaned.startsWith("//") ? `https:${cleaned}` : cleaned);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/** Force canonical https://www.yelp.com/biz/<slug> URLs, dropping tracking params. */
export function normalizeYelpBizUrl(url: string | undefined): string | undefined {
  const absolute = absoluteHttpUrl(url);
  if (!absolute) return undefined;
  try {
    const parsed = new URL(absolute);
    if (!/(^|\.)yelp\./i.test(parsed.hostname)) return undefined;
    const match = /\/biz\/([^/?#]+)/i.exec(parsed.pathname);
    if (!match?.[1]) return undefined;
    return `https://www.yelp.com/biz/${match[1].toLowerCase()}`;
  } catch {
    return undefined;
  }
}

export function resolveYelpCities(query?: string): {
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
        new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
          raw,
        ),
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
    return { cities: matched.map((hub) => hub.city), focusTerms };
  }

  return {
    cities: [...NL_DISCOVER_CITIES].slice(0, 2),
    focusTerms: raw ? [raw] : [],
  };
}

/**
 * Yelp mixes shops and services into cuisine searches, and its food categories
 * are cuisine names ("Thai", "Italian") rather than the word "restaurant".
 * So reject on clearly non-food categories instead of requiring a food word.
 */
const NON_FOOD_CATEGORY = new RegExp(
  [
    "massage", "spa", "salon", "nail", "hair", "barber", "tattoo",
    "hotel", "hostel", "apartment", "real estate",
    "gym", "fitness", "yoga",
    "laundry", "dry clean", "repair", "automotive", "car wash",
    "dentist", "doctor", "clinic", "pharmacy", "hospital",
    "lawyer", "accountant", "insurance", "bank",
    "supermarket", "grocer", "convenience store",
  ].join("|"),
  "i",
);

const FOOD_CATEGORY = /restaurant|food|cuisine|bistro|eater|cafe|caf\u00e9|bakery|bar|pizzeria|steakhouse|sushi|noodle|grill|takeaway|delivery/i;

function looksRestaurant(row: Record<string, unknown>): boolean {
  const categories = asCategoryNames(row.categories) ?? [];
  const categoryText = categories.join(" ");
  if (categoryText && NON_FOOD_CATEGORY.test(categoryText)) return false;

  const type = asString(row.type)?.toLowerCase();
  if (type && NON_FOOD_CATEGORY.test(type)) return false;
  if (type && FOOD_CATEGORY.test(type)) return true;
  if (categoryText && FOOD_CATEGORY.test(categoryText)) return true;

  // Cuisine-named categories ("Thai") and category-less rows are still usable
  // when the row otherwise looks like a venue profile.
  const bizUrl = normalizeYelpBizUrl(
    asString(row.url) || asString(row.yelpUrl) || asString(row.directUrl),
  );
  return Boolean(bizUrl && asString(row.name));
}

function buildAddress(row: Record<string, unknown>): string | undefined {
  const direct =
    asString(row.address) || asString(row.fullAddress) || asString(row.displayAddress);
  if (direct) return direct;

  const location = asRecord(row.location) || asRecord(row.addressInfo);
  if (location) {
    const displayed = location.displayAddress ?? location.display_address;
    if (Array.isArray(displayed)) {
      const joined = displayed
        .map((part) => (typeof part === "string" ? part.trim() : ""))
        .filter(Boolean)
        .join(", ");
      if (joined) return joined;
    }
    const parts = [
      asString(location.address1) || asString(location.street),
      asString(location.zipCode) || asString(location.zip_code) || asString(location.postalCode),
      asString(location.city),
      asString(location.country),
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }

  const street = asString(row.street) || asString(row.streetAddress);
  const city = asString(row.city);
  const postal = asString(row.postalCode) || asString(row.zipCode) || asString(row.zip);
  const composed = [street, postal, city].filter(Boolean).join(", ");
  return composed || undefined;
}

function isNetherlandsListing(row: Record<string, unknown>): boolean {
  const location = asRecord(row.location) || asRecord(row.addressInfo);
  const country =
    asString(location?.country) ||
    asString(location?.countryCode) ||
    asString(row.country) ||
    asString(row.countryCode);
  if (country) {
    return /^nl$|nederland|netherlands/i.test(country.trim());
  }
  const address = buildAddress(row) ?? "";
  if (isInNetherlands(address)) return true;
  const city = (asString(location?.city) || asString(row.city) || "").trim().toLowerCase();
  return NL_CITY_ALIASES.some(
    (hub) => hub.city.toLowerCase() === city || hub.aliases.includes(city),
  );
}

export function mapYelpRestaurantItem(
  item: unknown,
  matchedQuery?: string,
): GroundedPlace | null {
  const row = asRecord(item);
  if (!row || !looksRestaurant(row)) return null;
  if (!isNetherlandsListing(row)) return null;

  const name = asString(row.name) || asString(row.title) || asString(row.businessName);
  const address = buildAddress(row);
  if (!name || !address) return null;

  const location = asRecord(row.location) || asRecord(row.addressInfo);
  const city =
    asString(location?.city) ||
    asString(row.city) ||
    extractCity(address) ||
    undefined;
  if (!city) return null;

  const bizUrl = normalizeYelpBizUrl(
    asString(row.url) ||
      asString(row.yelpUrl) ||
      asString(row.directUrl) ||
      asString(row.bizUrl) ||
      asString(row.link),
  );
  const website = officialWebsiteOrUndefined(
    asString(row.website) || asString(row.websiteUrl) || asString(row.businessWebsite),
  );
  const postcode = (
    asString(location?.zipCode) ||
    asString(location?.zip_code) ||
    asString(location?.postalCode) ||
    asString(row.postalCode) ||
    asString(row.zipCode)
  )?.replace(/\s+/g, " ");

  const coordinates = asRecord(row.coordinates) || asRecord(row.coordinate);
  const lat = asNumber(row.latitude) || asNumber(coordinates?.latitude) || asNumber(coordinates?.lat);
  const lng =
    asNumber(row.longitude) || asNumber(coordinates?.longitude) || asNumber(coordinates?.lng);
  const rating = asNumber(row.rating) || asNumber(row.stars) || asNumber(row.aggregatedRating);
  const reviewCount =
    asNumber(row.reviewCount) || asNumber(row.review_count) || asNumber(row.numberOfReviews);

  const idHint = asString(row.id) || asString(row.bizId) || asString(row.alias);
  const placeId = idHint
    ? `yelp:${idHint}`
    : bizUrl
      ? `yelp:${bizUrl}`
      : `yelp:${name.toLowerCase()}|${city.toLowerCase()}`;

  const categories = asCategoryNames(row.categories);
  const priceLevel = asString(row.price) || asString(row.priceRange) || asString(row.priceLevel);
  const cuisineHint = [
    ...(categories?.slice(0, 4) ?? []),
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
    yelpUrl: bizUrl,
    phone: asString(row.phone) || asString(row.phoneNumber) || asString(row.displayPhone),
    rating,
    reviewCount,
    matchedQuery: [matchedQuery, cuisineHint].filter(Boolean).join(" · ") || undefined,
    source: "yelp",
  };
}

async function runYelpQuery(input: {
  cuisine: string;
  location: string;
  maxResults: number;
}): Promise<GroundedPlace[]> {
  const actor = envActor("APIFY_YELP_ACTOR", DEFAULT_YELP_ACTOR);
  const matchedQuery = `${input.cuisine} · ${input.location}`;
  const items = await runActorDatasetItems({
    actor,
    body: {
      searchTerms: [input.cuisine],
      locations: [input.location],
      maxItems: input.maxResults,
    },
    timeoutSecs: 240,
  });

  return items
    .map((item) => mapYelpRestaurantItem(item, matchedQuery))
    .filter((place): place is GroundedPlace => place != null);
}

/**
 * Search Yelp for NL restaurants by cuisine + city.
 * Yelp's NL coverage is thin (it withdrew from the market), so a zero-hit run
 * is normal and is reported in the notes rather than treated as an error.
 */
export async function searchYelpRestaurants(input: {
  countryName: string;
  query?: string;
  cuisineAliases?: string[];
  maxPerCity?: number;
  onProgress?: (message: string) => void;
}): Promise<{ places: GroundedPlace[]; notes: string }> {
  if (!isApifyConfigured()) {
    return { places: [], notes: "Yelp skipped (APIFY_TOKEN not configured)." };
  }

  const maxPerCity = Math.min(Math.max(input.maxPerCity ?? 10, 3), 20);
  const { cities, focusTerms } = resolveYelpCities(input.query);
  const cuisine =
    focusTerms[0]?.trim() ||
    input.cuisineAliases?.[0]?.trim() ||
    input.countryName.trim();

  // Cap cities to control Apify cost/latency.
  const searchCities = cities.slice(0, 2);
  input.onProgress?.(`Yelp · ${searchCities.join(", ")} (Apify, often a minute+)`);

  const settled = await Promise.allSettled(
    searchCities.map(async (city) => {
      const places = await runYelpQuery({
        cuisine,
        location: `${city}, Netherlands`,
        maxResults: maxPerCity,
      });
      input.onProgress?.(`Yelp · ${city}: ${places.length} hit(s)`);
      return places;
    }),
  );

  const places: GroundedPlace[] = [];
  const seen = new Set<string>();
  const errors: string[] = [];

  for (const result of settled) {
    if (result.status === "rejected") {
      console.error("Yelp Apify search failed", result.reason);
      errors.push(
        result.reason instanceof Error ? result.reason.message : "Yelp search failed",
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
    `Yelp: ${places.length} restaurant(s) for “${cuisine}” near ${searchCities.join(", ")}.`,
    places.length === 0 && errors.length === 0
      ? "Yelp NL coverage is limited; zero hits is expected for most cuisines."
      : null,
    errors.length > 0 ? `Partial failures: ${errors.join(" | ")}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return { places, notes };
}
