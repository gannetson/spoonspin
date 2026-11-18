import {
  thuisbezorgdCuisineSlug,
  uberCuisineSlug,
} from "../../src/restaurants/deliveryLinks.ts";
import {
  anchorsInText,
  cityAnchorByName,
  normalizeCity,
  type HostCountry,
} from "../../src/restaurants/coverage.ts";
import {
  envActor,
  getApifyToken,
  isApifyConfigured,
  runActorDatasetItems,
} from "./apifyClient.ts";

export { getApifyToken, isApifyConfigured };

const DEFAULT_TB_ACTOR = "jarvismoney/thuisbezorgd-takeaway-scraper";
const DEFAULT_UE_ACTOR = "borderline/uber-eats-scraper-ppr";

/** A delivery hub: where we ask the platforms "who delivers here?". */
export type SearchHub = { city: string; address: string; country: HostCountry };

const DEFAULT_LIEFERANDO_ACTOR = "studio-amba/takeaway-scraper";

function hubFromAnchor(anchor: { name: string; address: string; country: HostCountry }): SearchHub {
  return { city: anchor.name, address: anchor.address, country: anchor.country };
}

const DEFAULT_HUB: SearchHub = hubFromAnchor(cityAnchorByName("Leiden")!);

export type GroundedOrderListing = {
  /**
   * "thuisbezorgd" is the Just Eat Takeaway family: Thuisbezorgd.nl in the
   * Netherlands, Takeaway.com in Belgium and Lieferando in Germany. `brand` says which.
   */
  platform: "thuisbezorgd" | "ubereats";
  brand?: "thuisbezorgd" | "takeaway" | "lieferando";
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

export function cuisineSearchTerms(countryCode: string, countryName: string): string[] {
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
  hubs: SearchHub[];
  remainder: string;
} {
  const postcodeMatch = raw.match(/\b(\d{4}\s*[A-Za-z]{2})\b/);
  if (postcodeMatch) {
    const postcode = postcodeMatch[1]!.replace(/\s+/g, "").toUpperCase();
    const rest = raw.replace(postcodeMatch[0], "").trim();
    return {
      hubs: [{ city: rest || postcode, address: `${postcode} Netherlands`, country: "nl" }],
      remainder: rest,
    };
  }

  const matched = anchorsInText(raw);
  if (matched.length > 0) {
    let remainder = normalizeCity(raw);
    for (const anchor of matched) {
      for (const alias of anchor.aliases) {
        remainder = remainder.replace(
          new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^a-z])`, "g"),
          "$1 ",
        );
      }
    }
    return {
      hubs: matched.map(hubFromAnchor),
      remainder: remainder.replace(/\s+/g, " ").trim(),
    };
  }

  const city = raw.trim();
  if (city) {
    return {
      hubs: [{ city, address: `${city} Netherlands`, country: "nl" }],
      remainder: "",
    };
  }

  return { hubs: [DEFAULT_HUB], remainder: "" };
}

export function resolveSearchHubs(
  query?: string,
  city?: string,
): {
  hubs: SearchHub[];
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
    return { hubs: [DEFAULT_HUB], focusTerms: [] };
  }

  const hasPostcode = /\b\d{4}\s*[A-Za-z]{2}\b/.test(queryRaw);
  if (hasPostcode || anchorsInText(queryRaw).length > 0) {
    const fromQuery = hubsMatchingText(queryRaw);
    return {
      hubs: fromQuery.hubs,
      focusTerms: fromQuery.remainder ? [fromQuery.remainder] : [],
    };
  }

  // Cuisine / focus only — search near Leiden unless a city was supplied.
  return { hubs: [DEFAULT_HUB], focusTerms: [queryRaw] };
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

type JetBrand = "thuisbezorgd" | "takeaway" | "lieferando";

function jetBrandForHost(hostname: string): JetBrand | null {
  if (/(^|\.)thuisbezorgd\.nl$/i.test(hostname)) return "thuisbezorgd";
  if (/(^|\.)takeaway\.com$/i.test(hostname)) return "takeaway";
  if (/(^|\.)lieferando\.de$/i.test(hostname)) return "lieferando";
  return null;
}

/** Just Eat Takeaway restaurant URL on one of its Dutch, Belgian or German sites. */
function normalizeJetUrl(url: string | undefined): { url: string; brand: JetBrand } | undefined {
  const absolute = absoluteHttpUrl(url);
  if (!absolute) return undefined;
  try {
    const parsed = new URL(absolute);
    const brand = jetBrandForHost(parsed.hostname);
    if (!brand) return undefined;
    return { url: parsed.toString(), brand };
  } catch {
    return undefined;
  }
}

function normalizeUberEatsUrl(
  url: string | undefined,
  country: HostCountry = "nl",
): string | undefined {
  const absolute = absoluteHttpUrl(url);
  if (!absolute) return undefined;
  try {
    const parsed = new URL(absolute);
    if (!/(^|\.)ubereats\.com$/i.test(parsed.hostname)) return undefined;
    // Force www + keep path (actors sometimes omit www / use other locales).
    parsed.hostname = "www.ubereats.com";
    // Locale-relative store paths get the storefront of the country we searched.
    if (/^\/store\//i.test(parsed.pathname)) {
      parsed.pathname = `/${country}${parsed.pathname}`;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function mapThuisbezorgdItem(item: unknown): GroundedOrderListing | null {
  const row = asRecord(item);
  if (!row) return null;
  const name = asString(row.name);
  const jet = normalizeJetUrl(asString(row.url));
  if (!name || !jet) return null;
  const url = jet.url;
  const rating = asNumber(row.rating);
  const ratingCount = asNumber(row.ratingCount);
  const city = asString(row.city);
  const cuisines = asStringArray(row.cuisines);
  const fee = asNumber(row.deliveryFee);
  // Thuisbezorgd/Takeaway.com and the Lieferando actor name these fields differently.
  const minOrder = asNumber(row.minimumOrder) ?? asNumber(row.minimumOrderValue);
  const etaRaw = row.deliveryEtaMinutes ?? row.deliveryTimeMinutes;
  const eta = typeof etaRaw === "number" ? `${etaRaw} min` : asString(etaRaw);
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
    brand: jet.brand,
    name,
    url,
    city,
    rating,
    ratingCount,
    cuisines,
    notes: bits.length > 0 ? bits.join(" · ") : undefined,
  };
}

export function mapUberEatsItem(
  item: unknown,
  country: HostCountry = "nl",
): GroundedOrderListing | null {
  const row = asRecord(item);
  if (!row) return null;
  const name = asString(row.title) || asString(row.sanitizedTitle) || asString(row.name);
  const url = normalizeUberEatsUrl(asString(row.url), country);
  if (!name || !url) return null;

  const location = asRecord(row.location);
  const city = asString(location?.city) || asString(row.city) || undefined;
  const cuisines =
    asStringArray(row.cuisineList) || asStringArray(row.categories) || undefined;
  const ratingObj = asRecord(row.rating);
  const rating = asNumber(ratingObj?.ratingValue) || asNumber(row.ratingValue);
  const reviewRaw = asString(ratingObj?.reviewCount) || asString(row.reviewCount);
  const ratingCount = reviewRaw ? asNumber(reviewRaw.replace(/[^0-9.]/g, "")) : undefined;

  const featured = asRecord(row.featuredItems);
  const signatureDishHint =
    asString(featured?.title) || asString(asRecord(row.featuredItem)?.title);

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

function matchesCuisineFocus(listing: GroundedOrderListing, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const hay = [listing.name, ...(listing.cuisines ?? []), listing.notes ?? ""]
    .join(" ")
    .toLowerCase();
  return terms.some((term) => {
    const needle = term.toLowerCase();
    return needle.length >= 3 && hay.includes(needle);
  });
}

/** Thuisbezorgd.nl (country "nl") and Takeaway.com Belgium (country "be"). */
async function searchThuisbezorgd(input: {
  country: "nl" | "be";
  addresses: string[];
  cuisineTerms: string[];
  maxRestaurants: number;
}): Promise<GroundedOrderListing[]> {
  const actor = envActor("APIFY_THUISBEZORGD_ACTOR", DEFAULT_TB_ACTOR);
  const items = await runActorDatasetItems({
    actor,
    body: {
      addresses: input.addresses,
      country: input.country,
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

/** Lieferando.de: one location per run, no cuisine filter (filtered afterwards). */
async function searchLieferando(input: {
  city: string;
  maxRestaurants: number;
}): Promise<GroundedOrderListing[]> {
  const actor = envActor("APIFY_LIEFERANDO_ACTOR", DEFAULT_LIEFERANDO_ACTOR);
  const items = await runActorDatasetItems({
    actor,
    body: {
      country: "de",
      location: input.city,
      serviceType: "delivery",
      maxResults: input.maxRestaurants,
      scrapeMenus: false,
    },
  });
  return items
    .map(mapThuisbezorgdItem)
    .filter((item): item is GroundedOrderListing => item != null);
}

const UBER_LOCALE: Record<HostCountry, string> = { nl: "nl-NL", be: "nl-BE", de: "de-DE" };

async function searchUberEats(input: {
  address: string;
  country: HostCountry;
  query: string;
  maxRows: number;
}): Promise<GroundedOrderListing[]> {
  const actor = envActor("APIFY_UBEREATS_ACTOR", DEFAULT_UE_ACTOR);
  const items = await runActorDatasetItems({
    actor,
    body: {
      locale: UBER_LOCALE[input.country],
      address: input.address,
      addressCountry: input.country.toUpperCase(),
      query: input.query,
      storeType: "RESTAURANTS",
      maxRows: input.maxRows,
      getMenuCustomizations: false,
    },
  });
  return items
    .map((item) => mapUberEatsItem(item, input.country))
    .filter((item): item is GroundedOrderListing => item != null);
}

const BRAND_LABEL: Record<JetBrand, string> = {
  thuisbezorgd: "Thuisbezorgd",
  takeaway: "Takeaway.com",
  lieferando: "Lieferando",
};

/**
 * Search the delivery platforms for real restaurants in the Netherlands, Belgium or
 * western Germany: Thuisbezorgd / Takeaway.com / Lieferando (one Just Eat Takeaway
 * family) plus Uber Eats. Returns grounded listings with platform menu/store URLs
 * (no LLM invention).
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
      "APIFY_TOKEN is not configured. Add it to .env to discover order options from Thuisbezorgd / Takeaway.com / Lieferando / Uber Eats.",
    );
  }

  const maxPerPlatform = Math.min(Math.max(input.maxPerPlatform ?? 10, 3), 20);
  const { hubs, focusTerms } = resolveSearchHubs(input.query, input.city);
  const cuisineTerms = cuisineSearchTerms(input.countryCode, input.countryName);
  const searchQuery =
    [...focusTerms, ...cuisineTerms].filter(Boolean).slice(0, 4).join(" ").trim() ||
    input.countryName;

  const hubsIn = (country: HostCountry) => hubs.filter((hub) => hub.country === country);
  const nlHubs = hubsIn("nl");
  const beHubs = hubsIn("be");
  const deHubs = hubsIn("de");
  const uberHub = hubs[0]!;

  type Task = { label: string; family: "jet" | "uber"; run: Promise<GroundedOrderListing[]> };
  const tasks: Task[] = [];
  const jetCuisines = [...cuisineTerms, ...focusTerms];
  if (nlHubs.length > 0) {
    tasks.push({
      label: "Thuisbezorgd",
      family: "jet",
      run: searchThuisbezorgd({
        country: "nl",
        addresses: nlHubs.map((hub) => hub.address),
        cuisineTerms: jetCuisines,
        maxRestaurants: maxPerPlatform * Math.min(nlHubs.length, 3),
      }),
    });
  }
  if (beHubs.length > 0) {
    tasks.push({
      label: "Takeaway.com",
      family: "jet",
      run: searchThuisbezorgd({
        country: "be",
        addresses: beHubs.map((hub) => hub.address),
        cuisineTerms: jetCuisines,
        maxRestaurants: maxPerPlatform * Math.min(beHubs.length, 3),
      }),
    });
  }
  for (const hub of deHubs.slice(0, 3)) {
    tasks.push({
      label: `Lieferando ${hub.city}`,
      family: "jet",
      // Lieferando lists hundreds of places per city and cannot filter by cuisine, so
      // fetch a wide page and keep the matching ones below.
      run: searchLieferando({ city: hub.city, maxRestaurants: Math.max(maxPerPlatform * 8, 80) }),
    });
  }
  tasks.push({
    label: "Uber Eats",
    family: "uber",
    run: searchUberEats({
      address: uberHub.address,
      country: uberHub.country,
      query: searchQuery,
      maxRows: maxPerPlatform,
    }),
  });

  const settled = await Promise.allSettled(tasks.map((task) => task.run));

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

  settled.forEach((result, index) => {
    const task = tasks[index]!;
    if (result.status === "rejected") {
      console.error(`${task.label} Apify search failed`, result.reason);
      errors.push(
        result.reason instanceof Error ? result.reason.message : `${task.label} search failed`,
      );
      return;
    }
    let batch = result.value;
    if (task.family === "jet") {
      // Soft filter when the actor's cuisine filter is loose (or missing, as for Lieferando).
      const filtered = batch.filter((item) =>
        matchesCuisineFocus(item, [...cuisineTerms, ...focusTerms]),
      );
      if (filtered.length >= 3) batch = filtered;
    }
    pushUnique(batch.slice(0, maxPerPlatform));
  });

  if (listings.length === 0) {
    throw new Error(
      errors[0] ??
        `No delivery restaurants found for ${input.countryName}. Try a different city.`,
    );
  }

  const hubLabel = hubs.map((hub) => hub.city).join(", ");
  const jetCounts = (Object.keys(BRAND_LABEL) as JetBrand[])
    .map((brand) => ({
      brand,
      n: listings.filter((l) => l.platform === "thuisbezorgd" && (l.brand ?? "thuisbezorgd") === brand)
        .length,
    }))
    .filter((row) => row.n > 0)
    .map((row) => `${row.n} ${BRAND_LABEL[row.brand]}`);
  const notes = [
    `Grounded via Apify: ${[...jetCounts, `${listings.filter((l) => l.platform === "ubereats").length} Uber Eats`].join(" + ")} near ${hubLabel}.`,
    `Query: ${searchQuery}.`,
    errors.length > 0 ? `Partial failures: ${errors.join(" | ")}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  // Prefer higher ratings first.
  listings.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return { listings, notes };
}
