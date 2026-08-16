import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  Drink,
  OrderOption,
  Recipe,
  SpecialtyShop,
} from "../../src/types/content.ts";
import { countryCatalog } from "../../src/content/countries/catalog.ts";
import {
  osmTagsForCountry,
} from "../../src/restaurants/osmCuisineMap.ts";
import {
  isGooglePlacesConfigured,
  officialWebsiteOrUndefined,
  searchGoogleRestaurantsByCuisine,
  type GroundedPlace,
} from "../lib/googlePlacesLookup.ts";
import { searchOsmRestaurantsForCountry } from "../lib/osmRestaurantSearch.ts";
import {
  fetchPageEvidenceMany,
  formatPageEvidence,
} from "../lib/pageEvidence.ts";
import { findCuisineImageFromQueries } from "../lib/wikimedia.ts";
import { chatJson, isOpenAiConfigured } from "./suggest.ts";
import {
  isApifyConfigured,
  searchDeliveryOrderOptions,
  type GroundedOrderListing,
} from "../lib/apifyOrderSearch.ts";
import { searchTripadvisorRestaurants } from "../lib/apifyTripadvisorSearch.ts";
import {
  appendOrderOptions,
  getCountryFromDb,
} from "../db/content.ts";
import {
  findRestaurantByNameAndCity,
  updateRestaurantFields,
  updateRestaurantNotes,
  upsertRestaurant,
} from "../db/restaurants.ts";

export { isOpenAiConfigured, isApifyConfigured };

/** OpenAI often returns null for omitted optional fields. */
const optionalString = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined);
const optionalNumber = z
  .number()
  .nullish()
  .transform((value) => value ?? undefined);
const optionalStringArray = z
  .array(z.string())
  .nullish()
  .transform((value) => value ?? undefined);

function normalizeCountryCodes(codes: string[] | undefined): string[] {
  if (!codes?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of codes) {
    const code = raw.trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(code) || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

/** Compact reference of country codes the model may assign. */
function cuisineCodeReference(): string {
  // Prefer full catalog so reassignment works for countries without OSM tags yet.
  return countryCatalog
    .map((entry) => `${entry.code}=${entry.name}`)
    .join(", ");
}

function countryNameForCode(code: string): string {
  return (
    countryCatalog.find((entry) => entry.code === code.toLowerCase())?.name ??
    code.toUpperCase()
  );
}

function cuisineTagsForCodes(codes: string[]): string[] {
  const tags = new Set<string>();
  for (const code of codes) {
    for (const tag of osmTagsForCountry(code)) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

const recipeItemSchema = z.object({
  name: z.string().min(1),
  localName: optionalString,
  description: z.string().min(20),
  category: z.enum(["starter", "main", "side", "dessert", "snack"]),
  region: optionalString,
  servings: z.coerce.number().int().positive(),
  prepMinutes: z.coerce.number().int().nonnegative(),
  cookMinutes: z.coerce.number().int().nonnegative(),
  waitTime: optionalString,
  difficulty: z.enum(["easy", "medium", "challenging"]),
  dietaryLabels: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.coerce.number().positive(),
        unit: z.string().min(1),
        note: optionalString,
      }),
    )
    .min(2),
  steps: z.array(z.string().min(8)).min(3),
  substitutions: optionalStringArray,
  servingSuggestion: optionalString,
  drinkPairing: optionalString,
});

const dishCandidateSchema = z.object({
  name: z.string().min(1),
  localName: optionalString,
  description: z.string().min(20),
  category: z.enum(["starter", "main", "side", "dessert", "snack"]),
  region: optionalString,
});

const recipesDiscoverSchema = z.object({
  notes: z.string(),
  recipes: z.array(dishCandidateSchema).min(1).max(30),
});

const restaurantConfidenceSchema = z.enum(["high", "medium", "low"]);

const restaurantVerifyItemSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  accept: z.boolean(),
  authenticityRating: z.coerce.number().min(1).max(5),
  authenticityNotes: z.string().min(20),
  cuisineEvidence: optionalString,
  evidenceSourceUrl: optionalString,
  confidence: restaurantConfidenceSchema.optional(),
  reason: optionalString,
  /** ISO country codes this place actually serves (when wrong for search cuisine). */
  actualCuisineCodes: z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? undefined),
});

const restaurantsVerifySchema = z.object({
  notes: z.string(),
  verifications: z.array(restaurantVerifyItemSchema).max(24),
});

function confidenceToRating(confidence: "high" | "medium" | "low" | undefined): number {
  if (confidence === "high") return 5;
  if (confidence === "medium") return 4;
  return 3;
}

const WEAK_NAME_RE =
  /\b(hotel|ibis|hilton|marriott|nh hotel|novotel|all.?you.?can.?eat|ayce|buffet|catering|supermarket|toko\s+online)\b/i;

function looksWeakCandidate(name: string): boolean {
  return WEAK_NAME_RE.test(name);
}

function confidenceFromPlaces(place: GroundedPlace): "high" | "medium" {
  const reviews = place.reviewCount ?? 0;
  const rating = place.rating ?? 0;
  if (reviews >= 40 && rating >= 4.2) return "high";
  if (reviews >= 10 && rating >= 3.8) return "high";
  return "medium";
}

function groundedToDiscovered(
  place: GroundedPlace,
  cuisine: string,
): DiscoveredRestaurant | null {
  if (looksWeakCandidate(place.name)) return null;
  if (!place.address?.trim() || place.address === "Netherlands") return null;
  const confidence = confidenceFromPlaces(place);
  const cuisineEvidence =
    place.source === "google"
      ? `Google Places match${place.matchedQuery ? ` for “${place.matchedQuery}”` : ""}${
          place.rating != null
            ? ` · ${place.rating.toFixed(1)}★ (${place.reviewCount ?? 0} reviews)`
            : ""
        }.`
      : place.source === "tripadvisor"
        ? `Tripadvisor match${place.matchedQuery ? ` for “${place.matchedQuery}”` : ""}${
            place.rating != null
              ? ` · ${place.rating.toFixed(1)}★ (${place.reviewCount ?? 0} reviews)`
              : ""
          }${place.tripadvisorUrl ? ` · ${place.tripadvisorUrl}` : ""}.`
        : `OpenStreetMap cuisine tag match near ${place.city}.`;
  const mapsUrl = stableMapsUrl(place.mapsUrl, {
    name: place.name,
    address: place.address,
    city: place.city,
  });
  return {
    name: place.name,
    address: place.address,
    city: place.city,
    postcode: place.postcode,
    website: officialWebsiteOrUndefined(place.website),
    mapsUrl,
    lat: place.lat,
    lng: place.lng,
    cuisine,
    cuisineEvidence,
    evidenceSourceUrl:
      place.source === "tripadvisor" && place.tripadvisorUrl
        ? place.tripadvisorUrl
        : (officialWebsiteOrUndefined(place.website) ?? mapsUrl),
    confidence,
    authenticityNotes: cuisineEvidence,
    authenticityRating: confidenceToRating(confidence),
    phone: place.phone,
    verified: place.source === "google" || place.source === "tripadvisor",
  };
}

const shopItemSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
  specialty: z.string().min(3),
  website: optionalString,
  mapsUrl: optionalString,
  notes: optionalString,
});

const shopsDiscoverSchema = z.object({
  notes: z.string(),
  shops: z.array(shopItemSchema).min(1).max(20),
});

const DRINK_TYPES = [
  "beer",
  "wine",
  "spirit",
  "cocktail",
  "soft-drink",
  "tea",
  "coffee",
] as const;

type DiscoverDrinkType = (typeof DRINK_TYPES)[number];

/** Map common LLM drink-type labels onto our enum. */
function normalizeDrinkType(raw: unknown): DiscoverDrinkType | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  if ((DRINK_TYPES as readonly string[]).includes(key)) {
    return key as DiscoverDrinkType;
  }
  if (
    /^(lager|ale|stout|porter|pils|pilsner|ipa|cider|mead)$/.test(key) ||
    key.includes("beer")
  ) {
    return "beer";
  }
  if (
    /^(red-wine|white-wine|rose|rosé|sparkling|champagne|prosecco|cava)$/.test(key) ||
    key.includes("wine")
  ) {
    return "wine";
  }
  if (
    /^(liqueur|liquor|aperitif|digestif|schnapps|brandy|whisky|whiskey|vodka|gin|rum|tequila|sake|soju|shochu|arak|ouzo|grappa|cognac|armagnac|aquavit|jenever|genever|rakija|palinka)$/.test(
      key,
    ) ||
    key.includes("spirit")
  ) {
    return "spirit";
  }
  if (/^(mixed-drink|punch|highball|mocktail)$/.test(key) || key.includes("cocktail")) {
    return key.includes("mocktail") ? "soft-drink" : "cocktail";
  }
  if (
    /^(soda|juice|lemonade|soft|softdrink|non-alcoholic|nonalcoholic|water|kombucha|ayran|lassi)$/.test(
      key,
    ) ||
    key.includes("soft")
  ) {
    return "soft-drink";
  }
  if (key.includes("tea") || key === "chai" || key === "mate") return "tea";
  if (key.includes("coffee") || key === "espresso" || key === "cafe") {
    return "coffee";
  }
  return null;
}

const drinkItemSchema = z.object({
  name: z.string().min(1),
  localName: optionalString,
  type: z.preprocess((value) => normalizeDrinkType(value) ?? value, z.enum(DRINK_TYPES)),
  alcoholic: z.boolean(),
  description: z.string().min(20),
  grape: optionalString,
  foodPairing: optionalString,
  imageSearchQueries: optionalStringArray,
});

const drinksDiscoverSchema = z.object({
  notes: z.string(),
  drinks: z.array(drinkItemSchema).min(1).max(50),
});

const imageDiscoverSchema = z.object({
  notes: z.string(),
  dishName: z.string().min(1),
  searchQueries: z.array(z.string().min(2)).min(2).max(6),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function mapsSearchUrl(parts: string[]): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    parts.filter(Boolean).join(" "),
  )}`;
}

function isUnstableMapsShortUrl(url: string | undefined): boolean {
  if (!url?.trim()) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "goo.gl" ||
      host.endsWith(".goo.gl") ||
      host === "g.co" ||
      host === "maps.app.goo.gl"
    );
  } catch {
    return true;
  }
}

function stableMapsUrl(
  url: string | undefined,
  place: { name: string; address: string; city: string },
): string {
  if (url?.trim() && /^https?:\/\//i.test(url) && !isUnstableMapsShortUrl(url)) {
    return url.trim();
  }
  return mapsSearchUrl([place.name, place.address, place.city, "Netherlands"]);
}

export type DiscoveredRestaurant = {
  name: string;
  address: string;
  city: string;
  postcode?: string;
  website?: string;
  mapsUrl: string;
  lat?: number;
  lng?: number;
  cuisine?: string;
  cuisineEvidence?: string;
  evidenceSourceUrl?: string;
  confidence?: "high" | "medium" | "low";
  authenticityNotes?: string;
  authenticityRating?: number;
  phone?: string;
  verified?: boolean;
  /** Verified cuisine countries (ISO-2); set after authenticity check. */
  cuisineCodes?: string[];
};

export type DishCandidate = {
  id: string;
  name: string;
  localName?: string;
  description: string;
  category: Recipe["category"];
  region?: string;
};

export async function discoverCountryRecipes(input: {
  countryCode: string;
  countryName: string;
  query?: string;
  existingNames: string[];
}): Promise<{ notes: string; recipes: DishCandidate[] }> {
  const focus = input.query?.trim()
    ? `Focus on: ${input.query.trim()}`
    : "Focus on iconic national dishes and classic home-cook favourites.";

  const existing = input.existingNames
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 40);

  const raw = await chatJson(
    `You are a cuisine editor for Spoon Spin. Reply with JSON only.
Propose authentic dishes for the given country that Dutch home cooks can make.
Avoid duplicates of existing dish names. Return dish candidates only (no full recipes).
When a dish is strongly tied to a specific region/province within the country, include its region in English.`,
    `Country: ${input.countryName} (${input.countryCode})
Existing dishes (do not repeat): ${existing.join("; ") || "none"}
${focus}

Return 20–24 distinct dishes when possible (quality still matters; prefer real classics over filler).

JSON shape:
{
  "notes": string,
  "recipes": [{
    "name": string,
    "localName": string?,
    "description": string,
    "category": "starter"|"main"|"side"|"dessert"|"snack",
    "region": string?
  }]
}`,
  );

  const parsed = recipesDiscoverSchema.parse(raw);
  return {
    notes: parsed.notes,
    recipes: parsed.recipes.map((recipe) => ({
      ...recipe,
      id: slugify(recipe.name) || "dish",
      description:
        recipe.description.length >= 40
          ? recipe.description
          : `${recipe.description} A traditional dish from ${input.countryName} cuisine.`,
    })),
  };
}

export async function expandDishCandidates(input: {
  countryCode: string;
  countryName: string;
  dishes: DishCandidate[];
}): Promise<Recipe[]> {
  if (input.dishes.length === 0) return [];

  const expanded: Recipe[] = [];
  const batchSize = 8;
  for (let i = 0; i < input.dishes.length; i += batchSize) {
    const batch = input.dishes.slice(i, i + batchSize);
    const raw = await chatJson(
      `You write practical home-cook recipes for Spoon Spin. Reply with JSON only.
Use metric units. Keep steps concrete. description at least 40 characters.
Include region in English when the dish belongs to a specific area of the country.`,
      `Country: ${input.countryName} (${input.countryCode})
Expand each dish into a full recipe.

Dishes:
${JSON.stringify(batch, null, 2)}

JSON shape:
{
  "recipes": [{
    "name": string,
    "localName": string?,
    "description": string,
    "category": "starter"|"main"|"side"|"dessert"|"snack",
    "region": string?,
    "servings": number,
    "prepMinutes": number,
    "cookMinutes": number,
    "waitTime": string? (passive rest/ferment/soak, e.g. "48 hours"; omit if none),
    "difficulty": "easy"|"medium"|"challenging",
    "dietaryLabels": string[],
    "ingredients": [{"name":string,"quantity":number,"unit":string,"note":string?}],
    "steps": string[],
    "substitutions": string[]?,
    "servingSuggestion": string?,
    "drinkPairing": string?
  }]
}`,
    );

    const parsed = z
      .object({ recipes: z.array(recipeItemSchema).min(1).max(batchSize) })
      .parse(raw);

    for (const recipe of parsed.recipes) {
      const match =
        batch.find(
          (dish) =>
            dish.name.toLowerCase() === recipe.name.toLowerCase() ||
            (dish.localName &&
              recipe.localName &&
              dish.localName.toLowerCase() === recipe.localName.toLowerCase()),
        ) ?? batch[expanded.length % batch.length];
      expanded.push({
        ...recipe,
        id: match?.id || slugify(recipe.name) || `dish-${expanded.length + 1}`,
        region: recipe.region ?? match?.region,
        description:
          recipe.description.length >= 40
            ? recipe.description
            : `${recipe.description} A traditional dish from ${input.countryName} cuisine.`,
      });
    }
  }

  return expanded;
}

export async function discoverCountryRestaurants(input: {
  countryCode: string;
  countryName: string;
  query?: string;
  cuisineAliases?: string[];
}): Promise<{ notes: string; restaurants: DiscoveredRestaurant[] }> {
  const hasPlaces = isGooglePlacesConfigured();
  const hasApify = isApifyConfigured();
  if (!hasPlaces && !hasApify) {
    throw new Error(
      "Restaurant discover needs GOOGLE_PLACES_API_KEY and/or APIFY_TOKEN (Tripadvisor).",
    );
  }

  const cuisine = input.countryName;
  const aliasSet = new Set<string>();
  for (const alias of input.cuisineAliases ?? []) {
    const trimmed = alias.trim();
    if (trimmed) aliasSet.add(trimmed);
  }
  aliasSet.add(`${cuisine} restaurant`);
  aliasSet.add(`${cuisine} restaurant Nederland`);
  const aliases = [...aliasSet].slice(0, 8);
  const focus = input.query?.trim() || undefined;

  let placesHits: GroundedPlace[] = [];
  if (hasPlaces) {
    placesHits = await searchGoogleRestaurantsByCuisine({
      aliases,
      focus,
      maxPerQuery: 8,
    });
  }

  let osmHits: GroundedPlace[] = [];
  try {
    osmHits = await searchOsmRestaurantsForCountry({
      countryCode: input.countryCode,
    });
  } catch (error) {
    console.warn("OSM restaurant supplement failed", error);
  }

  let tripadvisorHits: GroundedPlace[] = [];
  let tripadvisorNotes = "";
  if (hasApify) {
    try {
      const ta = await searchTripadvisorRestaurants({
        countryName: input.countryName,
        query: input.query,
        cuisineAliases: input.cuisineAliases,
        maxPerCity: 10,
      });
      tripadvisorHits = ta.places;
      tripadvisorNotes = ta.notes;
    } catch (error) {
      console.warn("Tripadvisor restaurant search failed", error);
      tripadvisorNotes =
        error instanceof Error
          ? `Tripadvisor failed: ${error.message}`
          : "Tripadvisor search failed.";
    }
  }

  const byKey = new Map<string, GroundedPlace>();
  const nameCityKey = (place: GroundedPlace) =>
    `${place.name.trim().toLowerCase()}|${place.city.trim().toLowerCase()}`;

  for (const place of placesHits) {
    byKey.set(place.placeId, place);
  }
  for (const place of tripadvisorHits) {
    const already = [...byKey.values()].some(
      (existing) => nameCityKey(existing) === nameCityKey(place),
    );
    if (!already) byKey.set(place.placeId, place);
  }
  for (const place of osmHits) {
    // Prefer Google / Tripadvisor when both sources find the same name+city.
    const already = [...byKey.values()].some(
      (existing) => nameCityKey(existing) === nameCityKey(place),
    );
    if (!already) byKey.set(place.placeId, place);
  }

  const grounded = [...byKey.values()]
    .map((place) => groundedToDiscovered(place, cuisine))
    .filter((place): place is DiscoveredRestaurant => Boolean(place));

  const parts = [
    `Found ${placesHits.length} Google Places hit(s)` +
      (tripadvisorHits.length > 0
        ? `, ${tripadvisorHits.length} Tripadvisor hit(s)`
        : "") +
      (osmHits.length > 0 ? `, and ${osmHits.length} OSM specialty match(es)` : "") +
      ` for ${cuisine}.`,
  ];
  if (tripadvisorNotes) parts.push(tripadvisorNotes);
  if (focus) parts.push(`Focus: ${focus}.`);

  if (grounded.length === 0) {
    return {
      notes: `${parts.join(" ")} No suitable specialists remained after filtering. Try a city name in the focus field.`,
      restaurants: [],
    };
  }

  // Soft OpenAI authenticity filter when configured — cannot invent new names.
  if (isOpenAiConfigured()) {
    try {
      const verification = await verifyRestaurantAuthenticity({
        countryCode: input.countryCode,
        countryName: input.countryName,
        restaurants: grounded.slice(0, 20),
      });
      if (verification.notes) parts.push(verification.notes);

      const reassigned = await persistReassignedRestaurants(
        verification.reassigned,
      );
      if (reassigned.created > 0 || reassigned.updated > 0) {
        parts.push(
          `Reassigned ${reassigned.created + reassigned.updated} wrong-cuisine hit(s) to their actual countries` +
            (reassigned.labels.length > 0
              ? ` (${reassigned.labels.join(", ")})`
              : "") +
            (reassigned.skipped > 0
              ? `; ${reassigned.skipped} already stored`
              : "") +
            ".",
        );
      } else if (verification.reassigned.length > 0) {
        parts.push(
          `${verification.reassigned.length} wrong-cuisine hit(s) already stored under their actual countries.`,
        );
      }

      const rejected =
        grounded.length -
        verification.restaurants.length -
        verification.reassigned.length;
      if (rejected > 0) {
        parts.push(
          `Dropped ${rejected} candidate(s) that failed the authenticity check.`,
        );
      }
      if (verification.restaurants.length === 0) {
        parts.push(
          reassigned.created + reassigned.updated > 0 ||
            verification.reassigned.length > 0
            ? "No matches remained for this cuisine after verification (mismatches were filed under the correct countries)."
            : "No authentic specialists remained after verification.",
        );
        return {
          notes: parts.join(" "),
          restaurants: [],
        };
      }
      return {
        notes: parts.join(" "),
        restaurants: verification.restaurants.slice(0, 16),
      };
    } catch (error) {
      console.warn(
        "Authenticity verify failed; returning Places/Tripadvisor/OSM list",
        error,
      );
      parts.push("Authenticity check skipped due to an error.");
    }
  }

  return {
    notes: parts.join(" "),
    restaurants: grounded.slice(0, 16),
  };
}

async function persistReassignedRestaurants(
  places: DiscoveredRestaurant[],
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  labels: string[];
}> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const labelCounts = new Map<string, number>();

  for (const place of places) {
    const codes = normalizeCountryCodes(place.cuisineCodes);
    if (codes.length === 0) {
      skipped += 1;
      continue;
    }
    const result = await ensureRestaurantUnderCuisines(place, codes);
    if (result === "created") created += 1;
    else if (result === "updated") updated += 1;
    else skipped += 1;

    for (const code of codes) {
      const label = countryNameForCode(code);
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }
  }

  const labels = [...labelCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => (count > 1 ? `${name}×${count}` : name))
    .slice(0, 6);

  return { created, updated, skipped, labels };
}

async function ensureRestaurantUnderCuisines(
  place: DiscoveredRestaurant,
  cuisineCodes: string[],
): Promise<"created" | "updated" | "exists"> {
  const codes = normalizeCountryCodes(cuisineCodes);
  if (codes.length === 0) return "exists";

  const existing = await findRestaurantByNameAndCity(place.name, place.city);
  const notes =
    place.authenticityNotes?.trim() ||
    place.cuisineEvidence?.trim() ||
    `Verified as ${codes.map(countryNameForCode).join(" / ")} cuisine.`;
  const website = officialWebsiteOrUndefined(place.website) ?? null;
  const rating =
    place.authenticityRating != null && place.authenticityRating >= 3
      ? place.authenticityRating
      : place.confidence === "high"
        ? 5
        : 4;

  if (existing) {
    const merged = Array.from(new Set([...existing.cuisineCodes, ...codes]));
    const alreadyHadAll = codes.every((code) =>
      existing.cuisineCodes.includes(code),
    );
    if (alreadyHadAll && merged.length === existing.cuisineCodes.length) {
      return "exists";
    }
    await updateRestaurantFields(existing.id, {
      website: website ?? undefined,
      cuisineCodes: merged,
    });
    await updateRestaurantNotes(existing.id, notes, { cuisineCodes: merged });
    return "updated";
  }

  const key = createHash("sha1")
    .update(
      `${codes.slice().sort().join(",")}|${place.name}|${place.city}|${place.address}`.toLowerCase(),
    )
    .digest("hex")
    .slice(0, 16);
  const tags = cuisineTagsForCodes(codes);
  await upsertRestaurant({
    id: `admin-${key}`,
    osmId: `admin-reassign:${key}`,
    name: place.name,
    address: place.address,
    city: place.city,
    postcode: place.postcode ?? null,
    lat: place.lat ?? null,
    lng: place.lng ?? null,
    cuisineCodes: codes,
    cuisineTags: tags.length > 0 ? tags : codes,
    website,
    phone: place.phone ?? null,
    source: "admin-discover-reassign",
    mapsUrl: place.mapsUrl,
    reviewed: true,
    authenticityRating: rating,
    authenticityNotes: notes,
    reviewedAt: new Date().toISOString(),
    reviewSource: "admin-discover-reassign",
  });
  return "created";
}

async function verifyRestaurantAuthenticity(input: {
  countryCode: string;
  countryName: string;
  restaurants: DiscoveredRestaurant[];
}): Promise<{
  notes: string;
  restaurants: DiscoveredRestaurant[];
  reassigned: DiscoveredRestaurant[];
}> {
  if (input.restaurants.length === 0) {
    return { notes: "", restaurants: [], reassigned: [] };
  }

  const searchCode = input.countryCode.toLowerCase();

  const evidenceByIndex = await Promise.all(
    input.restaurants.map((place) =>
      fetchPageEvidenceMany(
        [place.website, place.evidenceSourceUrl],
        { maxPages: 2, concurrency: 2 },
      ),
    ),
  );

  const listing = input.restaurants
    .map((place, index) => {
      const parts = [
        `${index + 1}. ${place.name} — ${place.address}, ${place.city}`,
        place.website ? `website: ${place.website}` : "website: (none)",
        place.cuisineEvidence ? `claimed evidence: ${place.cuisineEvidence}` : null,
        place.evidenceSourceUrl ? `evidence source: ${place.evidenceSourceUrl}` : null,
        place.confidence ? `claimed confidence: ${place.confidence}` : null,
        `page text:\n${formatPageEvidence(evidenceByIndex[index] ?? [])}`,
      ];
      return parts.filter(Boolean).join("\n");
    })
    .join("\n\n");

  const raw = await chatJson(
    `You verify whether restaurants in the Netherlands are genuine specialists for a given national cuisine.
Reply with JSON only.

Use the fetched page text (website / Tripadvisor / delivery pages) as primary evidence when present. Trust clear cuisine wording in titles and descriptions (e.g. “Yemeni Restaurant”, “Albanese keuken”) over the search query that surfaced the place.

Accept (accept=true) only when the place mainly serves the SEARCH cuisine (or a closely related regional cuisine diners would expect under that flag), is currently operating, and has a real NL address.
When the place clearly serves a DIFFERENT national cuisine: set accept=false and set actualCuisineCodes to the ISO country code(s) it actually matches (1–3). Do not invent weak matches.
When cuisine is unclear, closed, directory-only, fusion-first, hotel, supermarket, or not a restaurant: accept=false and omit actualCuisineCodes (or leave empty).
Prefer fewer accepts over uncertain ones.
confidence: "high" | "medium" | "low" — only accept high or medium for accept=true.
authenticityRating 1–5 (only accept if rating >= 4).
cuisineEvidence: short note citing menu/About/description proof from the page text when available.
evidenceSourceUrl: official venue website if known, otherwise null (never invent; do not invent Tripadvisor/Thuisbezorgd/Uber Eats URLs).
authenticityNotes: 1–3 sentences explaining the accept/reject/reassign.
Allowed cuisine codes: ${cuisineCodeReference()}`,
    `Search cuisine country: ${input.countryName} (${searchCode})

Candidates:
${listing}

Return one verification per candidate (same names/cities).

JSON shape:
{
  "notes": string,
  "verifications": [{
    "name": string,
    "city": string,
    "accept": boolean,
    "authenticityRating": number,
    "authenticityNotes": string,
    "cuisineEvidence": string?,
    "evidenceSourceUrl": string | null,
    "confidence": "high" | "medium" | "low",
    "actualCuisineCodes": string[]?,
    "reason": string?
  }]
}`,
  );

  const parsed = restaurantsVerifySchema.parse(raw);
  const byKey = new Map(
    parsed.verifications.map((item) => [
      `${item.name.trim().toLowerCase()}|${item.city.trim().toLowerCase()}`,
      item,
    ]),
  );

  const accepted: DiscoveredRestaurant[] = [];
  const reassigned: DiscoveredRestaurant[] = [];

  for (const place of input.restaurants) {
    const key = `${place.name.trim().toLowerCase()}|${place.city.trim().toLowerCase()}`;
    let verdict = byKey.get(key);
    if (!verdict) {
      verdict = parsed.verifications.find(
        (item) => item.name.trim().toLowerCase() === place.name.trim().toLowerCase(),
      );
    }
    if (!verdict) continue;

    const confidence =
      verdict.confidence === "high" || verdict.confidence === "medium"
        ? verdict.confidence
        : place.confidence === "high"
          ? "high"
          : "medium";
    const cuisineEvidence =
      verdict.cuisineEvidence?.trim() ||
      place.cuisineEvidence ||
      verdict.authenticityNotes;
    const evidenceSourceUrl =
      officialWebsiteOrUndefined(verdict.evidenceSourceUrl) ??
      place.evidenceSourceUrl ??
      place.website;
    const base: DiscoveredRestaurant = {
      ...place,
      website: officialWebsiteOrUndefined(place.website),
      cuisineEvidence,
      evidenceSourceUrl,
      confidence,
      authenticityRating: Math.round(verdict.authenticityRating * 10) / 10,
      authenticityNotes: verdict.authenticityNotes,
      verified: true,
    };

    if (
      verdict.accept &&
      verdict.confidence !== "low" &&
      verdict.authenticityRating >= 4
    ) {
      accepted.push({
        ...base,
        cuisineCodes: [searchCode],
      });
      continue;
    }

    const actualCodes = normalizeCountryCodes(verdict.actualCuisineCodes).filter(
      (code) => code !== searchCode,
    );
    if (
      actualCodes.length > 0 &&
      verdict.confidence !== "low" &&
      verdict.authenticityRating >= 3
    ) {
      reassigned.push({
        ...base,
        cuisine: countryNameForCode(actualCodes[0]!),
        cuisineCodes: actualCodes,
      });
    }
  }

  return {
    notes: parsed.notes,
    restaurants: accepted,
    reassigned,
  };
}

export async function discoverCountryShops(input: {
  countryCode: string;
  countryName: string;
  query?: string;
}): Promise<{ notes: string; shops: SpecialtyShop[] }> {
  const focus = input.query?.trim()
    ? `Focus on: ${input.query.trim()}`
    : "Prefer specialty grocery stores and delis that stock ingredients for this cuisine.";

  const raw = await chatJson(
    `You research specialty food shops in the Netherlands for a national cuisine.
Reply with JSON only. Prefer real shops when known; otherwise best-effort with honest notes.
City must be in the Netherlands.`,
    `Cuisine country: ${input.countryName} (${input.countryCode})
${focus}

Return up to 15 specialty shops.

JSON shape:
{
  "notes": string,
  "shops": [{
    "name": string,
    "city": string,
    "address": string,
    "specialty": string,
    "website": string?,
    "mapsUrl": string?,
    "notes": string?
  }]
}`,
  );

  const parsed = shopsDiscoverSchema.parse(raw);
  return {
    notes: parsed.notes,
    shops: parsed.shops.map((shop) => {
      const website =
        shop.website && /^https?:\/\//i.test(shop.website) ? shop.website : undefined;
      const mapsUrl = stableMapsUrl(shop.mapsUrl, {
        name: shop.name,
        address: shop.address,
        city: shop.city,
      });
      return {
        id: slugify(`${shop.name}-${shop.city}`) || "shop",
        name: shop.name,
        city: shop.city,
        address: shop.address,
        specialty: shop.specialty,
        website,
        mapsUrl,
        notes: shop.notes,
      };
    }),
  };
}

const orderOptionAnnotateSchema = z.object({
  notes: z.string(),
  items: z
    .array(
      z.object({
        index: z.coerce.number().int().nonnegative(),
        signatureDish: optionalString,
        optionNotes: optionalString,
      }),
    )
    .max(30),
});

const orderOptionVerifyItemSchema = z.object({
  index: z.coerce.number().int().nonnegative(),
  accept: z.boolean(),
  actualCuisineCodes: z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? undefined),
  reason: optionalString,
  optionNotes: optionalString,
  signatureDish: optionalString,
});

const orderOptionsVerifySchema = z.object({
  notes: z.string(),
  items: z.array(orderOptionVerifyItemSchema).max(30),
});

async function annotateGroundedOrderOptions(input: {
  countryName: string;
  listings: GroundedOrderListing[];
}): Promise<Map<number, { signatureDish?: string; notes?: string }>> {
  const out = new Map<number, { signatureDish?: string; notes?: string }>();
  if (!isOpenAiConfigured() || input.listings.length === 0) return out;

  const catalog = input.listings
    .map((listing, index) => {
      const bits = [
        `#${index}`,
        listing.platform,
        listing.name,
        listing.city ? `@ ${listing.city}` : null,
        listing.cuisines?.length ? `cuisines: ${listing.cuisines.join(", ")}` : null,
        listing.signatureDishHint ? `featured: ${listing.signatureDishHint}` : null,
        listing.notes ? `meta: ${listing.notes}` : null,
      ].filter(Boolean);
      return bits.join(" | ");
    })
    .join("\n");

  try {
    const raw = await chatJson(
      `You annotate real meal-delivery restaurants for Spoon Spin.
Reply with JSON only. Do NOT invent restaurants or URLs.
Only suggest a signatureDish when it is clearly implied by featured dishes or very typical for this cuisine at this venue.
Keep optionNotes short (one sentence) or omit.`,
      `Cuisine: ${input.countryName}

Grounded listings (index is authoritative):
${catalog}

JSON shape:
{
  "notes": string,
  "items": [{ "index": number, "signatureDish": string?, "optionNotes": string? }]
}`,
    );
    const parsed = orderOptionAnnotateSchema.parse(raw);
    for (const item of parsed.items) {
      if (item.index < 0 || item.index >= input.listings.length) continue;
      out.set(item.index, {
        signatureDish: item.signatureDish?.trim() || undefined,
        notes: item.optionNotes?.trim() || undefined,
      });
    }
  } catch (error) {
    console.warn("Order option annotation skipped", error);
  }
  return out;
}

async function verifyOrderOptionCuisines(input: {
  countryCode: string;
  countryName: string;
  listings: GroundedOrderListing[];
}): Promise<{
  notes: string;
  acceptedIndexes: number[];
  reassigned: Array<{
    index: number;
    cuisineCodes: string[];
    notes?: string;
    signatureDish?: string;
  }>;
}> {
  if (input.listings.length === 0) {
    return { notes: "", acceptedIndexes: [], reassigned: [] };
  }

  const searchCode = input.countryCode.toLowerCase();
  const evidenceByIndex = await Promise.all(
    input.listings.map((listing) =>
      fetchPageEvidenceMany([listing.url], { maxPages: 1, concurrency: 2 }),
    ),
  );

  const catalog = input.listings
    .map((listing, index) => {
      const bits = [
        `#${index}`,
        listing.platform,
        listing.name,
        listing.city ? `@ ${listing.city}` : null,
        listing.url,
        listing.cuisines?.length ? `listed cuisines: ${listing.cuisines.join(", ")}` : null,
        listing.signatureDishHint ? `featured: ${listing.signatureDishHint}` : null,
        listing.notes ? `meta: ${listing.notes}` : null,
        `page text:\n${formatPageEvidence(evidenceByIndex[index] ?? [])}`,
      ].filter(Boolean);
      return bits.join("\n");
    })
    .join("\n\n");

  const raw = await chatJson(
    `You verify whether meal-delivery listings match a SEARCH national cuisine.
Reply with JSON only. Do NOT invent restaurants or URLs.

Use listed cuisines and fetched Thuisbezorgd / Uber Eats page text (title + description) as primary evidence.
Accept (accept=true) only when the venue mainly serves the SEARCH cuisine.
When it clearly serves a DIFFERENT national cuisine: accept=false and set actualCuisineCodes to ISO codes (1–3).
When unclear / fusion / multi-cuisine without a clear specialist match: accept=false and omit actualCuisineCodes.
Allowed cuisine codes: ${cuisineCodeReference()}`,
    `Search cuisine: ${input.countryName} (${searchCode})

Listings:
${catalog}

JSON shape:
{
  "notes": string,
  "items": [{
    "index": number,
    "accept": boolean,
    "actualCuisineCodes": string[]?,
    "reason": string?,
    "optionNotes": string?,
    "signatureDish": string?
  }]
}`,
  );

  const parsed = orderOptionsVerifySchema.parse(raw);
  const acceptedIndexes: number[] = [];
  const reassigned: Array<{
    index: number;
    cuisineCodes: string[];
    notes?: string;
    signatureDish?: string;
  }> = [];
  const seen = new Set<number>();

  for (const item of parsed.items) {
    if (item.index < 0 || item.index >= input.listings.length) continue;
    if (seen.has(item.index)) continue;
    seen.add(item.index);
    if (item.accept) {
      acceptedIndexes.push(item.index);
      continue;
    }
    const codes = normalizeCountryCodes(item.actualCuisineCodes).filter(
      (code) => code !== searchCode,
    );
    if (codes.length > 0) {
      reassigned.push({
        index: item.index,
        cuisineCodes: codes,
        notes: item.optionNotes?.trim() || item.reason?.trim() || undefined,
        signatureDish: item.signatureDish?.trim() || undefined,
      });
    }
  }

  return { notes: parsed.notes, acceptedIndexes, reassigned };
}

async function persistReassignedOrderOptions(input: {
  listings: GroundedOrderListing[];
  reassigned: Array<{
    index: number;
    cuisineCodes: string[];
    notes?: string;
    signatureDish?: string;
  }>;
}): Promise<{ created: number; skipped: number; labels: string[] }> {
  let created = 0;
  let skipped = 0;
  const labelCounts = new Map<string, number>();

  for (const item of input.reassigned) {
    const listing = input.listings[item.index];
    if (!listing) {
      skipped += 1;
      continue;
    }

    let storedSomewhere = false;
    for (const code of item.cuisineCodes) {
      const country = await getCountryFromDb(code);
      if (!country) continue;
      const existing = country.orderOptions ?? [];
      const already = existing.some(
        (option) =>
          option.url.trim().toLowerCase() === listing.url.trim().toLowerCase() ||
          (option.platform === listing.platform &&
            option.name.trim().toLowerCase() === listing.name.trim().toLowerCase() &&
            (option.city ?? "").trim().toLowerCase() ===
              (listing.city ?? "").trim().toLowerCase()),
      );
      if (already) {
        storedSomewhere = true;
        continue;
      }
      const option: OrderOption = {
        id:
          slugify(`${listing.platform}-${listing.name}-${listing.city ?? "nl"}-${code}`) ||
          "order",
        name: listing.name,
        platform: listing.platform,
        url: listing.url,
        thuisbezorgdUrl:
          listing.platform === "thuisbezorgd" ? listing.url : undefined,
        ubereatsUrl: listing.platform === "ubereats" ? listing.url : undefined,
        city: listing.city,
        notes:
          item.notes ||
          listing.notes ||
          `Verified as ${countryNameForCode(code)} cuisine (reassigned from another search).`,
        signatureDish: item.signatureDish || listing.signatureDishHint || undefined,
        cuisineCodes: [code],
      };
      await appendOrderOptions(code, [option]);
      created += 1;
      storedSomewhere = true;
      const label = countryNameForCode(code);
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }
    if (!storedSomewhere) skipped += 1;
  }

  const labels = [...labelCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => (count > 1 ? `${name}×${count}` : name))
    .slice(0, 6);

  return { created, skipped, labels };
}

/**
 * Discover order options from live Thuisbezorgd / Uber Eats listings (Apify).
 * OpenAI verifies cuisine from TB/UE page text and reassigns mismatches.
 */
export async function discoverCountryOrderOptions(input: {
  countryCode: string;
  countryName: string;
  query?: string;
  city?: string;
}): Promise<{ notes: string; options: OrderOption[] }> {
  if (!isApifyConfigured()) {
    throw new Error(
      "APIFY_TOKEN is not configured. Add it to .env to discover order options from Thuisbezorgd / Uber Eats.",
    );
  }

  const grounded = await searchDeliveryOrderOptions({
    countryCode: input.countryCode,
    countryName: input.countryName,
    query: input.query,
    city: input.city,
    maxPerPlatform: 10,
  });

  const noteParts = [grounded.notes].filter(Boolean);
  let keptListings = grounded.listings;

  if (isOpenAiConfigured() && grounded.listings.length > 0) {
    try {
      const verified = await verifyOrderOptionCuisines({
        countryCode: input.countryCode,
        countryName: input.countryName,
        listings: grounded.listings,
      });
      if (verified.notes) noteParts.push(verified.notes);

      const persisted = await persistReassignedOrderOptions({
        listings: grounded.listings,
        reassigned: verified.reassigned,
      });
      if (persisted.created > 0) {
        noteParts.push(
          `Reassigned ${persisted.created} wrong-cuisine listing(s) to their actual countries` +
            (persisted.labels.length > 0 ? ` (${persisted.labels.join(", ")})` : "") +
            ".",
        );
      } else if (verified.reassigned.length > 0) {
        noteParts.push(
          `${verified.reassigned.length} wrong-cuisine listing(s) already stored or skipped (country missing).`,
        );
      }

      const acceptSet = new Set(verified.acceptedIndexes);
      const reassignSet = new Set(verified.reassigned.map((item) => item.index));
      keptListings = grounded.listings.filter((_, index) => acceptSet.has(index));
      const dropped =
        grounded.listings.length - keptListings.length - reassignSet.size;
      if (dropped > 0) {
        noteParts.push(
          `Dropped ${dropped} listing(s) that failed cuisine verification.`,
        );
      }
    } catch (error) {
      console.warn(
        "Order option cuisine verify failed; keeping soft-filtered list",
        error,
      );
      noteParts.push("Cuisine verification skipped due to an error.");
    }
  }

  const annotations = await annotateGroundedOrderOptions({
    countryName: input.countryName,
    listings: keptListings,
  });

  const options: OrderOption[] = keptListings.map((listing, index) => {
    const annotation = annotations.get(index);
    const notes = [listing.notes, annotation?.notes].filter(Boolean).join(" — ");
    return {
      id:
        slugify(`${listing.platform}-${listing.name}-${listing.city ?? "nl"}`) || "order",
      name: listing.name,
      platform: listing.platform,
      url: listing.url,
      thuisbezorgdUrl:
        listing.platform === "thuisbezorgd" ? listing.url : undefined,
      ubereatsUrl: listing.platform === "ubereats" ? listing.url : undefined,
      city: listing.city,
      notes: notes || undefined,
      signatureDish: annotation?.signatureDish || listing.signatureDishHint || undefined,
      cuisineCodes: [input.countryCode.toLowerCase()],
    };
  });

  return {
    notes: noteParts.join(" "),
    options,
  };
}

export async function discoverCountryDrinks(input: {
  countryCode: string;
  countryName: string;
  query?: string;
  existingNames: string[];
}): Promise<{ notes: string; drinks: Drink[] }> {
  const focus = input.query?.trim()
    ? `Focus on: ${input.query.trim()}`
    : "Cover all four sections below with authentic picks.";

  const raw = await chatJson(
    `You are a drinks editor for Spoon Spin. Reply with JSON only.
Propose authentic drinks from the given country, grouped conceptually into:
1) Beers — well-known brand names (bottles/cans people recognise), not vague "local lager".
2) Wines — famous grape varieties / appellations from that country, with foodPairing (what food it fits).
3) Other alcoholic — spirits, cocktails, aperitifs (not beer/wine).
4) Non-alcoholic — soft drinks, tea, coffee, classic non-alcoholic specialities.

Rules:
- Prefer real famous brand names for beers (e.g. Heineken, Guinness, Singha).
- For wines set grape (varietal or blend) and foodPairing (concrete dishes/cuisines).
- For beers set imageSearchQueries to 2–4 Wikimedia-friendly queries for a bottle or can photo (brand + bottle/can).
- For wines/spirits/soft drinks also prefer imageSearchQueries for bottle/glass photos when known.
- Avoid duplicates of existing drink names.
- Mark alcoholic correctly. type must match: beer, wine, spirit, cocktail, soft-drink, tea, coffee.`,
    `Country: ${input.countryName} (${input.countryCode})
Existing drinks (do not repeat): ${input.existingNames.join("; ") || "none"}
${focus}

Return up to 40 drinks with a healthy mix across the four sections
(aim for several beers, several wines, a few other alcoholic, and some non-alcoholic).

JSON shape:
{
  "notes": string,
  "drinks": [{
    "name": string,
    "localName": string?,
    "type": "beer"|"wine"|"spirit"|"cocktail"|"soft-drink"|"tea"|"coffee",
    "alcoholic": boolean,
    "description": string,
    "grape": string?,
    "foodPairing": string?,
    "imageSearchQueries": string[]?
  }]
}`,
  );

  const parsed = drinksDiscoverSchema.safeParse(raw);
  if (!parsed.success) {
    // Soft-parse: keep valid drinks, drop items with bad types/fields.
    const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const notes =
      typeof row.notes === "string" && row.notes.trim()
        ? row.notes.trim()
        : `Drinks from ${input.countryName}.`;
    const list = Array.isArray(row.drinks) ? row.drinks : [];
    const kept: z.infer<typeof drinkItemSchema>[] = [];
    for (const item of list) {
      const one = drinkItemSchema.safeParse(item);
      if (one.success) kept.push(one.data);
      else {
        const name =
          item && typeof item === "object" && "name" in item
            ? String((item as { name: unknown }).name)
            : "(unnamed)";
        console.warn(
          `Skipping invalid discovered drink "${name}":`,
          one.error.issues[0]?.message ?? one.error.message,
        );
      }
    }
    if (kept.length === 0) {
      throw parsed.error;
    }
    return await materializeDiscoveredDrinks(input, notes, kept);
  }

  return await materializeDiscoveredDrinks(input, parsed.data.notes, parsed.data.drinks);
}

async function materializeDiscoveredDrinks(
  input: {
    countryCode: string;
    countryName: string;
    query?: string;
    existingNames: string[];
  },
  notes: string,
  items: z.infer<typeof drinkItemSchema>[],
): Promise<{ notes: string; drinks: Drink[] }> {
  const drinks: Drink[] = [];

  for (const item of items) {
    const drink: Drink = {
      name: item.name,
      localName: item.localName,
      type: item.type,
      alcoholic: item.alcoholic,
      description:
        item.description.length >= 40
          ? item.description
          : `${item.description} A traditional drink from ${input.countryName}.`,
      grape: item.grape,
      foodPairing: item.foodPairing,
    };

    // Bottle / glass / can photos for any drink without an image yet.
    const wantsImage =
      !drink.imageUrl &&
      (item.type === "beer" ||
        item.type === "wine" ||
        item.type === "spirit" ||
        item.type === "cocktail" ||
        item.type === "soft-drink" ||
        item.type === "tea" ||
        item.type === "coffee" ||
        (item.imageSearchQueries && item.imageSearchQueries.length > 0));
    if (wantsImage) {
      const queries =
        item.imageSearchQueries && item.imageSearchQueries.length > 0
          ? item.imageSearchQueries
          : drinkImageSearchQueries(drink, input.countryName);
      try {
        const image = await findCuisineImageFromQueries(queries);
        if (image) {
          drink.imageUrl = image.url;
          drink.imageAttribution = image.attribution;
        }
      } catch (error) {
        console.warn(`Drink image lookup failed for ${item.name}`, error);
      }
    }

    drinks.push(drink);
  }

  return { notes, drinks };
}

export function drinkImageSearchQueries(drink: Drink, countryName: string): string[] {
  const name = drink.name;
  switch (drink.type) {
    case "beer":
      return [`${name} beer bottle`, `${name} beer can`, `${name} ${countryName} beer`];
    case "wine":
      return [
        `${name} wine bottle`,
        `${drink.grape ?? name} wine bottle`,
        `${name} ${countryName} wine`,
      ];
    case "spirit":
      return [`${name} bottle`, `${name} spirit bottle`, `${name} ${countryName}`];
    case "cocktail":
      return [`${name} cocktail`, `${name} drink glass`, `${name} cocktail glass`];
    case "tea":
      return [`${name} tea`, `${name} tea cup`, `${name} ${countryName} tea`];
    case "coffee":
      return [`${name} coffee`, `${name} coffee cup`, `${name} ${countryName} coffee`];
    case "soft-drink":
    default:
      return [`${name} bottle`, `${name} can`, `${name} drink`, `${name} ${countryName}`];
  }
}

export async function enrichDrinkWithImage(
  drink: Drink,
  countryName: string,
): Promise<Drink> {
  if (drink.imageUrl?.trim()) return drink;
  try {
    const image = await findCuisineImageFromQueries(
      drinkImageSearchQueries(drink, countryName),
    );
    if (!image) return drink;
    return {
      ...drink,
      imageUrl: image.url,
      imageAttribution: image.attribution,
    };
  } catch (error) {
    console.warn(`Drink image enrich failed for ${drink.name}`, error);
    return drink;
  }
}

export async function discoverCountryImageQueries(input: {
  countryCode: string;
  countryName: string;
  nationalDishName?: string;
}): Promise<{ notes: string; dishName: string; searchQueries: string[] }> {
  const raw = await chatJson(
    `You help find Wikimedia Commons photos of authentic national cuisine plates.
Reply with JSON only. Prefer concrete dish names and photo-friendly search queries.`,
    `Country: ${input.countryName} (${input.countryCode})
Known national dish: ${input.nationalDishName ?? "unknown"}

Suggest one iconic plated dish and 3–5 Wikimedia Commons search queries that will find a real food photo (not a flag or map).

JSON shape:
{
  "notes": string,
  "dishName": string,
  "searchQueries": string[]
}`,
  );

  return imageDiscoverSchema.parse(raw);
}

const recipeRewriteSchema = z.object({
  notes: z.string(),
  localName: optionalString,
  description: z.string().min(20),
  dietaryLabels: z.array(z.string()),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().min(1),
        note: optionalString,
      }),
    )
    .min(2),
  steps: z.array(z.string().min(8)).min(3),
  substitutions: optionalStringArray,
  servingSuggestion: optionalString,
  drinkPairing: optionalString,
});

const shopRewriteSchema = z.object({
  notes: z.string(),
  specialty: z.string().min(3),
  shopNotes: optionalString,
  address: optionalString,
  website: optionalString,
});

const restaurantRewriteSchema = z.object({
  notes: z.string(),
  authenticityNotes: z.string().min(20),
  cuisineVerdict: z.enum(["clear", "unclear"]).default("clear"),
  cuisineCodes: z
    .array(z.string().length(2))
    .nullish()
    .transform((value) => value ?? undefined),
});

const restaurantMenuItemSchema = z.object({
  name: z.string().min(1),
  localName: optionalString,
  description: optionalString,
  category: z
    .enum(["starter", "main", "side", "dessert", "snack", "drink"])
    .nullish()
    .transform((value) => value ?? undefined),
  priceEur: optionalNumber,
  cuisineCodes: z
    .array(z.string().length(2))
    .nullish()
    .transform((value) => value ?? undefined),
});

const restaurantMenuSchema = z.object({
  notes: z.string(),
  cuisineCodes: z
    .array(z.string().length(2))
    .nullish()
    .transform((value) => value ?? undefined),
  items: z.array(restaurantMenuItemSchema).min(1).max(40),
});

const sourceRatingResearchSchema = z
  .object({
    score: z.number().min(0).max(10),
    count: z.number().int().min(0).optional(),
    scale: z.union([z.literal(5), z.literal(10)]).optional(),
    url: z.string().url().optional(),
  })
  .nullish()
  .transform((value) => value ?? undefined);

const restaurantScoresSchema = z.object({
  notes: z.string(),
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  authenticityRating: z.number().min(1).max(5),
  authenticityNotes: z.string().min(20),
  ratings: z.object({
    google: sourceRatingResearchSchema,
    tripadvisor: sourceRatingResearchSchema,
    theFork: sourceRatingResearchSchema,
  }),
});

const itemImageQueriesSchema = z.object({
  notes: z.string(),
  searchQueries: z.array(z.string().min(2)).min(2).max(6),
});

export async function rewriteRecipeText(input: {
  countryName: string;
  recipe: Recipe;
}): Promise<{ notes: string; patch: Partial<Recipe> }> {
  const raw = await chatJson(
    `You improve Spoon Spin recipe copy with accurate, practical home-cooking detail.
Keep the same dish identity. Reply with JSON only.`,
    `Country cuisine: ${input.countryName}
Current recipe JSON:
${JSON.stringify(input.recipe, null, 2)}

Research and rewrite the editorial text fields for this dish.
Keep servings/times/difficulty/category unless clearly wrong.
Prefer authentic ingredients and clear steps.

JSON shape:
{
  "notes": string,
  "localName": string?,
  "description": string,
  "dietaryLabels": string[],
  "ingredients": [{ "name": string, "quantity": number, "unit": string, "note": string? }],
  "steps": string[],
  "substitutions": string[]?,
  "servingSuggestion": string?,
  "drinkPairing": string?
}`,
  );
  const parsed = recipeRewriteSchema.parse(raw);
  return {
    notes: parsed.notes,
    patch: {
      localName: parsed.localName,
      description: parsed.description,
      dietaryLabels: parsed.dietaryLabels,
      ingredients: parsed.ingredients,
      steps: parsed.steps,
      substitutions: parsed.substitutions,
      servingSuggestion: parsed.servingSuggestion,
      drinkPairing: parsed.drinkPairing,
    },
  };
}

const drinkRewriteSchema = z.object({
  notes: z.string(),
  localName: optionalString,
  description: z.string().min(20),
  grape: optionalString,
  foodPairing: optionalString,
  type: z
    .enum(["beer", "wine", "spirit", "cocktail", "soft-drink", "tea", "coffee"])
    .optional(),
  alcoholic: z.boolean().optional(),
});

export async function rewriteDrinkText(input: {
  countryName: string;
  drink: Drink;
}): Promise<{ notes: string; patch: Partial<Drink> }> {
  const raw = await chatJson(
    `You improve Spoon Spin drink copy with accurate, practical detail for home cooks.
Keep the same drink identity. Reply with JSON only.`,
    `Country cuisine: ${input.countryName}
Current drink JSON:
${JSON.stringify(input.drink, null, 2)}

Rewrite the editorial text. Keep the drink name unchanged.

JSON shape:
{
  "notes": string,
  "localName": string?,
  "description": string,
  "grape": string?,
  "foodPairing": string?,
  "type": "beer"|"wine"|"spirit"|"cocktail"|"soft-drink"|"tea"|"coffee"?,
  "alcoholic": boolean?
}`,
  );
  const parsed = drinkRewriteSchema.parse(raw);
  return {
    notes: parsed.notes,
    patch: {
      localName: parsed.localName,
      description: parsed.description,
      grape: parsed.grape,
      foodPairing: parsed.foodPairing,
      ...(parsed.type ? { type: parsed.type } : {}),
      ...(parsed.alcoholic != null ? { alcoholic: parsed.alcoholic } : {}),
    },
  };
}

export async function rewriteShopText(input: {
  countryName: string;
  shop: SpecialtyShop;
}): Promise<{
  notes: string;
  patch: Partial<SpecialtyShop>;
}> {
  const raw = await chatJson(
    `You improve specialty grocery shop blurbs for home cooks in the Netherlands.
Reply with JSON only. Keep the shop identity; improve specialty and notes.`,
    `Cuisine country: ${input.countryName}
Current shop JSON:
${JSON.stringify(input.shop, null, 2)}

JSON shape:
{
  "notes": string,
  "specialty": string,
  "shopNotes": string?,
  "address": string?,
  "website": string?
}`,
  );
  const parsed = shopRewriteSchema.parse(raw);
  const website =
    parsed.website && /^https?:\/\//i.test(parsed.website) ? parsed.website : undefined;
  return {
    notes: parsed.notes,
    patch: {
      specialty: parsed.specialty,
      notes: parsed.shopNotes,
      address: parsed.address,
      website,
    },
  };
}

const orderOptionRewriteSchema = z.object({
  notes: z.string(),
  name: z.string().min(1),
  optionNotes: optionalString,
  city: optionalString,
  signatureDish: optionalString,
  url: optionalString,
  cuisineVerdict: z.enum(["clear", "unclear"]).default("clear"),
  cuisineCodes: z
    .array(z.string().length(2))
    .nullish()
    .transform((value) => value ?? undefined),
});

export async function rewriteOrderOptionText(input: {
  countryName: string;
  countryCode?: string;
  option: OrderOption;
}): Promise<{
  notes: string;
  cuisineVerdict: "clear" | "unclear";
  cuisineCodes: string[];
  hadPageEvidence: boolean;
  patch: Partial<OrderOption>;
}> {
  const seedCodes = normalizeCountryCodes([
    ...(input.option.cuisineCodes ?? []),
    ...(input.countryCode ? [input.countryCode] : []),
  ]);
  const pageEvidence = await fetchPageEvidenceMany(
    [
      input.option.thuisbezorgdUrl,
      input.option.ubereatsUrl,
      input.option.url,
    ],
    { maxPages: 3, deep: true },
  );
  const hadPageEvidence = pageEvidence.length > 0;

  const raw = await chatJson(
    `You improve meal-delivery order option blurbs for diners in the Netherlands.
Reply with JSON only. Keep the restaurant and platform identity — do not invent a different venue.
Use fetched Thuisbezorgd / Uber Eats page text (title, description, snippet) as PRIMARY evidence for notes, signature dish, and cuisine countries.
Ground optionNotes in what the pages say about cuisine, specialties, and dishes. Do not invent claims the pages do not support.
Identify cuisineCodes (ISO) from page cuisine labels / descriptions. Include the context country only when it truly fits.
If page evidence is present and the cuisine country is not clearly attributable from those pages, set cuisineVerdict to "unclear" and cuisineCodes to [].
If page evidence clearly names other countries, set cuisineVerdict to "clear" and list those codes (do not keep the context country unless it also fits).
If page evidence is empty, set cuisineVerdict to "clear", improve carefully from the current JSON, and keep plausible existing codes.`,
    `Context cuisine country: ${input.countryName}${
      input.countryCode ? ` (${input.countryCode})` : ""
    }
Current order option JSON:
${JSON.stringify(input.option, null, 2)}

Page evidence from delivery / listing pages:
${formatPageEvidence(pageEvidence)}

Current cuisine codes: ${seedCodes.join(", ") || "none"}
Allowed cuisine codes (use only these): ${cuisineCodeReference()}

JSON shape:
{
  "notes": string,
  "name": string,
  "optionNotes": string?,
  "city": string?,
  "signatureDish": string?,
  "url": string?,
  "cuisineVerdict": "clear" | "unclear",
  "cuisineCodes": ["et", "er"]
}`,
  );
  const parsed = orderOptionRewriteSchema.parse(raw);
  const url =
    parsed.url && /^https?:\/\//i.test(parsed.url) ? parsed.url.trim() : undefined;
  let cuisineCodes = normalizeCountryCodes(parsed.cuisineCodes);
  let cuisineVerdict = parsed.cuisineVerdict;

  if (hadPageEvidence) {
    if (cuisineVerdict === "unclear" || cuisineCodes.length === 0) {
      cuisineVerdict = "unclear";
      cuisineCodes = [];
    }
  } else if (cuisineCodes.length === 0) {
    cuisineCodes = seedCodes;
    cuisineVerdict = "clear";
  }

  return {
    notes: parsed.notes,
    cuisineVerdict,
    cuisineCodes,
    hadPageEvidence,
    patch: {
      name: parsed.name.trim(),
      notes: parsed.optionNotes?.trim() || undefined,
      city: parsed.city?.trim() || undefined,
      signatureDish: parsed.signatureDish?.trim() || undefined,
      ...(url ? { url } : {}),
      ...(cuisineVerdict === "clear" && cuisineCodes.length > 0
        ? { cuisineCodes }
        : {}),
    },
  };
}

export async function rewriteRestaurantText(input: {
  countryName: string;
  countryCode?: string;
  existingCuisineCodes?: string[];
  restaurant: {
    name: string;
    address: string;
    city: string;
    website?: string | null;
    authenticityNotes?: string | null;
    /** Extra pages to scan (Tripadvisor, TheFork, evidence URLs). */
    evidenceUrls?: Array<string | null | undefined>;
  };
}): Promise<{
  notes: string;
  authenticityNotes: string;
  cuisineVerdict: "clear" | "unclear";
  cuisineCodes: string[];
  hadPageEvidence: boolean;
}> {
  const seedCodes = normalizeCountryCodes([
    ...(input.existingCuisineCodes ?? []),
    ...(input.countryCode ? [input.countryCode] : []),
  ]);
  const pageEvidence = await fetchPageEvidenceMany(
    [input.restaurant.website, ...(input.restaurant.evidenceUrls ?? [])],
    { maxPages: 3, deep: true },
  );
  const hadPageEvidence = pageEvidence.length > 0;
  const raw = await chatJson(
    `You write concise authenticity notes for restaurants in the Netherlands and identify which national cuisines they match.
Reply with JSON only.
Use fetched page text (official website, Tripadvisor, TheFork, etc. — title, description, snippet) as PRIMARY evidence.
Ground authenticityNotes in what those pages say about cuisine, specialties, and atmosphere. Prefer paraphrasing page claims over inventing.
Restaurants often span multiple countries (e.g. Levantine, Horn of Africa, Balkan, pan-Asian). List every ISO country code that genuinely fits the page evidence.
Do not invent weak matches — only countries a diner would reasonably expect from this place.
If the venue clearly serves a different cuisine than the context country, do NOT include the context country.
If page evidence is present and cuisine is not clearly attributable, set cuisineVerdict to "unclear" and cuisineCodes to [].
If page evidence clearly names matching countries, set cuisineVerdict to "clear" with those codes only.
If page evidence is empty, set cuisineVerdict to "clear" and improve carefully from current notes without inventing cuisine.`,
    `Context country (viewer may be browsing this cuisine — may be wrong): ${input.countryName}${
      input.countryCode ? ` (${input.countryCode})` : ""
    }
Restaurant: ${input.restaurant.name}
Address: ${input.restaurant.address}, ${input.restaurant.city}
Website: ${input.restaurant.website ?? "none"}
Page evidence:
${formatPageEvidence(pageEvidence)}
Current notes: ${input.restaurant.authenticityNotes ?? "none"}
Current cuisine codes: ${seedCodes.join(", ") || "none"}

Allowed cuisine codes (use only these): ${cuisineCodeReference()}

Write improved authenticity notes (2–4 sentences) covering the cuisines this place actually represents, grounded in the page evidence when available.
Set cuisineCodes to all matching countries (1–6) when clear. Include the context country only when it truly fits.

JSON shape:
{
  "notes": string,
  "authenticityNotes": string,
  "cuisineVerdict": "clear" | "unclear",
  "cuisineCodes": ["et", "er"]
}`,
  );
  const parsed = restaurantRewriteSchema.parse(raw);
  let cuisineCodes = normalizeCountryCodes(parsed.cuisineCodes);
  let cuisineVerdict = parsed.cuisineVerdict;

  if (hadPageEvidence) {
    if (cuisineVerdict === "unclear" || cuisineCodes.length === 0) {
      cuisineVerdict = "unclear";
      cuisineCodes = [];
    }
  } else if (cuisineCodes.length === 0) {
    cuisineCodes = seedCodes.length > 0 ? seedCodes : [];
    cuisineVerdict = "clear";
  }

  return {
    notes: parsed.notes,
    authenticityNotes: parsed.authenticityNotes,
    cuisineVerdict,
    cuisineCodes,
    hadPageEvidence,
  };
}

export async function researchRestaurantMenu(input: {
  countryName: string;
  countryCode?: string;
  knownCuisineCodes?: string[];
  restaurant: {
    name: string;
    address: string;
    city: string;
    website?: string | null;
  };
}): Promise<{
  notes: string;
  cuisineCodes: string[];
  items: Array<{
    id: string;
    name: string;
    localName?: string;
    description?: string;
    category?: "starter" | "main" | "side" | "dessert" | "snack" | "drink";
    priceEur?: number;
    cuisineCodes?: string[];
  }>;
}> {
  const seedCodes = normalizeCountryCodes([
    ...(input.countryCode ? [input.countryCode] : []),
    ...(input.knownCuisineCodes ?? []),
  ]);

  const raw = await chatJson(
    `You research restaurant menus in the Netherlands.
Reply with JSON only. Prefer dishes this specific restaurant is known to serve.
If the exact menu is unknown, list typical authentic dishes this venue would plausibly offer.
Aim for 8–25 items. Do not invent fake euro prices unless reasonably confident.

Restaurants may match multiple countries. Set top-level cuisineCodes to every ISO country this venue's food represents (not only the primary one).
For each dish, set cuisineCodes to the country flag(s) that should appear on that dish.
Use one code for most dishes; multiple only for clear fusion. Leave empty for generic drinks/bread/house extras.`,
    `Context country (viewer may be browsing this cuisine): ${input.countryName}${
      input.countryCode ? ` (${input.countryCode})` : ""
    }
Restaurant: ${input.restaurant.name}
Address: ${input.restaurant.address}, ${input.restaurant.city}
Website: ${input.restaurant.website ?? "unknown"}
Seed cuisine codes (include when still accurate, and add any others that fit): ${
      seedCodes.join(", ") || "none"
    }

Allowed cuisine codes (use only these): ${cuisineCodeReference()}

JSON shape:
{
  "notes": string,
  "cuisineCodes": ["lb", "sy"],
  "items": [{
    "name": string,
    "localName": string?,
    "description": string?,
    "category": "starter"|"main"|"side"|"dessert"|"snack"|"drink"?,
    "priceEur": number?,
    "cuisineCodes": ["lb"]
  }]
}`,
  );
  const parsed = restaurantMenuSchema.parse(raw);

  const used = new Set<string>();
  const items = parsed.items.map((item) => {
    let id = slugify(item.name) || "dish";
    if (used.has(id)) {
      let n = 2;
      while (used.has(`${id}-${n}`)) n += 1;
      id = `${id}-${n}`;
    }
    used.add(id);
    const itemCodes = normalizeCountryCodes(item.cuisineCodes);
    return {
      id,
      name: item.name,
      localName: item.localName,
      description: item.description,
      category: item.category,
      priceEur: item.priceEur,
      cuisineCodes: itemCodes.length > 0 ? itemCodes : undefined,
    };
  });

  let cuisineCodes = normalizeCountryCodes(parsed.cuisineCodes);
  if (cuisineCodes.length === 0) {
    const fromItems = new Set<string>();
    for (const item of items) {
      for (const code of item.cuisineCodes ?? []) fromItems.add(code);
    }
    cuisineCodes = Array.from(fromItems);
  }
  if (cuisineCodes.length === 0) {
    cuisineCodes = seedCodes;
  }
  if (cuisineCodes.length === 0 && input.countryCode) {
    cuisineCodes = [input.countryCode.toLowerCase()];
  }

  return { notes: parsed.notes, cuisineCodes, items };
}

export async function researchRestaurantScores(input: {
  countryName: string;
  restaurant: {
    name: string;
    address: string;
    city: string;
    website?: string | null;
    authenticityNotes?: string | null;
    authenticityRating?: number | null;
  };
}): Promise<{
  notes: string;
  priceLevel: 1 | 2 | 3 | 4;
  authenticityRating: number;
  authenticityNotes: string;
  ratings: {
    google?: {
      score: number;
      count?: number;
      scale?: 5 | 10;
      url?: string;
      fetchedAt: string;
    };
    tripadvisor?: {
      score: number;
      count?: number;
      scale?: 5 | 10;
      url?: string;
      fetchedAt: string;
    };
    theFork?: {
      score: number;
      count?: number;
      scale?: 5 | 10;
      url?: string;
      fetchedAt: string;
    };
  };
}> {
  const raw = await chatJson(
    `You research public guest ratings and price level for restaurants in the Netherlands.
Reply with JSON only. Use best-known Google, Tripadvisor, and The Fork scores when available.
Google and Tripadvisor use a 5-point scale; The Fork often uses 10 — set "scale" accordingly.
priceLevel is 1–4 (€ to €€€€).
Also refresh authenticityRating (1–5) and authenticityNotes for how well the place represents the cuisine.`,
    `Cuisine country: ${input.countryName}
Restaurant: ${input.restaurant.name}
Address: ${input.restaurant.address}, ${input.restaurant.city}
Website: ${input.restaurant.website ?? "unknown"}
Current authenticity rating: ${input.restaurant.authenticityRating ?? "none"}
Current authenticity notes: ${input.restaurant.authenticityNotes ?? "none"}

JSON shape:
{
  "notes": string,
  "priceLevel": 1|2|3|4,
  "authenticityRating": number,
  "authenticityNotes": string,
  "ratings": {
    "google": { "score": number, "count": number?, "scale": 5|10?, "url": string? }?,
    "tripadvisor": { "score": number, "count": number?, "scale": 5|10?, "url": string? }?,
    "theFork": { "score": number, "count": number?, "scale": 5|10?, "url": string? }?
  }
}`,
  );
  const parsed = restaurantScoresSchema.parse(raw);
  const fetchedAt = new Date().toISOString();
  const stamp = (
    value:
      | {
          score: number;
          count?: number;
          scale?: 5 | 10;
          url?: string;
        }
      | undefined,
  ) =>
    value
      ? {
          score: value.score,
          count: value.count,
          scale: value.scale,
          url: value.url,
          fetchedAt,
        }
      : undefined;

  return {
    notes: parsed.notes,
    priceLevel: parsed.priceLevel,
    authenticityRating: Math.round(parsed.authenticityRating * 10) / 10,
    authenticityNotes: parsed.authenticityNotes,
    ratings: {
      google: stamp(parsed.ratings.google),
      tripadvisor: stamp(parsed.ratings.tripadvisor),
      theFork: stamp(parsed.ratings.theFork),
    },
  };
}

export async function discoverItemImageQueries(input: {
  kind: "recipe" | "restaurant" | "drink";
  countryName: string;
  title: string;
  detail?: string;
}): Promise<{ notes: string; searchQueries: string[] }> {
  const subject =
    input.kind === "drink" ? "drink" : input.kind === "recipe" ? "dish" : "restaurant";
  const guidance =
    input.kind === "drink"
      ? `Emphasize that we are looking for a DRINK (beverage), not food.
Prefer bottle, glass, cup, can, or poured-drink photos.
Do not suggest queries that would find plated meals, food close-ups, ingredients-only shots, or restaurant interiors.
Every search query must clearly target a drink photo (include words like drink, bottle, glass, cocktail, beer, wine, tea, or coffee as appropriate).`
      : input.kind === "recipe"
        ? `Emphasize that we are looking for a DISH (plated food), not a drink.
Prefer plated meal or cooked-food photos.
Do not suggest queries that would find bottles, beverage glasses, cans, or drink pours.
Every search query must clearly target a food dish photo (include words like dish, food, plate, or cuisine as appropriate).`
        : `Emphasize that we are looking for a RESTAURANT venue photo.
Prefer the restaurant exterior, dining room, or storefront.
Do not suggest logos, maps, or unrelated stock food shots.`;

  const raw = await chatJson(
    `You help find Wikimedia Commons photos.
Reply with JSON only. Prefer real photo search queries, not logos or maps.
${guidance}`,
    `Kind: ${input.kind} (${subject})
Country/cuisine: ${input.countryName}
Title: ${input.title}
Detail: ${input.detail ?? "none"}

Suggest 3–5 Wikimedia Commons search queries for a good photo of this ${subject}.

JSON shape:
{
  "notes": string,
  "searchQueries": string[]
}`,
  );
  return itemImageQueriesSchema.parse(raw);
}

const dinnerComposeSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(40),
  courses: z
    .array(
      z.object({
        recipeId: z.string().min(1),
        role: z.enum(["starter", "main", "side", "dessert", "snack", "extra"]),
        note: optionalString,
      }),
    )
    .min(3)
    .max(6),
  drinks: z
    .array(
      z.object({
        drinkName: z.string().min(1),
        note: optionalString,
      }),
    )
    .min(0)
    .max(6),
});

/**
 * Compose a 3–5 course “perfect taste” dinner from existing recipes + drinks.
 */
export async function composeDinnerSuggestion(input: {
  countryCode: string;
  countryName: string;
  introduction?: string;
  recipes: Array<{
    id: string;
    name: string;
    localName?: string;
    description: string;
    category: string;
  }>;
  drinks: Array<{
    name: string;
    localName?: string;
    type: string;
    alcoholic: boolean;
    description: string;
  }>;
}): Promise<{
  notes: string;
  dinner: import("../../src/types/content.ts").DinnerSuggestion;
}> {
  if (input.recipes.length < 3) {
    throw new Error("Need at least 3 recipes to compose a dinner.");
  }
  if (input.drinks.length < 1) {
    throw new Error("Need at least 1 drink to compose a dinner.");
  }

  const raw = await chatJson(
    `You curate one memorable home dinner that captures the soul of a national cuisine.
Reply with JSON only.

Rules:
- Pick 3–5 courses from the provided recipe list only (use exact recipeId values).
- Prefer a natural arc: starter → main → side and/or dessert (snack allowed).
- Include 1–3 drink suggestions from the provided drink names only (exact drinkName).
- Write a warm, specific description (why this dinner tastes like the country) — not generic tourism copy.
- Per-course notes must be 2–4 sentence story beats that flow from course to course (prose, not card blurbs).
- Per-drink notes: short (when to pour / how it pairs).`,
    `Country: ${input.countryName} (${input.countryCode})
Introduction: ${input.introduction ?? "n/a"}

Available recipes:
${JSON.stringify(input.recipes, null, 2)}

Available drinks:
${JSON.stringify(input.drinks, null, 2)}

JSON shape:
{
  "notes": string,
  "title": string,
  "description": string,
  "courses": [{"recipeId": string, "role": "starter"|"main"|"side"|"dessert"|"snack"|"extra", "note": string?}],
  "drinks": [{"drinkName": string, "note": string?}]
}`,
  );

  const parsed = z
    .object({
      notes: z.string(),
      ...dinnerComposeSchema.shape,
    })
    .parse(raw);

  const recipeIds = new Set(input.recipes.map((recipe) => recipe.id));
  const drinkNames = new Set(input.drinks.map((drink) => drink.name.toLowerCase()));

  const courses = parsed.courses.filter((course) => recipeIds.has(course.recipeId));
  if (courses.length < 3) {
    throw new Error("Dinner composition referenced too few valid recipes.");
  }

  const drinks = parsed.drinks
    .map((drink) => {
      const match = input.drinks.find(
        (item) => item.name.toLowerCase() === drink.drinkName.toLowerCase(),
      );
      if (!match) return null;
      return {
        drinkName: match.name,
        note: drink.note,
      };
    })
    .filter((drink): drink is { drinkName: string; note?: string } => Boolean(drink));

  if (drinks.length === 0) {
    // Fall back to first drink if the model invented names.
    const first = input.drinks[0]!;
    drinks.push({
      drinkName: first.name,
      note: "A classic pour with this cuisine.",
    });
  }

  void drinkNames;

  return {
    notes: parsed.notes,
    dinner: {
      title: parsed.title,
      description: parsed.description,
      courses: courses.slice(0, 5).map((course) => ({
        recipeId: course.recipeId,
        role: course.role,
        note: course.note,
      })),
      drinks: drinks.slice(0, 4),
      composedAt: new Date().toISOString(),
    },
  };
}

/**
 * Rewrite title + narrative for a dinner whose courses are already chosen.
 * Used after swapping a course so the story stays coherent.
 */
export async function rewriteDinnerNarrative(input: {
  countryCode: string;
  countryName: string;
  introduction?: string;
  title?: string;
  courses: Array<{
    recipeId: string;
    role: string;
    name: string;
    localName?: string;
    description: string;
  }>;
  drinks: Array<{
    name: string;
    localName?: string;
    type: string;
    alcoholic: boolean;
    description: string;
    note?: string;
  }>;
}): Promise<import("../../src/types/content.ts").DinnerSuggestion> {
  if (input.courses.length < 1) {
    throw new Error("Need at least one course to rewrite dinner narrative.");
  }

  const raw = await chatJson(
    `You write a warm, logical dinner story for a home cook discovering a national cuisine.
Reply with JSON only.

Rules:
- Keep the given course order and recipeId values exactly.
- Keep drinkName values exactly as provided (or omit a drink only if absurd).
- description: 2–4 sentences that open the evening — the mood of the table, not a list.
- Each course note: 2–4 sentences that continue the story. Explain how this course follows the previous one, what it tastes like, and why it belongs. Write prose, not card blurbs or marketing bullets.
- Drink notes: 1–2 sentences on when to pour them during the meal.
- title: short and evocative (not “Traditional X dinner”).
- Do not invent dishes that are not listed.`,
    `Country: ${input.countryName} (${input.countryCode})
Introduction: ${input.introduction ?? "n/a"}
Previous title (optional inspiration): ${input.title ?? "n/a"}

Courses in order:
${JSON.stringify(input.courses, null, 2)}

Drinks:
${JSON.stringify(input.drinks, null, 2)}

JSON shape:
{
  "title": string,
  "description": string,
  "courses": [{"recipeId": string, "role": "starter"|"main"|"side"|"dessert"|"snack"|"extra", "note": string}],
  "drinks": [{"drinkName": string, "note": string}]
}`,
  );

  const parsed = dinnerComposeSchema.parse(raw);
  const courseIds = new Set(input.courses.map((course) => course.recipeId));
  const courses = parsed.courses
    .filter((course) => courseIds.has(course.recipeId))
    .map((course) => {
      const source = input.courses.find((item) => item.recipeId === course.recipeId)!;
      return {
        recipeId: course.recipeId,
        role: (course.role || source.role) as
          "starter" | "main" | "side" | "dessert" | "snack" | "extra",
        note: course.note,
      };
    });

  // Preserve order from the selected menu if the model shuffles.
  const ordered = input.courses.map((source) => {
    const rewritten = courses.find((course) => course.recipeId === source.recipeId);
    return (
      rewritten ?? {
        recipeId: source.recipeId,
        role: source.role as "starter" | "main" | "side" | "dessert" | "snack" | "extra",
        note: source.description.slice(0, 180),
      }
    );
  });

  const drinks = parsed.drinks
    .map((drink) => {
      const match = input.drinks.find(
        (item) => item.name.toLowerCase() === drink.drinkName.toLowerCase(),
      );
      if (!match) return null;
      return { drinkName: match.name, note: drink.note };
    })
    .filter((drink): drink is { drinkName: string; note?: string } => Boolean(drink));

  if (drinks.length === 0 && input.drinks[0]) {
    drinks.push({
      drinkName: input.drinks[0].name,
      note: input.drinks[0].note ?? "Pour this alongside the main course.",
    });
  }

  return {
    title: parsed.title,
    description: parsed.description,
    courses: ordered,
    drinks: drinks.slice(0, 4),
    composedAt: new Date().toISOString(),
  };
}
