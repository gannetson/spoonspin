import { z } from "zod";
import type { Recipe } from "../../src/types/content.ts";
import {
  insertRecipeSubmission,
  insertRestaurantSubmission,
  listSubmissions,
  listVisibleRecipesForCountry,
  setRecipeSubmissionStatus,
  setRestaurantRowReviewed,
  setRestaurantSubmissionStatus,
  slugifyId,
  type RestaurantSubmissionPayload,
  type SubmissionKind,
  type SubmissionStatus,
} from "../db/submissions.ts";
import {
  isOpenAiConfigured,
  previewRecipeSuggestion,
  previewRestaurantSuggestion,
} from "../openai/suggest.ts";
import { upsertRestaurant } from "../db/restaurants.ts";
import { osmTagsForCountry } from "../../src/restaurants/osmCuisineMap.ts";

const previewBodySchema = z.object({
  kind: z.enum(["recipe", "restaurant"]),
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  query: z.string().min(2).max(280),
});

const recipeConfirmSchema = z.object({
  kind: z.literal("recipe"),
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  query: z.string().min(2).max(280),
  confirmationNotes: z.string().optional(),
  recipe: z.object({
    name: z.string().min(1),
    localName: z.string().optional(),
    description: z.string().min(20),
    category: z.enum(["starter", "main", "side", "dessert", "snack"]),
    servings: z.number().int().positive(),
    prepMinutes: z.number().int().nonnegative(),
    cookMinutes: z.number().int().nonnegative(),
    difficulty: z.enum(["easy", "medium", "challenging"]),
    dietaryLabels: z.array(z.string()),
    ingredients: z
      .array(
        z.object({
          name: z.string().min(1),
          quantity: z.number().positive(),
          unit: z.string().min(1),
          note: z.string().optional(),
        }),
      )
      .min(2),
    steps: z.array(z.string().min(8)).min(3),
    substitutions: z.array(z.string()).optional(),
    servingSuggestion: z.string().optional(),
    drinkPairing: z.string().optional(),
  }),
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

const confirmBodySchema = z.discriminatedUnion("kind", [
  recipeConfirmSchema,
  restaurantConfirmSchema,
]);

function adminAuthorized(req: {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
}): boolean {
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected) return false;
  const header = req.headers["x-admin-token"];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  const fromQuery =
    typeof req.query.token === "string" ? req.query.token : undefined;
  return fromHeader === expected || fromQuery === expected;
}

export function registerSuggestionRoutes(
  app: import("express").Express,
): void {
  app.get("/api/suggestions/status", (_req, res) => {
    res.json({ openaiConfigured: isOpenAiConfigured() });
  });

  app.get("/api/suggestions/recipes", (req, res) => {
    const countryCode = String(req.query.countryCode ?? "")
      .trim()
      .toLowerCase();
    if (!/^[a-z]{2}$/.test(countryCode)) {
      res.status(400).json({ message: "countryCode is required." });
      return;
    }
    res.json({ recipes: listVisibleRecipesForCountry(countryCode) });
  });

  app.post("/api/suggestions/preview", async (req, res) => {
    if (!isOpenAiConfigured()) {
      res.status(503).json({
        message:
          "Suggestions need OPENAI_API_KEY in the server .env. Add a key and restart the API.",
      });
      return;
    }

    const parsed = previewBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Enter a short name or description." });
      return;
    }

    try {
      if (parsed.data.kind === "recipe") {
        const preview = await previewRecipeSuggestion(parsed.data);
        res.json(preview);
        return;
      }
      const preview = await previewRestaurantSuggestion(parsed.data);
      res.json(preview);
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

  function createSuggestion(
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

    try {
      if (parsed.data.kind === "recipe") {
        const id = slugifyId("suggest", parsed.data.recipe.name);
        const recipe: Recipe = { id, ...parsed.data.recipe };
        const description =
          recipe.description.length >= 40
            ? recipe.description
            : `${recipe.description} A home-cook recipe for ${parsed.data.countryName} cuisine.`;
        const submission = insertRecipeSubmission({
          id,
          countryCode: parsed.data.countryCode,
          countryName: parsed.data.countryName,
          query: parsed.data.query,
          recipe: { ...recipe, description },
          confirmationNotes: parsed.data.confirmationNotes,
        });
        res.status(201).json({ kind: "recipe", submission });
        return;
      }

      const incoming = parsed.data.restaurant;
      const mapsUrl =
        incoming.mapsUrl && incoming.mapsUrl.length > 0
          ? incoming.mapsUrl
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${incoming.name} ${incoming.address} ${incoming.city} Netherlands`,
            )}`;
      const place: RestaurantSubmissionPayload = {
        name: incoming.name,
        address: incoming.address,
        city: incoming.city,
        postcode: incoming.postcode,
        website: incoming.website,
        mapsUrl,
        lat: incoming.lat ?? undefined,
        lng: incoming.lng ?? undefined,
        authenticityNotes: incoming.authenticityNotes,
        phone: incoming.phone,
      };
      const rowId = slugifyId("user", place.name);
      const code = parsed.data.countryCode.toLowerCase();
      const cuisineTags = osmTagsForCountry(code);
      upsertRestaurant({
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

      const submission = insertRestaurantSubmission({
        id: slugifyId("suggest-rest", place.name),
        countryCode: parsed.data.countryCode,
        countryName: parsed.data.countryName,
        query: parsed.data.query,
        restaurant: place,
        restaurantRowId: rowId,
        confirmationNotes: parsed.data.confirmationNotes,
      });
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

  app.get("/api/admin/submissions", (req, res) => {
    if (!adminAuthorized(req)) {
      res.status(401).json({ message: "Admin token required." });
      return;
    }
    const status = (String(req.query.status ?? "pending") ||
      "pending") as SubmissionStatus | "all";
    const kind = (String(req.query.kind ?? "all") ||
      "all") as SubmissionKind | "all";
    res.json({
      submissions: listSubmissions({
        status: status === "all" ? "all" : status,
        kind: kind === "all" ? "all" : kind,
      }),
    });
  });

  app.post("/api/admin/submissions/:id/:action", (req, res) => {
    if (!adminAuthorized(req)) {
      res.status(401).json({ message: "Admin token required." });
      return;
    }
    const action = req.params.action;
    if (action !== "approve" && action !== "reject") {
      res.status(400).json({ message: "Use approve or reject." });
      return;
    }
    const nextStatus: SubmissionStatus =
      action === "approve" ? "approved" : "rejected";
    const kind = String(req.query.kind ?? req.body?.kind ?? "");

    if (kind === "recipe") {
      const updated = setRecipeSubmissionStatus(req.params.id, nextStatus);
      if (!updated) {
        res.status(404).json({ message: "Submission not found." });
        return;
      }
      res.json({ kind: "recipe", submission: updated });
      return;
    }

    if (kind === "restaurant") {
      const updated = setRestaurantSubmissionStatus(req.params.id, nextStatus);
      if (!updated) {
        res.status(404).json({ message: "Submission not found." });
        return;
      }
      if (updated.restaurantRowId) {
        setRestaurantRowReviewed(
          updated.restaurantRowId,
          nextStatus !== "rejected",
        );
      }
      res.json({ kind: "restaurant", submission: updated });
      return;
    }

    res.status(400).json({ message: "kind=recipe|restaurant is required." });
  });
}
