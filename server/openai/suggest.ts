import { z } from "zod";
import type { Drink, Recipe, SpecialtyShop } from "../../src/types/content.ts";
import type { RestaurantSubmissionPayload } from "../db/submissions.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const optionalString = z
  .string()
  .nullish()
  .transform((value) => {
    if (value == null) return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

const recipeDraftSchema = z.object({
  found: z.boolean(),
  confirmationNotes: z.string(),
  recipe: z
    .object({
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
      substitutions: z
        .array(z.string())
        .nullish()
        .transform((v) => v ?? undefined),
      servingSuggestion: optionalString,
      drinkPairing: optionalString,
    })
    .nullable(),
});

const restaurantDraftSchema = z.object({
  found: z.boolean(),
  confirmationNotes: z.string(),
  restaurant: z
    .object({
      name: z.string().min(1),
      address: z.string().min(1),
      city: z.string().min(1),
      postcode: optionalString,
      website: optionalString,
      mapsUrl: optionalString,
      lat: z.coerce.number().nullish().transform((v) => v ?? undefined),
      lng: z.coerce.number().nullish().transform((v) => v ?? undefined),
      authenticityNotes: optionalString,
      phone: optionalString,
    })
    .nullable(),
});

export type RecipePreview = {
  found: boolean;
  confirmationNotes: string;
  recipe: Omit<Recipe, "id"> | null;
};

export type RestaurantPreview = {
  found: boolean;
  confirmationNotes: string;
  restaurant: RestaurantSubmissionPayload | null;
};

export type DrinkPreview = {
  found: boolean;
  confirmationNotes: string;
  drink: Omit<Drink, "id"> | null;
};

export type ShopPreview = {
  found: boolean;
  confirmationNotes: string;
  shop: Omit<SpecialtyShop, "id"> | null;
};

const drinkDraftSchema = z.object({
  found: z.boolean(),
  confirmationNotes: z.string(),
  drink: z
    .object({
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
    })
    .nullable(),
});

const shopDraftSchema = z.object({
  found: z.boolean(),
  confirmationNotes: z.string(),
  shop: z
    .object({
      name: z.string().min(1),
      city: z.string().min(1),
      address: z.string().min(1),
      specialty: z.string().min(8),
      website: optionalString,
      mapsUrl: optionalString,
      notes: optionalString,
    })
    .nullable(),
});

function getApiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export async function chatJson(system: string, user: string): Promise<unknown> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to .env to enable suggestions.",
    );
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body.slice(0, 280)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error("OpenAI returned an empty response.");
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error(
      "OpenAI returned invalid JSON. Try a narrower search (e.g. street food).",
    );
  }
}

export function isOpenAiConfigured(): boolean {
  return Boolean(getApiKey());
}

export async function previewRecipeSuggestion(input: {
  countryCode: string;
  countryName: string;
  query: string;
}): Promise<RecipePreview> {
  const raw = await chatJson(
    `You research authentic dishes for a food app. Reply with JSON only.
If the query is not a real dish (or not tied to the given cuisine), set found=false and recipe=null.
If found, return a practical home-cook recipe for Dutch kitchens.
confirmationNotes: 1-2 short sentences confirming what you found and why it fits.
Use metric units. Keep steps concrete. description at least 40 characters.`,
    `Country: ${input.countryName} (${input.countryCode})
User query (dish name or short description): ${input.query}

JSON shape:
{
  "found": boolean,
  "confirmationNotes": string,
  "recipe": null | {
    "name": string,
    "localName": string | omit,
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
  }
}`,
  );

  const parsed = recipeDraftSchema.parse(raw);
  if (!parsed.found || !parsed.recipe) {
    return {
      found: false,
      confirmationNotes: parsed.confirmationNotes,
      recipe: null,
    };
  }

  return {
    found: true,
    confirmationNotes: parsed.confirmationNotes,
    recipe: {
      ...parsed.recipe,
      description:
        parsed.recipe.description.length >= 40
          ? parsed.recipe.description
          : `${parsed.recipe.description} A traditional dish from ${input.countryName} cuisine.`,
    },
  };
}

export async function previewRestaurantSuggestion(input: {
  countryCode: string;
  countryName: string;
  query: string;
}): Promise<RestaurantPreview> {
  const raw = await chatJson(
    `You research restaurants in the Netherlands that serve a given national cuisine.
Reply with JSON only. Prefer real places when you know them; otherwise propose a best-effort match from the query and mark uncertainty in confirmationNotes.
If the query is nonsense or clearly not a restaurant, set found=false and restaurant=null.
mapsUrl should be a Google Maps search URL for the place in the Netherlands.
City should be in the Netherlands.`,
    `Cuisine country: ${input.countryName} (${input.countryCode})
User query (restaurant name or short description): ${input.query}

JSON shape:
{
  "found": boolean,
  "confirmationNotes": string,
  "restaurant": null | {
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
  }
}`,
  );

  const parsed = restaurantDraftSchema.parse(raw);
  if (!parsed.found || !parsed.restaurant) {
    return {
      found: false,
      confirmationNotes: parsed.confirmationNotes,
      restaurant: null,
    };
  }

  const place = parsed.restaurant;
  const website =
    place.website && /^https?:\/\//i.test(place.website)
      ? place.website
      : undefined;
  const fallbackMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${place.name} ${place.address} ${place.city} Netherlands`,
  )}`;
  let mapsUrl = fallbackMaps;
  if (place.mapsUrl && /^https?:\/\//i.test(place.mapsUrl)) {
    try {
      const host = new URL(place.mapsUrl).hostname.toLowerCase();
      const short =
        host === "goo.gl" ||
        host.endsWith(".goo.gl") ||
        host === "g.co" ||
        host === "maps.app.goo.gl";
      if (!short) mapsUrl = place.mapsUrl;
    } catch {
      mapsUrl = fallbackMaps;
    }
  }

  return {
    found: true,
    confirmationNotes: parsed.confirmationNotes,
    restaurant: {
      name: place.name,
      address: place.address,
      city: place.city,
      postcode: place.postcode ?? undefined,
      website,
      mapsUrl,
      lat: place.lat ?? undefined,
      lng: place.lng ?? undefined,
      authenticityNotes:
        place.authenticityNotes ??
        `Community suggestion for ${input.countryName} cuisine (pending review).`,
      phone: place.phone ?? undefined,
    },
  };
}

export async function previewDrinkSuggestion(input: {
  countryCode: string;
  countryName: string;
  query: string;
}): Promise<DrinkPreview> {
  const raw = await chatJson(
    `You research authentic drinks for a food app. Reply with JSON only.
If the query is not a real drink tied to the given cuisine/culture, set found=false and drink=null.
Prefer traditional or iconic beverages (alcoholic or non-alcoholic).
confirmationNotes: 1-2 short sentences confirming what you found and why it fits.
description at least 40 characters.`,
    `Country: ${input.countryName} (${input.countryCode})
User query (drink name or short description): ${input.query}

JSON shape:
{
  "found": boolean,
  "confirmationNotes": string,
  "drink": null | {
    "name": string,
    "localName": string?,
    "type": "beer"|"wine"|"spirit"|"cocktail"|"soft-drink"|"tea"|"coffee",
    "alcoholic": boolean,
    "description": string,
    "grape": string?,
    "foodPairing": string?
  }
}`,
  );

  const parsed = drinkDraftSchema.parse(raw);
  if (!parsed.found || !parsed.drink) {
    return {
      found: false,
      confirmationNotes: parsed.confirmationNotes,
      drink: null,
    };
  }

  return {
    found: true,
    confirmationNotes: parsed.confirmationNotes,
    drink: {
      ...parsed.drink,
      description:
        parsed.drink.description.length >= 40
          ? parsed.drink.description
          : `${parsed.drink.description} A traditional drink from ${input.countryName}.`,
    },
  };
}

export async function previewShopSuggestion(input: {
  countryCode: string;
  countryName: string;
  query: string;
}): Promise<ShopPreview> {
  const raw = await chatJson(
    `You research specialty grocery shops in the Netherlands that sell ingredients for a given national cuisine.
Reply with JSON only. Prefer real shops when you know them; otherwise propose a best-effort match and mark uncertainty in confirmationNotes.
If the query is nonsense or clearly not a shop, set found=false and shop=null.
City and address must be in the Netherlands.
mapsUrl should be a Google Maps search URL.
specialty should describe what they sell for this cuisine.`,
    `Cuisine country: ${input.countryName} (${input.countryCode})
User query (shop name or short description): ${input.query}

JSON shape:
{
  "found": boolean,
  "confirmationNotes": string,
  "shop": null | {
    "name": string,
    "city": string,
    "address": string,
    "specialty": string,
    "website": string?,
    "mapsUrl": string?,
    "notes": string?
  }
}`,
  );

  const parsed = shopDraftSchema.parse(raw);
  if (!parsed.found || !parsed.shop) {
    return {
      found: false,
      confirmationNotes: parsed.confirmationNotes,
      shop: null,
    };
  }

  const shop = parsed.shop;
  const website =
    shop.website && /^https?:\/\//i.test(shop.website)
      ? shop.website
      : undefined;
  const fallbackMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${shop.name} ${shop.address} ${shop.city} Netherlands`,
  )}`;
  let mapsUrl = fallbackMaps;
  if (shop.mapsUrl && /^https?:\/\//i.test(shop.mapsUrl)) {
    try {
      const host = new URL(shop.mapsUrl).hostname.toLowerCase();
      const short =
        host === "goo.gl" ||
        host.endsWith(".goo.gl") ||
        host === "g.co" ||
        host === "maps.app.goo.gl";
      if (!short) mapsUrl = shop.mapsUrl;
    } catch {
      mapsUrl = fallbackMaps;
    }
  }

  return {
    found: true,
    confirmationNotes: parsed.confirmationNotes,
    shop: {
      name: shop.name,
      city: shop.city,
      address: shop.address,
      specialty: shop.specialty,
      website,
      mapsUrl,
      notes: shop.notes,
    },
  };
}
