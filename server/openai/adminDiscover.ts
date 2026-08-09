import { z } from "zod";
import type { Drink, Recipe, SpecialtyShop } from "../../src/types/content.ts";
import { countryCatalog } from "../../src/content/countries/catalog.ts";
import { OSM_CUISINE_BY_COUNTRY } from "../../src/restaurants/osmCuisineMap.ts";
import {
  isGooglePlacesConfigured,
  lookupGoogleRestaurant,
} from "../lib/googlePlacesLookup.ts";
import { findCuisineImageFromQueries } from "../lib/wikimedia.ts";
import { chatJson, isOpenAiConfigured } from "./suggest.ts";

export { isOpenAiConfigured };

/** OpenAI often returns null for omitted optional fields. */
const optionalString = z.string().nullish().transform((value) => value ?? undefined);
const optionalNumber = z.number().nullish().transform((value) => value ?? undefined);
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
  const byCode = new Map(
    countryCatalog.map((entry) => [entry.code, entry.name] as const),
  );
  return Object.keys(OSM_CUISINE_BY_COUNTRY)
    .map((code) => {
      const name = byCode.get(code);
      return name ? `${code}=${name}` : code;
    })
    .join(", ");
}

const recipeItemSchema = z.object({
  name: z.string().min(1),
  localName: optionalString,
  description: z.string().min(20),
  category: z.enum(["starter", "main", "side", "dessert", "snack"]),
  servings: z.coerce.number().int().positive(),
  prepMinutes: z.coerce.number().int().nonnegative(),
  cookMinutes: z.coerce.number().int().nonnegative(),
  difficulty: z.enum(["easy", "medium", "challenging"]),
  dietaryLabels: z.array(z.string()).nullish().transform((v) => v ?? []),
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
});

const recipesDiscoverSchema = z.object({
  notes: z.string(),
  recipes: z.array(dishCandidateSchema).min(1).max(20),
});

const restaurantItemSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  postcode: optionalString,
  website: optionalString,
  mapsUrl: optionalString,
  lat: optionalNumber,
  lng: optionalNumber,
  authenticityNotes: optionalString,
  phone: optionalString,
});

const restaurantsDiscoverSchema = z.object({
  notes: z.string(),
  restaurants: z.array(restaurantItemSchema).min(1).max(20),
});

const restaurantVerifyItemSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  accept: z.boolean(),
  authenticityRating: z.coerce.number().min(1).max(5),
  authenticityNotes: z.string().min(20),
  reason: optionalString,
});

const restaurantsVerifySchema = z.object({
  notes: z.string(),
  verifications: z.array(restaurantVerifyItemSchema).min(1).max(20),
});

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

const drinkItemSchema = z.object({
  name: z.string().min(1),
  localName: optionalString,
  type: z.enum([
    "beer",
    "wine",
    "spirit",
    "cocktail",
    "soft-drink",
    "tea",
    "coffee",
  ]),
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
  authenticityNotes?: string;
  authenticityRating?: number;
  phone?: string;
  verified?: boolean;
};

export type DishCandidate = {
  id: string;
  name: string;
  localName?: string;
  description: string;
  category: Recipe["category"];
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
Avoid duplicates of existing dish names. Return dish candidates only (no full recipes).`,
    `Country: ${input.countryName} (${input.countryCode})
Existing dishes (do not repeat): ${existing.join("; ") || "none"}
${focus}

Return up to 15 distinct dishes (quality over quantity).

JSON shape:
{
  "notes": string,
  "recipes": [{
    "name": string,
    "localName": string?,
    "description": string,
    "category": "starter"|"main"|"side"|"dessert"|"snack"
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
Use metric units. Keep steps concrete. description at least 40 characters.`,
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
    "servings": number,
    "prepMinutes": number,
    "cookMinutes": number,
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
}): Promise<{ notes: string; restaurants: DiscoveredRestaurant[] }> {
  const focus = input.query?.trim()
    ? `Focus on: ${input.query.trim()}`
    : "Prefer family-run or chef-driven specialists that mainly serve this cuisine.";

  const raw = await chatJson(
    `You research REAL restaurants in the Netherlands that specialise in one national cuisine.
Reply with JSON only.

Strict rules:
- Only name places you are confident actually exist at that address today.
- Prefer authentic specialists (national/regional cuisine as the main offering), not generic "world food", all-you-can-eat, hotel restaurants, or casual chains.
- Reject fusion-only, pan-Asian (unless the cuisine IS pan-Asian), pizza/kebab takeaways, and places whose menu is mostly Dutch/international.
- City must be in the Netherlands. Give a real street address when known.
- Never invent goo.gl or short Maps links — omit mapsUrl if unsure.
- Prefer quality over quantity: fewer authentic places beat a long weak list.
- If unsure a place is a true specialist for this cuisine, omit it.`,
    `Cuisine country: ${input.countryName} (${input.countryCode})
${focus}

Return up to 10 specialist restaurants you are confident about.

JSON shape:
{
  "notes": string,
  "restaurants": [{
    "name": string,
    "address": string,
    "city": string,
    "postcode": string?,
    "website": string?,
    "mapsUrl": string?,
    "lat": number?,
    "lng": number?,
    "authenticityNotes": string?,
    "phone": string?
  }]
}`,
  );

  const parsed = restaurantsDiscoverSchema.parse(raw);
  const placesConfigured = isGooglePlacesConfigured();

  // 1) Ground each candidate in Google Places (existence + address).
  const grounded: DiscoveredRestaurant[] = [];
  let placesMisses = 0;
  for (const place of parsed.restaurants) {
    let match: Awaited<ReturnType<typeof lookupGoogleRestaurant>> = null;
    if (placesConfigured) {
      try {
        match = await lookupGoogleRestaurant({
          name: place.name,
          city: place.city,
          address: place.address,
        });
      } catch (error) {
        console.warn(
          `Places verify failed for ${place.name} (${place.city})`,
          error,
        );
      }
    }

    if (placesConfigured && !match) {
      placesMisses += 1;
      continue;
    }

    const name = match?.name ?? place.name;
    const address = match?.address ?? place.address;
    const city = match?.city ?? place.city;
    const website =
      match?.website && /^https?:\/\//i.test(match.website)
        ? match.website
        : place.website && /^https?:\/\//i.test(place.website)
          ? place.website
          : undefined;
    const mapsUrl = stableMapsUrl(match?.mapsUrl ?? place.mapsUrl, {
      name,
      address,
      city,
    });

    grounded.push({
      name,
      address,
      city,
      postcode: match?.postcode ?? place.postcode,
      website,
      mapsUrl,
      lat: match?.lat ?? place.lat,
      lng: match?.lng ?? place.lng,
      authenticityNotes: place.authenticityNotes,
      phone: match?.phone ?? place.phone,
      verified: Boolean(match),
    });
  }

  if (grounded.length === 0) {
    return {
      notes: placesConfigured
        ? `${parsed.notes} None of the candidates could be verified on Google Places in the Netherlands (${placesMisses} rejected). Try a tighter city or specialist focus.`
        : `${parsed.notes} No candidates survived filtering. Set GOOGLE_PLACES_API_KEY to verify places, or try a different focus.`,
      restaurants: [],
    };
  }

  // 2) Authenticity gate — drop false positives / weak matches.
  const verification = await verifyRestaurantAuthenticity({
    countryCode: input.countryCode,
    countryName: input.countryName,
    restaurants: grounded,
  });

  const rejected = grounded.length - verification.restaurants.length;
  const parts = [parsed.notes, verification.notes].filter(Boolean);
  if (!placesConfigured) {
    parts.push(
      "GOOGLE_PLACES_API_KEY is not set — candidates were authenticity-checked only. Set the key to verify places exist in Google.",
    );
  }
  if (placesConfigured && placesMisses > 0) {
    parts.push(
      `Dropped ${placesMisses} candidate(s) that Google Places could not confirm in the Netherlands.`,
    );
  }
  if (rejected > 0) {
    parts.push(
      `Dropped ${rejected} candidate(s) that failed the authenticity check.`,
    );
  }
  if (verification.restaurants.length === 0) {
    parts.push(
      "No authentic specialists remained after verification. Try another city or a more specific query.",
    );
  }

  return {
    notes: parts.join(" "),
    restaurants: verification.restaurants,
  };
}

async function verifyRestaurantAuthenticity(input: {
  countryCode: string;
  countryName: string;
  restaurants: DiscoveredRestaurant[];
}): Promise<{ notes: string; restaurants: DiscoveredRestaurant[] }> {
  if (input.restaurants.length === 0) {
    return { notes: "", restaurants: [] };
  }

  const listing = input.restaurants
    .map(
      (place, index) =>
        `${index + 1}. ${place.name} — ${place.address}, ${place.city}` +
        (place.website ? ` — ${place.website}` : ""),
    )
    .join("\n");

  const raw = await chatJson(
    `You verify whether restaurants in the Netherlands are authentic specialists for a given national cuisine.
Reply with JSON only.

Accept only when the place mainly serves that cuisine (or a closely related regional cuisine diners would expect under that flag).
Reject: wrong cuisine, generic Asian/Mediterranean, fusion-first concepts, hotel restaurants, chains with token dishes, closed/unknown venues, or places you are not confident about.
authenticityRating 1–5 (only accept if rating >= 3). authenticityNotes must explain why it is (or is not) authentic.`,
    `Cuisine country: ${input.countryName} (${input.countryCode})

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
  for (const place of input.restaurants) {
    const key = `${place.name.trim().toLowerCase()}|${place.city.trim().toLowerCase()}`;
    let verdict = byKey.get(key);
    if (!verdict) {
      // Fuzzy fallback: match by name only.
      verdict = parsed.verifications.find(
        (item) =>
          item.name.trim().toLowerCase() === place.name.trim().toLowerCase(),
      );
    }
    if (!verdict?.accept) continue;
    if (verdict.authenticityRating < 3) continue;
    accepted.push({
      ...place,
      authenticityRating: Math.round(verdict.authenticityRating * 10) / 10,
      authenticityNotes: verdict.authenticityNotes,
      verified: true,
    });
  }

  return { notes: parsed.notes, restaurants: accepted };
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
        shop.website && /^https?:\/\//i.test(shop.website)
          ? shop.website
          : undefined;
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

  const parsed = drinksDiscoverSchema.parse(raw);
  const drinks: Drink[] = [];

  for (const item of parsed.drinks) {
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

  return { notes: parsed.notes, drinks };
}

export function drinkImageSearchQueries(
  drink: Drink,
  countryName: string,
): string[] {
  const name = drink.name;
  switch (drink.type) {
    case "beer":
      return [
        `${name} beer bottle`,
        `${name} beer can`,
        `${name} ${countryName} beer`,
      ];
    case "wine":
      return [
        `${name} wine bottle`,
        `${drink.grape ?? name} wine bottle`,
        `${name} ${countryName} wine`,
      ];
    case "spirit":
      return [
        `${name} bottle`,
        `${name} spirit bottle`,
        `${name} ${countryName}`,
      ];
    case "cocktail":
      return [
        `${name} cocktail`,
        `${name} drink glass`,
        `${name} cocktail glass`,
      ];
    case "tea":
      return [`${name} tea`, `${name} tea cup`, `${name} ${countryName} tea`];
    case "coffee":
      return [
        `${name} coffee`,
        `${name} coffee cup`,
        `${name} ${countryName} coffee`,
      ];
    case "soft-drink":
    default:
      return [
        `${name} bottle`,
        `${name} can`,
        `${name} drink`,
        `${name} ${countryName}`,
      ];
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
  priceLevel: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
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
    .enum([
      "beer",
      "wine",
      "spirit",
      "cocktail",
      "soft-drink",
      "tea",
      "coffee",
    ])
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
    parsed.website && /^https?:\/\//i.test(parsed.website)
      ? parsed.website
      : undefined;
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

export async function rewriteRestaurantText(input: {
  countryName: string;
  countryCode?: string;
  existingCuisineCodes?: string[];
  restaurant: {
    name: string;
    address: string;
    city: string;
    authenticityNotes?: string | null;
  };
}): Promise<{
  notes: string;
  authenticityNotes: string;
  cuisineCodes: string[];
}> {
  const seedCodes = normalizeCountryCodes([
    ...(input.countryCode ? [input.countryCode] : []),
    ...(input.existingCuisineCodes ?? []),
  ]);
  const raw = await chatJson(
    `You write concise authenticity notes for restaurants in the Netherlands and identify which national cuisines they match.
Reply with JSON only.
Restaurants often span multiple countries (e.g. Levantine, Horn of Africa, Balkan, pan-Asian). List every ISO country code that genuinely fits.
Do not invent weak matches — only countries a diner would reasonably expect from this place.`,
    `Context country (viewer may be browsing this cuisine): ${input.countryName}${
      input.countryCode ? ` (${input.countryCode})` : ""
    }
Restaurant: ${input.restaurant.name}
Address: ${input.restaurant.address}, ${input.restaurant.city}
Current notes: ${input.restaurant.authenticityNotes ?? "none"}
Current cuisine codes: ${seedCodes.join(", ") || "none"}

Allowed cuisine codes (use only these): ${cuisineCodeReference()}

Write improved authenticity notes (2–4 sentences) covering the cuisines this place actually represents.
Set cuisineCodes to all matching countries (1–6). Include the context country when it fits.

JSON shape:
{
  "notes": string,
  "authenticityNotes": string,
  "cuisineCodes": ["et", "er"]
}`,
  );
  const parsed = restaurantRewriteSchema.parse(raw);
  let cuisineCodes = normalizeCountryCodes(parsed.cuisineCodes);
  if (cuisineCodes.length === 0) {
    cuisineCodes = seedCodes.length > 0 ? seedCodes : [];
  }
  if (
    input.countryCode &&
    !cuisineCodes.includes(input.countryCode.toLowerCase())
  ) {
    // Keep the page country if the model omitted it but notes still concern it.
    cuisineCodes = [
      input.countryCode.toLowerCase(),
      ...cuisineCodes,
    ];
  }
  return {
    notes: parsed.notes,
    authenticityNotes: parsed.authenticityNotes,
    cuisineCodes,
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
  for (const code of seedCodes) {
    if (!cuisineCodes.includes(code)) cuisineCodes.push(code);
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
    input.kind === "drink"
      ? "drink"
      : input.kind === "recipe"
        ? "dish"
        : "restaurant";
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
}): Promise<{ notes: string; dinner: import("../../src/types/content.ts").DinnerSuggestion }> {
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
  const drinkNames = new Set(
    input.drinks.map((drink) => drink.name.toLowerCase()),
  );

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
    .filter((drink): drink is { drinkName: string; note?: string } =>
      Boolean(drink),
    );

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
          | "starter"
          | "main"
          | "side"
          | "dessert"
          | "snack"
          | "extra",
        note: course.note,
      };
    });

  // Preserve order from the selected menu if the model shuffles.
  const ordered = input.courses.map((source) => {
    const rewritten = courses.find((course) => course.recipeId === source.recipeId);
    return (
      rewritten ?? {
        recipeId: source.recipeId,
        role: source.role as
          | "starter"
          | "main"
          | "side"
          | "dessert"
          | "snack"
          | "extra",
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
    .filter((drink): drink is { drinkName: string; note?: string } =>
      Boolean(drink),
    );

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
