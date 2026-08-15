import { z } from "zod";
import type { Drink, Recipe, SpecialtyShop } from "../../src/types/content.ts";
import {
  insertDrinkSubmission,
  insertRecipeSubmission,
  insertRestaurantSubmission,
  insertShopSubmission,
  listSubmissions,
  listVisibleDrinksForCountry,
  listVisibleRecipesForCountry,
  listVisibleShopsForCountry,
  setDrinkSubmissionStatus,
  setRecipeSubmissionStatus,
  setRestaurantRowReviewed,
  setRestaurantSubmissionStatus,
  setShopSubmissionStatus,
  slugifyId,
  type RestaurantSubmissionPayload,
  type SubmissionKind,
  type SubmissionStatus,
} from "../db/submissions.ts";
import {
  isGooglePlacesConfigured,
  lookupGoogleRestaurant,
  officialWebsiteOrUndefined,
} from "../lib/googlePlacesLookup.ts";
import {
  isOpenAiConfigured,
  previewDrinkSuggestion,
  previewRecipeSuggestion,
  previewRestaurantSuggestion,
  previewShopSuggestion,
} from "../openai/suggest.ts";
import { upsertRestaurant } from "../db/restaurants.ts";
import { recordProductEvent } from "../db/analytics.ts";
import { osmTagsForCountry } from "../../src/restaurants/osmCuisineMap.ts";
import { requireAdmin } from "./auth.ts";

const previewBodySchema = z.object({
  kind: z.enum(["recipe", "restaurant", "drink", "shop"]),
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  query: z.string().min(2).max(280),
});

const optionalUrl = z
  .union([z.string().url(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

const recipeConfirmSchema = z.object({
  kind: z.literal("recipe"),
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  query: z.string().min(2).max(280),
  confirmationNotes: z.string().optional(),
  recipe: z.object({
    name: z.string().min(1),
    localName: optionalText,
    description: z.string().min(20),
    category: z.enum(["starter", "main", "side", "dessert", "snack"]),
    servings: z.coerce.number().int().positive(),
    prepMinutes: z.coerce.number().int().nonnegative(),
    cookMinutes: z.coerce.number().int().nonnegative(),
    waitTime: optionalText,
    difficulty: z.enum(["easy", "medium", "challenging"]),
    dietaryLabels: z.array(z.string()).nullish().transform((v) => v ?? []),
    ingredients: z
      .array(
        z.object({
          name: z.string().min(1),
          quantity: z.coerce.number().positive(),
          unit: z.string().min(1),
          note: optionalText,
        }),
      )
      .min(2),
    steps: z.array(z.string().min(8)).min(3),
    substitutions: z
      .array(z.string())
      .nullish()
      .transform((v) => v ?? undefined),
    servingSuggestion: optionalText,
    drinkPairing: optionalText,
  }),
});

const restaurantConfirmSchema = z.object({
  kind: z.literal("restaurant"),
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  query: z.string().min(2).max(280),
  confirmationNotes: z.string().optional(),
  restaurant: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    postcode: optionalText,
    website: optionalUrl,
    mapsUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    authenticityNotes: optionalText,
    phone: optionalText,
  }),
});

const drinkConfirmSchema = z.object({
  kind: z.literal("drink"),
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  query: z.string().min(2).max(280),
  confirmationNotes: z.string().optional(),
  drink: z.object({
    name: z.string().min(1),
    localName: optionalText,
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
    grape: optionalText,
    foodPairing: optionalText,
  }),
});

const shopConfirmSchema = z.object({
  kind: z.literal("shop"),
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  query: z.string().min(2).max(280),
  confirmationNotes: z.string().optional(),
  shop: z.object({
    name: z.string().min(1),
    city: z.string().min(1),
    address: z.string().min(1),
    specialty: z.string().min(8),
    website: optionalUrl,
    mapsUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
    notes: optionalText,
  }),
});

const confirmBodySchema = z.discriminatedUnion("kind", [
  recipeConfirmSchema,
  restaurantConfirmSchema,
  drinkConfirmSchema,
  shopConfirmSchema,
]);

export function registerSuggestionRoutes(
  app: import("express").Express,
): void {
  app.get("/api/suggestions/status", (_req, res) => {
    res.json({
      openaiConfigured: isOpenAiConfigured(),
      placesConfigured: isGooglePlacesConfigured(),
    });
  });

  app.get("/api/suggestions/recipes", async (req, res) => {
    const countryCode = String(req.query.countryCode ?? "")
      .trim()
      .toLowerCase();
    if (!/^[a-z]{2}$/.test(countryCode)) {
      res.status(400).json({ message: "countryCode is required." });
      return;
    }
    res.json({ recipes: await listVisibleRecipesForCountry(countryCode) });
  });

  app.get("/api/suggestions/drinks", async (req, res) => {
    const countryCode = String(req.query.countryCode ?? "")
      .trim()
      .toLowerCase();
    if (!/^[a-z]{2}$/.test(countryCode)) {
      res.status(400).json({ message: "countryCode is required." });
      return;
    }
    res.json({ drinks: await listVisibleDrinksForCountry(countryCode) });
  });

  app.get("/api/suggestions/shops", async (req, res) => {
    const countryCode = String(req.query.countryCode ?? "")
      .trim()
      .toLowerCase();
    if (!/^[a-z]{2}$/.test(countryCode)) {
      res.status(400).json({ message: "countryCode is required." });
      return;
    }
    res.json({ shops: await listVisibleShopsForCountry(countryCode) });
  });

  app.post("/api/suggestions/preview", async (req, res) => {
    const parsed = previewBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Enter a short name or description." });
      return;
    }

    if (parsed.data.kind === "restaurant") {
      if (!isGooglePlacesConfigured()) {
        res.status(503).json({
          message:
            "Restaurant suggestions need GOOGLE_PLACES_API_KEY in the server .env. Add a key and restart the API.",
        });
        return;
      }
    } else if (!isOpenAiConfigured()) {
      res.status(503).json({
        message:
          "Suggestions need OPENAI_API_KEY in the server .env. Add a key and restart the API.",
      });
      return;
    }

    try {
      if (parsed.data.kind === "recipe") {
        res.json(await previewRecipeSuggestion(parsed.data));
      } else if (parsed.data.kind === "restaurant") {
        res.json(await previewRestaurantSuggestion(parsed.data));
      } else if (parsed.data.kind === "drink") {
        res.json(await previewDrinkSuggestion(parsed.data));
      } else {
        res.json(await previewShopSuggestion(parsed.data));
      }
      recordProductEvent({
        eventType: "suggestion_preview",
        ip: req.ip,
        meta: {
          kind: parsed.data.kind,
          countryCode: parsed.data.countryCode,
        },
      });
    } catch (error) {
      console.error("Suggestion preview failed", error);
      res.status(502).json({
        message:
          error instanceof Error
            ? error.message
            : "Could not confirm this suggestion right now.",
      });
    }
  });

  app.post("/api/suggestions", createSuggestion);
  app.post("/api/suggestions/create", createSuggestion);

  async function createSuggestion(
    req: import("express").Request,
    res: import("express").Response,
  ) {
    const parsed = confirmBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid suggestion payload.",
        details: parsed.error.issues.map((issue) => issue.message),
      });
      return;
    }

    const trackCreate = (kind: string, countryCode: string) => {
      recordProductEvent({
        eventType: "suggestion_create",
        ip: req.ip,
        meta: { kind, countryCode },
      });
    };

    try {
      if (parsed.data.kind === "recipe") {
        const id = slugifyId("suggest", parsed.data.recipe.name);
        const recipe: Recipe = { id, ...parsed.data.recipe };
        const description =
          recipe.description.length >= 40
            ? recipe.description
            : `${recipe.description} A home-cook recipe for ${parsed.data.countryName} cuisine.`;
        const submission = await insertRecipeSubmission({
          id,
          countryCode: parsed.data.countryCode,
          countryName: parsed.data.countryName,
          query: parsed.data.query,
          recipe: { ...recipe, description },
          confirmationNotes: parsed.data.confirmationNotes,
        });
        trackCreate("recipe", parsed.data.countryCode);
        res.status(201).json({ kind: "recipe", submission });
        return;
      }

      if (parsed.data.kind === "drink") {
        const id = slugifyId("suggest-drink", parsed.data.drink.name);
        const drink: Drink = {
          id,
          ...parsed.data.drink,
          description:
            parsed.data.drink.description.length >= 40
              ? parsed.data.drink.description
              : `${parsed.data.drink.description} A traditional drink from ${parsed.data.countryName}.`,
        };
        const submission = await insertDrinkSubmission({
          id,
          countryCode: parsed.data.countryCode,
          countryName: parsed.data.countryName,
          query: parsed.data.query,
          drink,
          confirmationNotes: parsed.data.confirmationNotes,
        });
        trackCreate("drink", parsed.data.countryCode);
        res.status(201).json({ kind: "drink", submission });
        return;
      }

      if (parsed.data.kind === "shop") {
        const incoming = parsed.data.shop;
        const mapsUrl =
          incoming.mapsUrl && incoming.mapsUrl.length > 0
            ? incoming.mapsUrl
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${incoming.name} ${incoming.address} ${incoming.city} Netherlands`,
              )}`;
        const shop: SpecialtyShop = {
          id: slugifyId("suggest-shop", incoming.name),
          name: incoming.name,
          city: incoming.city,
          address: incoming.address,
          specialty: incoming.specialty,
          website: incoming.website,
          mapsUrl,
          notes: incoming.notes,
        };
        const submission = await insertShopSubmission({
          id: shop.id,
          countryCode: parsed.data.countryCode,
          countryName: parsed.data.countryName,
          query: parsed.data.query,
          shop,
          confirmationNotes: parsed.data.confirmationNotes,
        });
        trackCreate("shop", parsed.data.countryCode);
        res.status(201).json({ kind: "shop", submission });
        return;
      }

      const incoming = parsed.data.restaurant;
      if (!isGooglePlacesConfigured()) {
        res.status(503).json({
          message:
            "Restaurant suggestions need GOOGLE_PLACES_API_KEY in the server .env.",
        });
        return;
      }
      const verified = await lookupGoogleRestaurant({
        name: incoming.name,
        city: incoming.city,
        address: incoming.address,
      });
      if (!verified) {
        res.status(400).json({
          message: "Could not verify address on Google Places.",
        });
        return;
      }
      const mapsUrl =
        verified.mapsUrl && verified.mapsUrl.length > 0
          ? verified.mapsUrl
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${verified.name} ${verified.address} ${verified.city} Netherlands`,
            )}`;
      const place: RestaurantSubmissionPayload = {
        name: verified.name,
        address: verified.address,
        city: verified.city,
        postcode: verified.postcode,
        website: officialWebsiteOrUndefined(verified.website),
        mapsUrl,
        lat: verified.lat,
        lng: verified.lng,
        authenticityNotes: incoming.authenticityNotes,
        phone: verified.phone ?? incoming.phone,
      };
      const rowId = slugifyId("user", place.name);
      const code = parsed.data.countryCode.toLowerCase();
      const cuisineTags = osmTagsForCountry(code);
      await upsertRestaurant({
        id: rowId,
        name: place.name,
        address: place.address,
        city: place.city,
        postcode: place.postcode ?? null,
        lat: place.lat ?? null,
        lng: place.lng ?? null,
        cuisineCodes: [code],
        cuisineTags:
          cuisineTags.length > 0
            ? cuisineTags
            : [parsed.data.countryName.toLowerCase()],
        website: place.website ?? null,
        phone: place.phone ?? null,
        source: "user-suggestion",
        osmId: `user:${rowId}`,
        mapsUrl: place.mapsUrl,
        reviewed: true,
        authenticityRating: 3,
        authenticityNotes:
          place.authenticityNotes ??
          `Community suggestion for ${parsed.data.countryName} cuisine (pending review).`,
        reviewedAt: new Date().toISOString(),
        reviewSource: "user-suggestion-pending",
      });

      const submission = await insertRestaurantSubmission({
        id: slugifyId("suggest-rest", place.name),
        countryCode: parsed.data.countryCode,
        countryName: parsed.data.countryName,
        query: parsed.data.query,
        restaurant: place,
        restaurantRowId: rowId,
        confirmationNotes: parsed.data.confirmationNotes,
      });
      trackCreate("restaurant", parsed.data.countryCode);
      res.status(201).json({ kind: "restaurant", submission });
    } catch (error) {
      console.error("Suggestion create failed", error);
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Could not save this suggestion.",
      });
    }
  }

  app.get("/api/admin/submissions", requireAdmin, async (req, res) => {
    const status = (String(req.query.status ?? "pending") ||
      "pending") as SubmissionStatus | "all";
    const kind = (String(req.query.kind ?? "all") ||
      "all") as SubmissionKind | "all";
    res.json({
      submissions: await listSubmissions({
        status: status === "all" ? "all" : status,
        kind: kind === "all" ? "all" : kind,
      }),
    });
  });

  app.post("/api/admin/submissions/:id/:action", requireAdmin, async (req, res) => {
    const action = req.params.action;
    if (action !== "approve" && action !== "reject") {
      res.status(400).json({ message: "Use approve or reject." });
      return;
    }
    const nextStatus: SubmissionStatus =
      action === "approve" ? "approved" : "rejected";
    const kind = String(req.query.kind ?? req.body?.kind ?? "");

    if (kind === "recipe") {
      const updated = await setRecipeSubmissionStatus(req.params.id, nextStatus);
      if (!updated) {
        res.status(404).json({ message: "Submission not found." });
        return;
      }
      res.json({ kind: "recipe", submission: updated });
      return;
    }

    if (kind === "restaurant") {
      const updated = await setRestaurantSubmissionStatus(
        req.params.id,
        nextStatus,
      );
      if (!updated) {
        res.status(404).json({ message: "Submission not found." });
        return;
      }
      if (updated.restaurantRowId) {
        await setRestaurantRowReviewed(
          updated.restaurantRowId,
          nextStatus !== "rejected",
        );
      }
      res.json({ kind: "restaurant", submission: updated });
      return;
    }

    if (kind === "drink") {
      const updated = await setDrinkSubmissionStatus(req.params.id, nextStatus);
      if (!updated) {
        res.status(404).json({ message: "Submission not found." });
        return;
      }
      res.json({ kind: "drink", submission: updated });
      return;
    }

    if (kind === "shop") {
      const updated = await setShopSubmissionStatus(req.params.id, nextStatus);
      if (!updated) {
        res.status(404).json({ message: "Submission not found." });
        return;
      }
      res.json({ kind: "shop", submission: updated });
      return;
    }

    res.status(400).json({
      message: "kind=recipe|restaurant|drink|shop is required.",
    });
  });
}
