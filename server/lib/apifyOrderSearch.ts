import {
  thuisbezorgdCuisineSlug,
  uberCuisineSlug,
} from "../../src/restaurants/deliveryLinks.ts";
import {
  envActor,
  getApifyToken,
  isApifyConfigured,
  runActorDatasetItems,
} from "./apifyClient.ts";

export { getApifyToken, isApifyConfigured };

const DEFAULT_TB_ACTOR = "jarvismoney/thuisbezorgd-takeaway-scraper";
const DEFAULT_UE_ACTOR = "borderline/uber-eats-scraper-ppr";

/** Representative NL delivery hubs (postcode is enough for TB). */
const NL_SEARCH_HUBS: { city: string; address: string; aliases: string[] }[] = [
  {
    city: "Leiden",
    address: "2312AB Leiden",
    aliases: ["leiden"],
  },
  {
    city: "Amsterdam",
    address: "1012AB Amsterdam",
    aliases: ["amsterdam", "ams"],
  },
  {
    city: "Rotterdam",
    address: "3011AB Rotterdam",
    aliases: ["rotterdam", "rtm"],
  },
  {
    city: "Utrecht",
    address: "3511AB Utrecht",
    aliases: ["utrecht"],
  },
  {
    city: "Den Haag",
    address: "2511AB Den Haag",
    aliases: ["den haag", "the hague", "hague", "'s-gravenhage", "gravenhage"],
  },
  {
    city: "Eindhoven",
    address: "5611AB Eindhoven",
    aliases: ["eindhoven"],
  },
];

const DEFAULT_HUB = NL_SEARCH_HUBS[0]!;

export type GroundedOrderListing = {
  platform: "thuisbezorgd" | "ubereats";
  name: string;
  url: string;
  city?: string;
  rating?: number;
  ratingCount?: number;
  cuisines?: string[];
  /** Popular / featured dish when the actor returned one. */
  signatureDishHint?: string;
  notes?: string;
};

export function cuisineSearchTerms(
  countryCode: string,
  countryName: string,
): string[] {
  const code = countryCode.toLowerCase();
  const terms = new Set<string>();
  const add = (value: string | undefined) => {
    const trimmed = value?.trim();
    if (trimmed) terms.add(trimmed);
  };
  add(countryName);
  add(uberCuisineSlug(code));
  add(thuisbezorgdCuisineSlug(code));
  // Common English cuisine label for TB filters.
  const english = uberCuisineSlug(code);
  if (english) add(english);
  return [...terms];
}

function hubsMatchingText(raw: string): {
  hubs: { city: string; address: string }[];
  remainder: string;
} {
  const lower = raw.toLowerCase();
  const postcodeMatch = raw.match(/\b(\d{4}\s*[A-Za-z]{2})\b/);
  if (postcodeMatch) {
    const postcode = postcodeMatch[1]!.replace(/\s+/g, "").toUpperCase();
    const rest = raw.replace(postcodeMatch[0], "").trim();
    return {
      hubs: [{ city: rest || postcode, address: `${postcode} Netherlands` }],
      remainder: rest,
    };
  }

  const matched = NL_SEARCH_HUBS.filter((hub) =>
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

  if (matched.length > 0) {
    return {
      hubs: matched.map((hub) => ({ city: hub.city, address: hub.address })),
      remainder,
    };
  }

  const city = raw.trim();
  if (city) {
    return {
      hubs: [{ city, address: `${city} Netherlands` }],
      remainder: "",
    };
  }

  return {
    hubs: [{ city: DEFAULT_HUB.city, address: DEFAULT_HUB.address }],
    remainder: "",
  };
}

export function resolveSearchHubs(
  query?: string,
  city?: string,
): {
  hubs: { city: string; address: string }[];
  focusTerms: string[];
} {
  const cityRaw = city?.trim() ?? "";
  const queryRaw = query?.trim() ?? "";

  if (cityRaw) {
    const fromCity = hubsMatchingText(cityRaw);
    return {
      hubs: fromCity.hubs,
      focusTerms: queryRaw ? [queryRaw] : [],
    };
  }

  if (!queryRaw) {
    return {
      hubs: [{ city: DEFAULT_HUB.city, address: DEFAULT_HUB.address }],
      focusTerms: [],
    };
  }

  const lower = queryRaw.toLowerCase();
  const hasPostcode = /\b\d{4}\s*[A-Za-z]{2}\b/.test(queryRaw);
  const matchedKnown = NL_SEARCH_HUBS.filter((hub) =>
    hub.aliases.some(
      (alias) =>
        lower === alias ||
        lower.includes(alias) ||
        new RegExp(
          `\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i",
        ).test(queryRaw),
    ),
  );

  if (hasPostcode || matchedKnown.length > 0) {
    const fromQuery = hubsMatchingText(queryRaw);
    return {
      hubs: fromQuery.hubs,
      focusTerms: fromQuery.remainder ? [fromQuery.remainder] : [],
    };
  }

  // Cuisine / focus only — search near Leiden unless a city was supplied.
  return {
    hubs: [{ city: DEFAULT_HUB.city, address: DEFAULT_HUB.address }],
    focusTerms: [queryRaw],
  };
}

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
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return out.length > 0 ? out : undefined;
}

function absoluteHttpUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url.startsWith("//") ? `https:${url}` : url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function normalizeThuisbezorgdUrl(url: string): string | undefined {
  const absolute = absoluteHttpUrl(url);
  if (!absolute) return undefined;
  try {
    const parsed = new URL(absolute);
    if (!/(^|\.)thuisbezorgd\.nl$/i.test(parsed.hostname)) return undefined;
    // Prefer /menu/ paths; keep as-is when already a menu or bestel page.
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function normalizeUberEatsUrl(url: string): string | undefined {
  const absolute = absoluteHttpUrl(url);
  if (!absolute) return undefined;
  try {
    const parsed = new URL(absolute);
    if (!/(^|\.)ubereats\.com$/i.test(parsed.hostname)) return undefined;
    // Force www + keep path (actors sometimes omit www / use other locales).
    parsed.hostname = "www.ubereats.com";
    // Prefer NL storefront when the path is locale-relative store.
    if (/^\/store\//i.test(parsed.pathname)) {
      parsed.pathname = `/nl${parsed.pathname}`;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function mapThuisbezorgdItem(
  item: unknown,
): GroundedOrderListing | null {
  const row = asRecord(item);
  if (!row) return null;
  const name = asString(row.name);
  const url = normalizeThuisbezorgdUrl(asString(row.url));
  if (!name || !url) return null;
  const rating = asNumber(row.rating);
  const ratingCount = asNumber(row.ratingCount);
  const city = asString(row.city);
  const cuisines = asStringArray(row.cuisines);
  const fee = asNumber(row.deliveryFee);
  const minOrder = asNumber(row.minimumOrder);
  const eta = asString(row.deliveryEtaMinutes);
  const bits = [
    rating != null
      ? `${rating.toFixed(1)}★${ratingCount != null ? ` (${ratingCount})` : ""}`
      : null,
    fee != null ? `delivery €${fee.toFixed(2)}` : null,
    minOrder != null ? `min €${minOrder.toFixed(2)}` : null,
    eta ? `ETA ${eta}` : null,
    cuisines?.slice(0, 3).join(", ") || null,
  ].filter(Boolean);
  return {
    platform: "thuisbezorgd",
    name,
    url,
    city,
    rating,
    ratingCount,
    cuisines,
    notes: bits.length > 0 ? bits.join(" · ") : undefined,
  };
}

export function mapUberEatsItem(item: unknown): GroundedOrderListing | null {
  const row = asRecord(item);
  if (!row) return null;
  const name =
    asString(row.title) ||
    asString(row.sanitizedTitle) ||
    asString(row.name);
  const url = normalizeUberEatsUrl(asString(row.url));
  if (!name || !url) return null;

  const location = asRecord(row.location);
  const city =
    asString(location?.city) ||
    asString(row.city) ||
    undefined;
  const cuisines =
    asStringArray(row.cuisineList) ||
    asStringArray(row.categories) ||
    undefined;
  const ratingObj = asRecord(row.rating);
  const rating =
    asNumber(ratingObj?.ratingValue) || asNumber(row.ratingValue);
  const reviewRaw =
    asString(ratingObj?.reviewCount) || asString(row.reviewCount);
  const ratingCount = reviewRaw
    ? asNumber(reviewRaw.replace(/[^0-9.]/g, ""))
    : undefined;

  const featured = asRecord(row.featuredItems);
  const signatureDishHint =
    asString(featured?.title) ||
    asString(asRecord(row.featuredItem)?.title);

  const bits = [
    rating != null
      ? `${rating.toFixed(1)}★${
          reviewRaw ? ` (${reviewRaw})` : ratingCount != null ? ` (${ratingCount})` : ""
        }`
      : null,
    asString(row.etaRange),
    asString(row.fareBadge),
    cuisines?.slice(0, 3).join(", ") || null,
  ].filter(Boolean);

  return {
    platform: "ubereats",
    name,
    url,
    city,
    rating,
    ratingCount,
    cuisines,
    signatureDishHint,
    notes: bits.length > 0 ? bits.join(" · ") : undefined,
  };
}

function listingKey(listing: GroundedOrderListing): string {
  return `${listing.platform}:${listing.url.toLowerCase()}`;
}

function nameKey(listing: GroundedOrderListing): string {
  return `${listing.platform}:${listing.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

function matchesCuisineFocus(
  listing: GroundedOrderListing,
  terms: string[],
): boolean {
  if (terms.length === 0) return true;
  const hay = [
    listing.name,
    ...(listing.cuisines ?? []),
    listing.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return terms.some((term) => {
    const needle = term.toLowerCase();
    return needle.length >= 3 && hay.includes(needle);
  });
}

async function searchThuisbezorgd(input: {
  addresses: string[];
  cuisineTerms: string[];
  maxRestaurants: number;
}): Promise<GroundedOrderListing[]> {
  const actor = envActor("APIFY_THUISBEZORGD_ACTOR", DEFAULT_TB_ACTOR);
  const items = await runActorDatasetItems({
    actor,
    body: {
      addresses: input.addresses,
      country: "nl",
      serviceType: "delivery",
      openNowOnly: false,
      cuisines: input.cuisineTerms.slice(0, 6),
      maxRestaurants: input.maxRestaurants,
      newRestaurantsOnly: false,
      language: "en",
    },
  });
  return items
    .map(mapThuisbezorgdItem)
    .filter((item): item is GroundedOrderListing => item != null);
}

async function searchUberEats(input: {
  address: string;
  query: string;
  maxRows: number;
}): Promise<GroundedOrderListing[]> {
  const actor = envActor("APIFY_UBEREATS_ACTOR", DEFAULT_UE_ACTOR);
  const items = await runActorDatasetItems({
    actor,
    body: {
      locale: "nl-NL",
      address: input.address,
      addressCountry: "NL",
      query: input.query,
      storeType: "RESTAURANTS",
      maxRows: input.maxRows,
      getMenuCustomizations: false,
    },
  });
  return items
    .map(mapUberEatsItem)
    .filter((item): item is GroundedOrderListing => item != null);
}

/**
 * Search Thuisbezorgd + Uber Eats for real restaurants delivering in NL.
 * Returns grounded listings with platform menu/store URLs (no LLM invention).
 */
export async function searchDeliveryOrderOptions(input: {
  countryCode: string;
  countryName: string;
  query?: string;
  city?: string;
  maxPerPlatform?: number;
}): Promise<{ listings: GroundedOrderListing[]; notes: string }> {
  if (!isApifyConfigured()) {
    throw new Error(
      "APIFY_TOKEN is not configured. Add it to .env to discover order options from Thuisbezorgd / Uber Eats.",
    );
  }

  const maxPerPlatform = Math.min(
    Math.max(input.maxPerPlatform ?? 10, 3),
    20,
  );
  const { hubs, focusTerms } = resolveSearchHubs(input.query, input.city);
  const cuisineTerms = cuisineSearchTerms(input.countryCode, input.countryName);
  const searchQuery = [...focusTerms, ...cuisineTerms]
    .filter(Boolean)
    .slice(0, 4)
    .join(" ")
    .trim() || input.countryName;

  const addresses = hubs.map((hub) => hub.address);
  // Uber Eats actor is address+query once; use the first hub (or only matched city).
  const uberAddress = hubs[0]!.address;

  const settled = await Promise.allSettled([
    searchThuisbezorgd({
      addresses,
      cuisineTerms: [...cuisineTerms, ...focusTerms],
      maxRestaurants: maxPerPlatform * Math.min(hubs.length, 3),
    }),
    searchUberEats({
      address: uberAddress,
      query: searchQuery,
      maxRows: maxPerPlatform,
    }),
  ]);

  const errors: string[] = [];
  const listings: GroundedOrderListing[] = [];
  const seenUrl = new Set<string>();
  const seenName = new Set<string>();

  const pushUnique = (batch: GroundedOrderListing[]) => {
    for (const listing of batch) {
      const urlKey = listingKey(listing);
      const nKey = nameKey(listing);
      if (seenUrl.has(urlKey) || seenName.has(nKey)) continue;
      seenUrl.add(urlKey);
      seenName.add(nKey);
      listings.push(listing);
    }
  };

  if (settled[0].status === "fulfilled") {
    let tb = settled[0].value;
    // Soft filter when actor cuisine filter is loose.
    const filtered = tb.filter((item) =>
      matchesCuisineFocus(item, [...cuisineTerms, ...focusTerms]),
    );
    if (filtered.length >= 3) tb = filtered;
    pushUnique(tb.slice(0, maxPerPlatform));
  } else {
    console.error("Thuisbezorgd Apify search failed", settled[0].reason);
    errors.push(
      settled[0].reason instanceof Error
        ? settled[0].reason.message
        : "Thuisbezorgd search failed",
    );
  }

  if (settled[1].status === "fulfilled") {
    pushUnique(settled[1].value.slice(0, maxPerPlatform));
  } else {
    console.error("Uber Eats Apify search failed", settled[1].reason);
    errors.push(
      settled[1].reason instanceof Error
        ? settled[1].reason.message
        : "Uber Eats search failed",
    );
  }

  if (listings.length === 0) {
    throw new Error(
      errors[0] ??
        `No delivery restaurants found for ${input.countryName}. Try a different city.`,
    );
  }

  const hubLabel = hubs.map((hub) => hub.city).join(", ");
  const notes = [
    `Grounded via Apify: ${listings.filter((l) => l.platform === "thuisbezorgd").length} Thuisbezorgd + ${listings.filter((l) => l.platform === "ubereats").length} Uber Eats near ${hubLabel}.`,
    `Query: ${searchQuery}.`,
    errors.length > 0 ? `Partial failures: ${errors.join(" | ")}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  // Prefer higher ratings first.
  listings.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return { listings, notes };
}
