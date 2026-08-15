import { z } from "zod";
import { createHash } from "node:crypto";
import { requireAdmin, requireEditorOrAdmin, type AuthedRequest } from "./auth.ts";
import {
  appendMoreDrinks,
  appendMoreRecipes,
  appendOrderOptions,
  appendSpecialtyShops,
  addDrinkToDinner,
  deleteRecipe,
  getAdminCountryOverview,
  getCountryFromDb,
  getRecipeRow,
  listRecipeIdsForCountry,
  publicDrinkKey,
  removeCountryDrink,
  removeDinnerCourse,
  removeDinnerDrink,
  removeOrderOption,
  removeSpecialtyShop,
  saveCountryDrinks,
  saveDinnerSuggestion,
  selectRecipeForDinner,
  updateCountryDrink,
  updateCountryImage,
  updateCountryText,
  updateOrderOption,
  updateRecipeFields,
  updateRecipeImage,
  updateSpecialtyShop,
} from "../db/content.ts";
import {
  deleteRestaurantById,
  getRestaurantById,
  updateRestaurantFields,
  updateRestaurantMenu,
  updateRestaurantNotes,
  updateRestaurantPhoto,
  updateRestaurantScoresAndAuthenticity,
  upsertRestaurant,
} from "../db/restaurants.ts";
import {
  deleteCommunityRecipe,
  findVisibleCommunityRecipe,
  updateCommunityRecipe,
} from "../db/submissions.ts";
import {
  discoverCountryDrinks,
  discoverCountryImageQueries,
  discoverCountryOrderOptions,
  discoverCountryRecipes,
  discoverCountryRestaurants,
  discoverCountryShops,
  discoverItemImageQueries,
  composeDinnerSuggestion,
  drinkImageSearchQueries,
  enrichDrinkWithImage,
  isApifyConfigured,
  isOpenAiConfigured,
  researchRestaurantMenu,
  researchRestaurantScores,
  rewriteDinnerNarrative,
  rewriteDrinkText,
  rewriteOrderOptionText,
  rewriteRecipeText,
  rewriteRestaurantText,
  rewriteShopText,
} from "../openai/adminDiscover.ts";
import { findCuisineImageFromQueries, sameImageUrl } from "../lib/wikimedia.ts";
import { fetchBestWebsiteRestaurantPhoto } from "../lib/websiteImages.ts";
import {
  isGooglePlacesConfigured,
  lookupGoogleRestaurant,
} from "../lib/googlePlacesLookup.ts";
import { fetchGoogleRestaurantPhoto } from "../lib/googlePlacesPhoto.ts";
import { scheduleRestaurantEnrichments } from "../lib/restaurantEnrichmentQueue.ts";
import { scheduleRecipeEnrichments } from "../lib/recipeEnrichmentQueue.ts";
import { scheduleOrderOptionEnrichments } from "../lib/orderOptionEnrichmentQueue.ts";
import type {
  Drink,
  OrderOption,
  Recipe,
  SpecialtyShop,
} from "../../src/types/content.ts";
import type { Restaurant } from "../../src/restaurants/types.ts";
import {
  getCountryDrinks,
  getCountryRecipes,
} from "../../src/content/countries/menuAccessors.ts";
import { osmTagsForCountry } from "../../src/restaurants/osmCuisineMap.ts";
import { countryCatalog } from "../../src/content/countries/catalog.ts";
import { stableMapsUrl } from "../../src/restaurants/utils.ts";

const querySchema = z.object({
  query: z.string().max(200).optional(),
});

const orderOptionsDiscoverSchema = z.object({
  query: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
});

const recipeSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  localName: z.string().nullish(),
  description: z.string().min(20),
  category: z.enum(["starter", "main", "side", "dessert", "snack"]),
  servings: z.number().int().positive(),
  prepMinutes: z.number().int().nonnegative(),
  cookMinutes: z.number().int().nonnegative(),
  waitTime: z.string().min(1).max(120).nullish(),
  difficulty: z.enum(["easy", "medium", "challenging"]),
  dietaryLabels: z.array(z.string()),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().min(1),
        note: z.string().nullish(),
      }),
    )
    .min(2),
  steps: z.array(z.string().min(8)).min(3),
  substitutions: z.array(z.string()).nullish(),
  servingSuggestion: z.string().nullish(),
  drinkPairing: z.string().nullish(),
  imageUrl: z.string().nullish(),
  imageAttribution: z.string().nullish(),
  sourceUrl: z.string().nullish(),
  videoUrl: z.string().nullish(),
});

/** Manual copy edits — partial; omit unchanged fields. */
const recipeCopyPatchSchema = z
  .object({
    localName: z.string().max(200).nullish(),
    description: z.string().min(20).max(8000).optional(),
    servings: z.number().int().positive().max(100).optional(),
    prepMinutes: z
      .number()
      .int()
      .nonnegative()
      .max(24 * 60)
      .optional(),
    cookMinutes: z
      .number()
      .int()
      .nonnegative()
      .max(24 * 60)
      .optional(),
    waitTime: z.string().max(120).nullish(),
    difficulty: z.enum(["easy", "medium", "challenging"]).optional(),
    dietaryLabels: z.array(z.string().min(1).max(80)).max(24).optional(),
    ingredients: z
      .array(
        z.object({
          name: z.string().min(1),
          quantity: z.number().positive(),
          unit: z.string().min(1),
          note: z.string().max(200).nullish(),
        }),
      )
      .min(2)
      .optional(),
    steps: z.array(z.string().min(8).max(2000)).min(3).optional(),
    substitutions: z.array(z.string().min(1).max(500)).max(40).nullish(),
    servingSuggestion: z.string().max(2000).nullish(),
    drinkPairing: z.string().max(2000).nullish(),
  })
  .refine(
    (value) =>
      value.localName !== undefined ||
      value.description !== undefined ||
      value.servings !== undefined ||
      value.prepMinutes !== undefined ||
      value.cookMinutes !== undefined ||
      value.waitTime !== undefined ||
      value.difficulty !== undefined ||
      value.dietaryLabels !== undefined ||
      value.ingredients !== undefined ||
      value.steps !== undefined ||
      value.substitutions !== undefined ||
      value.servingSuggestion !== undefined ||
      value.drinkPairing !== undefined,
    { message: "Provide at least one recipe field to update." },
  );

/** Manual restaurant edits — partial; omit unchanged fields. */
const restaurantCopyPatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    website: z
      .union([z.string().url().max(2000), z.literal(""), z.null()])
      .optional(),
    authenticityNotes: z.string().max(4000).nullish(),
    cuisineCodes: z
      .array(z.string().regex(/^[a-z]{2}$/i))
      .min(1)
      .max(12)
      .optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.website !== undefined ||
      value.authenticityNotes !== undefined ||
      value.cuisineCodes !== undefined,
    { message: "Provide at least one restaurant field to update." },
  );

const restaurantSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  postcode: z.string().nullish(),
  website: z.string().nullish(),
  mapsUrl: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  cuisine: z.string().nullish(),
  cuisineEvidence: z.string().nullish(),
  evidenceSourceUrl: z.string().nullish(),
  confidence: z.enum(["high", "medium", "low"]).nullish(),
  authenticityNotes: z.string().nullish(),
  authenticityRating: z.number().min(1).max(5).nullish(),
  phone: z.string().nullish(),
  verified: z.boolean().nullish(),
  cuisineCodes: z.array(z.string().regex(/^[a-z]{2}$/i)).max(12).nullish(),
});

const shopSchema = z.object({
  id: z.string().nullish(),
  name: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
  specialty: z.string().min(3),
  website: z.string().nullish(),
  mapsUrl: z.string().min(1),
  notes: z.string().nullish(),
});

const orderOptionSchema = z.object({
  id: z.string().nullish(),
  name: z.string().min(1),
  platform: z.enum(["thuisbezorgd", "ubereats", "deliveroo", "direct", "other"]),
  url: z.string().url(),
  thuisbezorgdUrl: z.string().url().nullish(),
  ubereatsUrl: z.string().url().nullish(),
  city: z.string().nullish(),
  notes: z.string().nullish(),
  signatureDish: z.string().nullish(),
  imageUrl: z.string().nullish(),
  imageAttribution: z.string().nullish(),
  cuisineCodes: z.array(z.string().regex(/^[a-z]{2}$/i)).max(12).nullish(),
});

const orderOptionCopyPatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    notes: z.string().max(4000).nullish(),
    signatureDish: z.string().max(200).nullish(),
    thuisbezorgdUrl: z
      .union([z.string().url().max(2000), z.literal(""), z.null()])
      .optional(),
    ubereatsUrl: z
      .union([z.string().url().max(2000), z.literal(""), z.null()])
      .optional(),
    cuisineCodes: z
      .array(z.string().regex(/^[a-z]{2}$/i))
      .min(1)
      .max(12)
      .optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.notes !== undefined ||
      value.signatureDish !== undefined ||
      value.thuisbezorgdUrl !== undefined ||
      value.ubereatsUrl !== undefined ||
      value.cuisineCodes !== undefined,
    { message: "Provide at least one order-option field to update." },
  );

const drinkSchema = z.object({
  name: z.string().min(1),
  localName: z.string().nullish(),
  type: z.enum(["beer", "wine", "spirit", "cocktail", "soft-drink", "tea", "coffee"]),
  alcoholic: z.boolean(),
  description: z.string().min(20),
  grape: z.string().nullish(),
  foodPairing: z.string().nullish(),
  imageUrl: z.string().nullish(),
  imageAttribution: z.string().nullish(),
});

const dishCandidateSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  localName: z.string().nullish(),
  description: z.string().min(20),
  category: z.enum(["starter", "main", "side", "dessert", "snack"]),
});

function isFullRecipe(
  value: z.infer<typeof recipeSchema> | z.infer<typeof dishCandidateSchema>,
): value is z.infer<typeof recipeSchema> {
  return (
    "ingredients" in value &&
    Array.isArray(value.ingredients) &&
    value.ingredients.length >= 2 &&
    "steps" in value &&
    Array.isArray(value.steps) &&
    value.steps.length >= 3
  );
}

function publicErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    return "OpenAI returned data we could not parse. Try querying again.";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function openaiRequired(res: import("express").Response): boolean {
  if (isOpenAiConfigured()) return true;
  res.status(503).json({
    message: "OPENAI_API_KEY is not configured.",
  });
  return false;
}

function placesRequired(res: import("express").Response): boolean {
  if (isGooglePlacesConfigured() || isApifyConfigured()) return true;
  res.status(503).json({
    message:
      "Restaurant discover needs GOOGLE_PLACES_API_KEY and/or APIFY_TOKEN (Tripadvisor).",
  });
  return false;
}

function apifyRequired(res: import("express").Response): boolean {
  if (isApifyConfigured()) return true;
  res.status(503).json({
    message:
      "APIFY_TOKEN is not configured. Order option discover needs Apify (Thuisbezorgd / Uber Eats actors).",
  });
  return false;
}

export function registerAdminCountryRoutes(app: import("express").Express): void {
  app.get("/api/admin/overview", requireAdmin, async (_req: AuthedRequest, res) => {
    try {
      const countries = await getAdminCountryOverview();
      const totals = countries.reduce(
        (acc, row) => {
          acc.recipes += row.recipes;
          acc.drinks += row.drinks;
          acc.shops += row.shops;
          acc.restaurants += row.restaurants;
          return acc;
        },
        { recipes: 0, drinks: 0, shops: 0, restaurants: 0 },
      );
      res.json({
        countries,
        totals: {
          countries: countries.length,
          ...totals,
        },
      });
    } catch (error) {
      console.error("Admin overview failed", error);
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Could not load admin overview.",
      });
    }
  });

  app.post(
    "/api/admin/countries/:code/replace-image",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }

        const nationalDish =
          country.menu && country.nationalDishId
            ? [
                country.menu.starter,
                country.menu.main,
                country.menu.side,
                country.menu.dessert,
                ...(country.menu.moreRecipes ?? []),
              ].find((recipe) => recipe.id === country.nationalDishId)
            : country.menu?.main;

        const discovered = await discoverCountryImageQueries({
          countryCode: country.code,
          countryName: country.name,
          nationalDishName: nationalDish?.name,
        });

        const queries = [
          ...discovered.searchQueries,
          `${discovered.dishName} food`,
          `${country.name} cuisine dish`,
          `${country.name} traditional food`,
        ];

        const image = await findCuisineImageFromQueries(queries, {
          excludeUrls: [country.imageUrl],
        });
        if (!image) {
          res.status(404).json({
            message: "Could not find a suitable Wikimedia image.",
            notes: discovered.notes,
            dishName: discovered.dishName,
            searchQueries: queries,
          });
          return;
        }

        const updated = await updateCountryImage(
          country.code,
          image.url,
          image.attribution,
        );
        res.json({
          country: updated,
          imageUrl: image.url,
          imageAttribution: image.attribution,
          dishName: discovered.dishName,
          query: image.query,
          notes: discovered.notes,
        });
      } catch (error) {
        console.error("Replace country image failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not replace country image."),
        });
      }
    },
  );

  app.patch(
    "/api/admin/countries/:code/text",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const parsed = z
        .object({
          introduction: z.string().trim().min(20).max(4000),
        })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          message: "Enter country text of at least 20 characters.",
        });
        return;
      }
      try {
        const updated = await updateCountryText(
          String(req.params.code ?? ""),
          parsed.data.introduction,
        );
        if (!updated) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        res.json({ country: updated });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update text.";
        const status = message.includes("at least") ? 400 : 500;
        if (status === 500) {
          console.error("Update country text failed", error);
        }
        res.status(status).json({
          message: publicErrorMessage(error, "Could not update country text."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/discover/recipes",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      const parsed = querySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid request." });
        return;
      }
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const existingIds = await listRecipeIdsForCountry(country.code);
        const existingNames = [
          ...(country.menu
            ? [
                country.menu.starter.name,
                country.menu.main.name,
                country.menu.side.name,
                country.menu.dessert.name,
                ...(country.menu.moreRecipes ?? []).map((recipe) => recipe.name),
              ]
            : []),
          ...(country.standaloneRecipes ?? []).map((recipe) => recipe.name),
          ...existingIds,
        ];
        const result = await discoverCountryRecipes({
          countryCode: country.code,
          countryName: country.name,
          query: parsed.data.query,
          existingNames,
        });
        res.json(result);
      } catch (error) {
        console.error("Discover recipes failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not discover recipes."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/recipes",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const parsed = z
        .object({
          recipes: z
            .array(z.union([recipeSchema, dishCandidateSchema]))
            .min(1)
            .max(50),
        })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Select at least one valid recipe." });
        return;
      }
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }

        const toInsert: Recipe[] = [];
        const enrichmentJobs: Array<{
          countryCode: string;
          countryName: string;
          recipeId: string;
          candidate?: {
            id: string;
            name: string;
            localName?: string;
            description: string;
            category: Recipe["category"];
          };
        }> = [];

        for (const recipe of parsed.data.recipes) {
          const id = recipe.id?.trim() || slugify(recipe.name) || "dish";
          if (isFullRecipe(recipe)) {
            const full: Recipe = {
              ...recipe,
              id,
              localName: recipe.localName ?? undefined,
              substitutions: recipe.substitutions ?? undefined,
              servingSuggestion: recipe.servingSuggestion ?? undefined,
              drinkPairing: recipe.drinkPairing ?? undefined,
              imageUrl: recipe.imageUrl ?? undefined,
              imageAttribution: recipe.imageAttribution ?? undefined,
              sourceUrl: recipe.sourceUrl ?? undefined,
              videoUrl: recipe.videoUrl ?? undefined,
              ingredients: recipe.ingredients.map((ingredient) => ({
                ...ingredient,
                note: ingredient.note ?? undefined,
              })),
            };
            toInsert.push(full);
            if (!full.imageUrl?.trim()) {
              enrichmentJobs.push({
                countryCode: country.code,
                countryName: country.name,
                recipeId: id,
              });
            }
          } else {
            // Stub immediately; expand + image run in the background.
            toInsert.push({
              id,
              name: recipe.name,
              localName: recipe.localName ?? undefined,
              description: recipe.description,
              category: recipe.category,
              servings: 4,
              prepMinutes: 20,
              cookMinutes: 30,
              difficulty: "medium",
              dietaryLabels: [],
              ingredients: [
                { name: "Details loading", quantity: 1, unit: "portion" },
                { name: "See enrichment", quantity: 1, unit: "portion" },
              ],
              steps: [
                "Full recipe details are being generated in the background.",
                "Ingredients and steps will update automatically shortly.",
                "Refresh the country page if this placeholder is still visible.",
              ],
            });
            enrichmentJobs.push({
              countryCode: country.code,
              countryName: country.name,
              recipeId: id,
              candidate: {
                id,
                name: recipe.name,
                localName: recipe.localName ?? undefined,
                description: recipe.description,
                category: recipe.category,
              },
            });
          }
        }

        // Expand needs OpenAI; stubs still queue when configured.
        const needsExpand = enrichmentJobs.some((job) => job.candidate);
        if (needsExpand && !openaiRequired(res)) return;

        const { country: updated, inserted } = await appendMoreRecipes(
          country.code,
          toInsert,
        );

        // Remap jobs to final IDs (append may suffix on collision).
        const jobs = inserted.flatMap((recipe, index) => {
          const planned = enrichmentJobs[index];
          if (!planned) return [];
          if (!planned.candidate && recipe.imageUrl?.trim()) return [];
          return [
            {
              countryCode: country.code,
              countryName: country.name,
              recipeId: recipe.id,
              candidate: planned.candidate
                ? { ...planned.candidate, id: recipe.id }
                : undefined,
            },
          ];
        });

        const enrichmentQueued = scheduleRecipeEnrichments(jobs);
        res.json({
          country: updated,
          added: inserted.length,
          enrichmentQueued,
        });
      } catch (error) {
        console.error("Add recipes failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not add recipes."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/discover/restaurants",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!placesRequired(res)) return;
      const parsed = querySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid request." });
        return;
      }
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const result = await discoverCountryRestaurants({
          countryCode: country.code,
          countryName: country.name,
          query: parsed.data.query,
          cuisineAliases: country.cuisineAliases,
        });
        res.json(result);
      } catch (error) {
        console.error("Discover restaurants failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not discover restaurants."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/restaurants",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const parsed = z
        .object({
          restaurants: z.array(restaurantSchema).min(1).max(50),
          /** Queue menu/text/scores/image enrichment after save. */
          review: z.boolean().optional(),
        })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Select at least one valid restaurant." });
        return;
      }
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const shouldReview = parsed.data.review === true;

        let added = 0;
        const enrichmentJobs: Array<{
          restaurantId: string;
          countryCode: string;
          countryName: string;
        }> = [];
        for (const place of parsed.data.restaurants) {
          const placeCuisineCodes = Array.from(
            new Set(
              (place.cuisineCodes?.length
                ? place.cuisineCodes
                : [country.code]
              ).map((code) => code.trim().toLowerCase()).filter((code) => /^[a-z]{2}$/.test(code)),
            ),
          );
          const primaryCode = placeCuisineCodes[0] ?? country.code;
          const osmTags = osmTagsForCountry(primaryCode);
          const cuisineTags =
            osmTags.length > 0
              ? osmTags
              : primaryCode === country.code
                ? country.cuisineAliases
                    .map((alias) => alias.trim().toLowerCase())
                    .filter(Boolean)
                    .slice(0, 4)
                : placeCuisineCodes;

          const key = createHash("sha1")
            .update(
              `${primaryCode}|${place.name}|${place.city}|${place.address}`.toLowerCase(),
            )
            .digest("hex")
            .slice(0, 16);

          let lat = place.lat ?? null;
          let lng = place.lng ?? null;
          let address = place.address;
          let city = place.city;
          let postcode = place.postcode ?? null;
          let website = place.website?.trim() || null;
          let phone = place.phone ?? null;
          let mapsUrl = stableMapsUrl(place.mapsUrl, {
            name: place.name,
            address,
            city,
          });
          let verified = Boolean(place.verified);

          if ((lat == null || lng == null) && isGooglePlacesConfigured()) {
            try {
              const match = await lookupGoogleRestaurant({
                name: place.name,
                city: place.city,
                address: place.address,
              });
              if (match) {
                verified = true;
                lat = match.lat ?? lat;
                lng = match.lng ?? lng;
                address = match.address || address;
                city = match.city || city;
                postcode = match.postcode ?? postcode;
                website = match.website ?? website;
                phone = match.phone ?? phone;
                mapsUrl = stableMapsUrl(match.mapsUrl, {
                  name: place.name,
                  address,
                  city,
                });
              }
            } catch (error) {
              console.warn(`Places lookup on add failed for ${place.name}`, error);
            }
          }

          // Never persist directory/delivery aggregators as the venue website.
          if (
            website &&
            /tripadvisor\.|thefork\.|thuisbezorgd\.|ubereats\.|deliveroo\.|justeattakeaway\.|facebook\.com|instagram\.com/i.test(
              website,
            )
          ) {
            website = null;
          }

          const restaurantId = `admin-${key}`;
          const authenticityRating =
            place.authenticityRating != null && place.authenticityRating >= 3
              ? place.authenticityRating
              : place.confidence === "high"
                ? 5
                : 4;
          const authenticityNotes =
            place.authenticityNotes?.trim() ||
            place.cuisineEvidence?.trim() ||
            `Admin-added specialist for ${country.name} cuisine.`;
          await upsertRestaurant({
            id: restaurantId,
            osmId: `admin:${key}`,
            name: place.name,
            address,
            city,
            postcode,
            lat,
            lng,
            cuisineCodes: placeCuisineCodes,
            cuisineTags:
              cuisineTags.length > 0 ? cuisineTags : placeCuisineCodes,
            website,
            phone,
            source: "admin-discover",
            mapsUrl,
            reviewed: true,
            authenticityRating,
            authenticityNotes,
            reviewedAt: new Date().toISOString(),
            reviewSource: verified ? "admin-discover-verified" : "admin-discover",
          });
          if (shouldReview) {
            enrichmentJobs.push({
              restaurantId,
              countryCode: primaryCode,
              countryName:
                countryCatalog.find((entry) => entry.code === primaryCode)?.name ??
                country.name,
            });
          }
          added += 1;
        }

        const enrichmentQueued = shouldReview
          ? scheduleRestaurantEnrichments(enrichmentJobs)
          : 0;
        res.json({
          added,
          countryCode: country.code,
          enrichmentQueued,
          reviewed: shouldReview,
        });
      } catch (error) {
        console.error("Add restaurants failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not add restaurants."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/discover/shops",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      const parsed = querySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid request." });
        return;
      }
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const result = await discoverCountryShops({
          countryCode: country.code,
          countryName: country.name,
          query: parsed.data.query,
        });
        res.json(result);
      } catch (error) {
        console.error("Discover shops failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not discover specialty shops."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/shops",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const parsed = z
        .object({ shops: z.array(shopSchema).min(1).max(50) })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Select at least one valid shop." });
        return;
      }
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const shops: SpecialtyShop[] = parsed.data.shops.map((shop) => ({
          ...shop,
          id: shop.id?.trim() || slugify(`${shop.name}-${shop.city}`) || "shop",
        }));
        const updated = await appendSpecialtyShops(country.code, shops);
        res.json({ country: updated, added: shops.length });
      } catch (error) {
        console.error("Add shops failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not add shops."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/discover/order-options",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!apifyRequired(res)) return;
      const parsed = orderOptionsDiscoverSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid request." });
        return;
      }
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const result = await discoverCountryOrderOptions({
          countryCode: country.code,
          countryName: country.name,
          query: parsed.data.query,
          city: parsed.data.city,
        });
        res.json(result);
      } catch (error) {
        console.error("Discover order options failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not discover order options."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/order-options",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const parsed = z
        .object({ options: z.array(orderOptionSchema).min(1).max(50) })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Select at least one valid order option." });
        return;
      }
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const options: OrderOption[] = parsed.data.options.map((option) => {
          const cuisineCodes = Array.from(
            new Set(
              (option.cuisineCodes?.length
                ? option.cuisineCodes
                : [country.code]
              )
                .map((code) => code.trim().toLowerCase())
                .filter((code) => /^[a-z]{2}$/.test(code)),
            ),
          );
          const thuisbezorgdUrl =
            option.thuisbezorgdUrl?.trim() ||
            (option.platform === "thuisbezorgd" ? option.url.trim() : undefined);
          const ubereatsUrl =
            option.ubereatsUrl?.trim() ||
            (option.platform === "ubereats" ? option.url.trim() : undefined);
          return {
            id:
              option.id?.trim() ||
              slugify(`${option.platform}-${option.name}-${option.city ?? "nl"}`) ||
              "order",
            name: option.name.trim(),
            platform: option.platform,
            url: option.url.trim(),
            thuisbezorgdUrl: thuisbezorgdUrl || undefined,
            ubereatsUrl: ubereatsUrl || undefined,
            city: option.city?.trim() || undefined,
            notes: option.notes?.trim() || undefined,
            signatureDish: option.signatureDish?.trim() || undefined,
            imageUrl: option.imageUrl?.trim() || undefined,
            imageAttribution: option.imageAttribution?.trim() || undefined,
            cuisineCodes: cuisineCodes.length > 0 ? cuisineCodes : [country.code],
          };
        });
        const updated = await appendOrderOptions(country.code, options);
        if (!updated) {
          res.status(404).json({ message: "Country not found." });
          return;
        }

        const enrichmentJobs = options
          .filter((option) => Boolean(option.id))
          .map((option) => ({
            countryCode: country.code,
            countryName: country.name,
            optionId: option.id,
          }));
        const enrichmentQueued = isOpenAiConfigured()
          ? scheduleOrderOptionEnrichments(enrichmentJobs)
          : 0;

        res.json({
          country: updated,
          added: options.length,
          enrichmentQueued,
        });
      } catch (error) {
        console.error("Add order options failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not add order options."),
        });
      }
    },
  );

  app.delete(
    "/api/admin/countries/:code/order-options/:optionId",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const code = String(req.params.code ?? "");
        const optionId = decodeURIComponent(String(req.params.optionId ?? ""));
        const updated = await removeOrderOption(code, optionId);
        if (!updated) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        res.json({ country: updated });
      } catch (error) {
        console.error("Remove order option failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not remove order option."),
        });
      }
    },
  );

  app.patch(
    "/api/admin/countries/:code/order-options/:optionId",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const parsed = orderOptionCopyPatchSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({
          message:
            parsed.error.issues[0]?.message ?? "Invalid order option edit payload.",
        });
        return;
      }
      try {
        const code = String(req.params.code ?? "");
        const optionId = decodeURIComponent(String(req.params.optionId ?? ""));
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const existing = (country.orderOptions ?? []).find(
          (option) => option.id === optionId,
        );
        if (!existing) {
          res.status(404).json({ message: "Order option not found." });
          return;
        }

        const body = parsed.data;
        const nextName = body.name?.trim() || existing.name;
        const nextNotes =
          body.notes === undefined
            ? existing.notes
            : body.notes?.trim() || undefined;
        const nextSignature =
          body.signatureDish === undefined
            ? existing.signatureDish
            : body.signatureDish?.trim() || undefined;
        const nextTb =
          body.thuisbezorgdUrl === undefined
            ? existing.thuisbezorgdUrl
            : body.thuisbezorgdUrl?.trim() || undefined;
        const nextUe =
          body.ubereatsUrl === undefined
            ? existing.ubereatsUrl
            : body.ubereatsUrl?.trim() || undefined;
        const nextCuisineCodes =
          body.cuisineCodes !== undefined
            ? Array.from(
                new Set(
                  body.cuisineCodes
                    .map((item) => item.trim().toLowerCase())
                    .filter((item) => /^[a-z]{2}$/.test(item)),
                ),
              )
            : existing.cuisineCodes;

        const tbUrl =
          nextTb ||
          (existing.platform === "thuisbezorgd" && !nextUe ? existing.url : undefined);
        const ueUrl =
          nextUe ||
          (existing.platform === "ubereats" && !nextTb ? existing.url : undefined);
        const primaryUrl = tbUrl || ueUrl || existing.url;
        const primaryPlatform =
          tbUrl && (!ueUrl || existing.platform !== "ubereats")
            ? "thuisbezorgd"
            : ueUrl
              ? "ubereats"
              : existing.platform;

        if (!primaryUrl.trim()) {
          res.status(400).json({
            message: "Provide at least one Thuisbezorgd or Uber Eats link.",
          });
          return;
        }

        const result = await updateOrderOption(code, optionId, {
          name: nextName,
          notes: nextNotes,
          signatureDish: nextSignature,
          thuisbezorgdUrl: tbUrl,
          ubereatsUrl: ueUrl,
          platform: primaryPlatform,
          url: primaryUrl,
          cuisineCodes:
            nextCuisineCodes && nextCuisineCodes.length > 0
              ? nextCuisineCodes
              : [code.toLowerCase()],
        });
        if (!result) {
          res.status(404).json({ message: "Order option not found." });
          return;
        }
        res.json(result);
      } catch (error) {
        console.error("Patch order option failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not update order option."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/order-options/:optionId/replace-image",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const code = String(req.params.code ?? "");
        const optionId = decodeURIComponent(String(req.params.optionId ?? ""));
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const option = (country.orderOptions ?? []).find((item) => item.id === optionId);
        if (!option) {
          res.status(404).json({ message: "Order option not found." });
          return;
        }

        const dishHint =
          option.signatureDish?.trim() ||
          option.notes?.trim()?.slice(0, 160) ||
          option.name;
        const discovered = await discoverItemImageQueries({
          kind: "recipe",
          countryName: country.name,
          title: option.signatureDish?.trim() || option.name,
          detail: dishHint,
        });
        const queries = [
          ...discovered.searchQueries,
          ...(option.signatureDish
            ? [
                `${option.signatureDish} dish`,
                `${option.signatureDish} ${country.name} food`,
                `${option.signatureDish} plate`,
              ]
            : []),
          `${option.name} food`,
          `${option.name} ${country.name} dish`,
          `${country.name} takeaway food`,
        ];
        const image = await findCuisineImageFromQueries(queries, {
          excludeUrls: [option.imageUrl],
        });
        if (!image) {
          res.status(404).json({
            message: "Could not find a suitable Wikimedia image.",
            notes: discovered.notes,
            searchQueries: queries,
          });
          return;
        }

        const result = await updateOrderOption(code, optionId, {
          imageUrl: image.url,
          imageAttribution: image.attribution,
        });
        if (!result) {
          res.status(404).json({ message: "Order option not found." });
          return;
        }
        res.json({
          country: result.country,
          option: result.option,
          imageUrl: image.url,
          imageAttribution: image.attribution,
          notes: discovered.notes,
          query: image.query,
        });
      } catch (error) {
        console.error("Replace order option image failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not replace order option image."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/order-options/:optionId/replace-text",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const code = String(req.params.code ?? "");
        const optionId = decodeURIComponent(String(req.params.optionId ?? ""));
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const option = (country.orderOptions ?? []).find((item) => item.id === optionId);
        if (!option) {
          res.status(404).json({ message: "Order option not found." });
          return;
        }
        const rewritten = await rewriteOrderOptionText({
          countryName: country.name,
          option,
        });
        const result = await updateOrderOption(code, optionId, rewritten.patch);
        if (!result) {
          res.status(404).json({ message: "Order option not found." });
          return;
        }
        res.json({
          country: result.country,
          option: result.option,
          notes: rewritten.notes,
        });
      } catch (error) {
        console.error("Replace order option text failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not replace order option text."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/discover/drinks",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      const parsed = querySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid request." });
        return;
      }
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const existingNames = getCountryDrinks(country).map((drink) => drink.name);
        const result = await discoverCountryDrinks({
          countryCode: country.code,
          countryName: country.name,
          query: parsed.data.query,
          existingNames,
        });
        res.json(result);
      } catch (error) {
        console.error("Discover drinks failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not discover drinks."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/drinks",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const parsed = z
        .object({ drinks: z.array(drinkSchema).min(1).max(50) })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Select at least one valid drink." });
        return;
      }
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const drinks: Drink[] = parsed.data.drinks.map((drink) => ({
          name: drink.name,
          localName: drink.localName ?? undefined,
          type: drink.type,
          alcoholic: drink.alcoholic,
          description: drink.description,
          grape: drink.grape ?? undefined,
          foodPairing: drink.foodPairing ?? undefined,
          imageUrl: drink.imageUrl ?? undefined,
          imageAttribution: drink.imageAttribution ?? undefined,
        }));
        const updated = await appendMoreDrinks(country.code, drinks);
        res.json({ country: updated, added: drinks.length });
      } catch (error) {
        console.error("Add drinks failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not add drinks."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/compose-dinner",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }

        const recipes = getCountryRecipes(country);
        const drinks = getCountryDrinks(country);
        if (recipes.length < 3) {
          res.status(400).json({
            message: "Add at least 3 recipes before composing a dinner.",
          });
          return;
        }
        if (drinks.length < 1) {
          res.status(400).json({
            message: "Add at least 1 drink before composing a dinner.",
          });
          return;
        }

        const composed = await composeDinnerSuggestion({
          countryCode: country.code,
          countryName: country.name,
          introduction: country.introduction,
          recipes: recipes.map((recipe) => ({
            id: recipe.id,
            name: recipe.name,
            localName: recipe.localName,
            description: recipe.description,
            category: recipe.category,
          })),
          drinks: drinks.map((drink) => ({
            name: drink.name,
            localName: drink.localName,
            type: drink.type,
            alcoholic: drink.alcoholic,
            description: drink.description,
          })),
        });

        const updated = await saveDinnerSuggestion(country.code, composed.dinner);
        res.json({
          country: updated,
          dinner: composed.dinner,
          notes: composed.notes,
        });
      } catch (error) {
        console.error("Compose dinner failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not compose dinner."),
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/find-drink-images",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }

        let updatedCount = 0;
        let skipped = 0;
        let missing = 0;

        const enrich = async (drink: Drink | undefined | null) => {
          if (!drink) return drink ?? null;
          if (drink.imageUrl?.trim()) {
            skipped += 1;
            return drink;
          }
          const enriched = await enrichDrinkWithImage(drink, country.name);
          if (enriched.imageUrl && enriched.imageUrl !== drink.imageUrl) {
            updatedCount += 1;
          } else {
            missing += 1;
          }
          return enriched;
        };

        const nationalDrink = await enrich(country.nationalDrink ?? null);
        const menuDrink = await enrich(country.menu?.drink ?? null);
        const existingMore = country.menu?.moreDrinks ?? country.moreDrinks ?? [];
        const moreDrinks: Drink[] = [];
        for (const drink of existingMore) {
          moreDrinks.push((await enrich(drink))!);
        }

        const updated = await saveCountryDrinks(country.code, {
          nationalDrink,
          menuDrink,
          moreDrinks,
        });

        res.json({
          country: updated,
          updated: updatedCount,
          skipped,
          missing,
          notes:
            updatedCount > 0
              ? `Added images for ${updatedCount} drink(s).`
              : missing > 0
                ? "No new images found on Wikimedia Commons."
                : "All drinks already had images.",
        });
      } catch (error) {
        console.error("Find drink images failed", error);
        res.status(500).json({
          message: publicErrorMessage(error, "Could not find drink images."),
        });
      }
    },
  );

  app.delete(
    "/api/admin/countries/:code/recipes/:recipeId",
    requireEditorOrAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const code = String(req.params.code ?? "");
        const recipeId = String(req.params.recipeId ?? "");
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const deletedAuthored = await deleteRecipe(code, recipeId);
        const deletedCommunity = deletedAuthored
          ? false
          : await deleteCommunityRecipe(code, recipeId);
        if (!deletedAuthored && !deletedCommunity) {
          res.status(404).json({ message: "Recipe not found." });
          return;
        }
        const updated = await getCountryFromDb(code);
        res.json({
          country: updated,
          source: deletedAuthored ? "menu" : "community",
        });
      } catch (error) {
        console.error("Delete recipe failed", error);
        res.status(500).json({
          message: error instanceof Error ? error.message : "Could not delete recipe.",
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/recipes/:recipeId/select-for-dinner",
    requireEditorOrAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const code = String(req.params.code ?? "");
        const recipeId = String(req.params.recipeId ?? "");
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        let updated = await selectRecipeForDinner(code, recipeId);
        if (!updated) {
          res.status(404).json({ message: "Recipe not found." });
          return;
        }

        // Rebuild the dinner story so the narrative matches the new courses.
        if (isOpenAiConfigured() && updated.dinner && updated.dinner.courses.length > 0) {
          const recipes = getCountryRecipes(updated);
          const drinks = getCountryDrinks(updated);
          const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
          const coursePayload = updated.dinner.courses
            .map((course) => {
              const recipe = recipesById.get(course.recipeId);
              if (!recipe) return null;
              return {
                recipeId: course.recipeId,
                role: course.role,
                name: recipe.name,
                localName: recipe.localName,
                description: recipe.description,
              };
            })
            .filter((course): course is NonNullable<typeof course> => Boolean(course));

          if (coursePayload.length > 0) {
            try {
              const drinkPayload = updated.dinner.drinks.map((suggestion) => {
                const drink = drinks.find(
                  (item) =>
                    item.name.toLowerCase() === suggestion.drinkName.toLowerCase(),
                );
                return {
                  name: drink?.name ?? suggestion.drinkName,
                  localName: drink?.localName,
                  type: drink?.type ?? "soft-drink",
                  alcoholic: drink?.alcoholic ?? false,
                  description: drink?.description ?? suggestion.note ?? "",
                  note: suggestion.note,
                };
              });
              const narrative = await rewriteDinnerNarrative({
                countryCode: updated.code,
                countryName: updated.name,
                introduction: updated.introduction,
                title: updated.dinner.title,
                courses: coursePayload,
                drinks:
                  drinkPayload.length > 0
                    ? drinkPayload
                    : drinks.slice(0, 2).map((drink) => ({
                        name: drink.name,
                        localName: drink.localName,
                        type: drink.type,
                        alcoholic: drink.alcoholic,
                        description: drink.description,
                      })),
              });
              updated = (await saveDinnerSuggestion(code, narrative)) ?? updated;
            } catch (error) {
              console.warn("Dinner narrative rewrite failed; keeping courses", error);
            }
          }
        }

        res.json({
          country: updated,
          dinner: updated.dinner,
          recipeId,
        });
      } catch (error) {
        console.error("Select recipe for dinner failed", error);
        res.status(500).json({
          message:
            error instanceof Error
              ? error.message
              : "Could not select recipe for dinner.",
        });
      }
    },
  );

  app.delete(
    "/api/admin/countries/:code/drinks/:drinkKey",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const code = String(req.params.code ?? "");
        const drinkKeyValue = decodeURIComponent(String(req.params.drinkKey ?? ""));
        const updated = await removeCountryDrink(code, drinkKeyValue);
        if (!updated) {
          res.status(404).json({ message: "Country or drink not found." });
          return;
        }
        res.json({ country: updated });
      } catch (error) {
        console.error("Remove drink failed", error);
        res.status(500).json({
          message: error instanceof Error ? error.message : "Could not remove drink.",
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/drinks/:drinkKey/replace-image",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const code = String(req.params.code ?? "");
        const drinkKeyValue = decodeURIComponent(String(req.params.drinkKey ?? ""));
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const drink = getCountryDrinks(country).find(
          (item) =>
            publicDrinkKey(item).toLowerCase() === drinkKeyValue.toLowerCase() ||
            item.name.trim().toLowerCase() === drinkKeyValue.toLowerCase() ||
            item.id?.toLowerCase() === drinkKeyValue.toLowerCase(),
        );
        if (!drink) {
          res.status(404).json({ message: "Drink not found." });
          return;
        }

        const discovered = await discoverItemImageQueries({
          kind: "drink",
          countryName: country.name,
          title: drink.name,
          detail: drink.localName ?? drink.description.slice(0, 160),
        });
        const queries = [
          ...discovered.searchQueries,
          ...drinkImageSearchQueries(drink, country.name),
          `${drink.name} drink`,
          `${drink.localName ?? drink.name} drink bottle`,
          `${drink.name} ${country.name} drink`,
        ];
        const image = await findCuisineImageFromQueries(queries, {
          excludeUrls: [drink.imageUrl],
        });
        if (!image) {
          res.status(404).json({
            message: "Could not find a suitable Wikimedia image.",
            notes: discovered.notes,
            searchQueries: queries,
          });
          return;
        }

        const result = await updateCountryDrink(code, drinkKeyValue, {
          imageUrl: image.url,
          imageAttribution: image.attribution,
        });
        res.json({
          country: result.country,
          drink: result.drink,
          notes: discovered.notes,
        });
      } catch (error) {
        console.error("Replace drink image failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not replace drink image.",
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/drinks/:drinkKey/replace-text",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const code = String(req.params.code ?? "");
        const drinkKeyValue = decodeURIComponent(String(req.params.drinkKey ?? ""));
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const drink = getCountryDrinks(country).find(
          (item) =>
            publicDrinkKey(item).toLowerCase() === drinkKeyValue.toLowerCase() ||
            item.name.trim().toLowerCase() === drinkKeyValue.toLowerCase() ||
            item.id?.toLowerCase() === drinkKeyValue.toLowerCase(),
        );
        if (!drink) {
          res.status(404).json({ message: "Drink not found." });
          return;
        }
        const rewritten = await rewriteDrinkText({
          countryName: country.name,
          drink,
        });
        const result = await updateCountryDrink(code, drinkKeyValue, rewritten.patch);
        res.json({
          country: result.country,
          drink: result.drink,
          notes: rewritten.notes,
        });
      } catch (error) {
        console.error("Replace drink text failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not replace drink text.",
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/drinks/:drinkKey/select-for-dinner",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const code = String(req.params.code ?? "");
        const drinkKeyValue = decodeURIComponent(String(req.params.drinkKey ?? ""));
        const updated = await addDrinkToDinner(code, drinkKeyValue);
        if (!updated) {
          res.status(404).json({ message: "Country or drink not found." });
          return;
        }
        res.json({ country: updated, dinner: updated.dinner });
      } catch (error) {
        console.error("Add drink to dinner failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not add drink to dinner.",
        });
      }
    },
  );

  app.delete(
    "/api/admin/countries/:code/dinner/courses/:recipeId",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const code = String(req.params.code ?? "");
        const recipeId = String(req.params.recipeId ?? "");
        const updated = await removeDinnerCourse(code, recipeId);
        if (!updated) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        res.json({ country: updated, dinner: updated.dinner });
      } catch (error) {
        console.error("Remove dinner course failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not remove dinner course.",
        });
      }
    },
  );

  app.delete(
    "/api/admin/countries/:code/dinner/drinks/:drinkName",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const code = String(req.params.code ?? "");
        const drinkName = decodeURIComponent(String(req.params.drinkName ?? ""));
        const updated = await removeDinnerDrink(code, drinkName);
        if (!updated) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        res.json({ country: updated, dinner: updated.dinner });
      } catch (error) {
        console.error("Remove dinner drink failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not remove dinner drink.",
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/recipes/:recipeId/replace-image",
    requireEditorOrAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const code = String(req.params.code ?? "");
        const recipeId = String(req.params.recipeId ?? "");
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }

        const authored = await getRecipeRow(code, recipeId);
        const community = authored
          ? null
          : await findVisibleCommunityRecipe(code, recipeId);
        const recipe = authored?.recipe ?? community?.recipe;
        if (!recipe) {
          res.status(404).json({ message: "Recipe not found." });
          return;
        }

        const discovered = await discoverItemImageQueries({
          kind: "recipe",
          countryName: country.name,
          title: recipe.name,
          detail: recipe.localName ?? recipe.description.slice(0, 160),
        });
        const queries = [
          ...discovered.searchQueries,
          `${recipe.name} dish`,
          `${recipe.name} food plate`,
          `${recipe.name} ${country.name} cuisine dish`,
          `${recipe.localName ?? recipe.name} dish food`,
        ];
        const image = await findCuisineImageFromQueries(queries, {
          excludeUrls: [recipe.imageUrl],
        });
        if (!image) {
          res.status(404).json({
            message: "Could not find a suitable Wikimedia image.",
            notes: discovered.notes,
            searchQueries: queries,
          });
          return;
        }

        let updatedRecipe: Recipe | null = null;
        if (authored) {
          updatedRecipe = await updateRecipeImage(
            code,
            recipeId,
            image.url,
            image.attribution,
          );
        } else if (community) {
          updatedRecipe = await updateCommunityRecipe(code, recipeId, {
            ...community.recipe,
            imageUrl: image.url,
            imageAttribution: image.attribution,
          });
        }

        res.json({
          country: await getCountryFromDb(code),
          recipe: updatedRecipe,
          imageUrl: image.url,
          imageAttribution: image.attribution,
          notes: discovered.notes,
          query: image.query,
        });
      } catch (error) {
        console.error("Replace recipe image failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not replace recipe image.",
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/recipes/:recipeId/replace-text",
    requireEditorOrAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const code = String(req.params.code ?? "");
        const recipeId = String(req.params.recipeId ?? "");
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }

        const authored = await getRecipeRow(code, recipeId);
        const community = authored
          ? null
          : await findVisibleCommunityRecipe(code, recipeId);
        const recipe = authored?.recipe ?? community?.recipe;
        if (!recipe) {
          res.status(404).json({ message: "Recipe not found." });
          return;
        }

        const rewritten = await rewriteRecipeText({
          countryName: country.name,
          recipe,
        });

        let updatedRecipe: Recipe | null = null;
        if (authored) {
          updatedRecipe = await updateRecipeFields(code, recipeId, rewritten.patch);
        } else if (community) {
          updatedRecipe = await updateCommunityRecipe(code, recipeId, {
            ...community.recipe,
            ...rewritten.patch,
            id: community.recipe.id,
          });
        }

        res.json({
          country: await getCountryFromDb(code),
          recipe: updatedRecipe,
          notes: rewritten.notes,
        });
      } catch (error) {
        console.error("Replace recipe text failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not replace recipe text.",
        });
      }
    },
  );

  app.patch(
    "/api/admin/countries/:code/recipes/:recipeId",
    requireEditorOrAdmin,
    async (req: AuthedRequest, res) => {
      const parsed = recipeCopyPatchSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({
          message: parsed.error.issues[0]?.message ?? "Invalid recipe edit payload.",
        });
        return;
      }
      try {
        const code = String(req.params.code ?? "");
        const recipeId = String(req.params.recipeId ?? "");
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }

        const authored = await getRecipeRow(code, recipeId);
        const community = authored
          ? null
          : await findVisibleCommunityRecipe(code, recipeId);
        const existing = authored?.recipe ?? community?.recipe;
        if (!existing) {
          res.status(404).json({ message: "Recipe not found." });
          return;
        }

        const body = parsed.data;
        const patch: Partial<Recipe> = {};
        if (body.localName !== undefined) {
          patch.localName = body.localName?.trim() || undefined;
        }
        if (body.description !== undefined) {
          patch.description = body.description.trim();
        }
        if (body.servings !== undefined) {
          patch.servings = body.servings;
        }
        if (body.prepMinutes !== undefined) {
          patch.prepMinutes = body.prepMinutes;
        }
        if (body.cookMinutes !== undefined) {
          patch.cookMinutes = body.cookMinutes;
        }
        if (body.waitTime !== undefined) {
          patch.waitTime = body.waitTime?.trim() || undefined;
        }
        if (body.difficulty !== undefined) {
          patch.difficulty = body.difficulty;
        }
        if (body.dietaryLabels !== undefined) {
          patch.dietaryLabels = body.dietaryLabels.map((label) => label.trim());
        }
        if (body.ingredients !== undefined) {
          patch.ingredients = body.ingredients.map((item) => ({
            name: item.name.trim(),
            quantity: item.quantity,
            unit: item.unit.trim(),
            note: item.note?.trim() || undefined,
          }));
        }
        if (body.steps !== undefined) {
          patch.steps = body.steps.map((step) => step.trim());
        }
        if (body.substitutions !== undefined) {
          patch.substitutions =
            body.substitutions == null
              ? undefined
              : body.substitutions.map((item) => item.trim()).filter(Boolean);
        }
        if (body.servingSuggestion !== undefined) {
          patch.servingSuggestion = body.servingSuggestion?.trim() || undefined;
        }
        if (body.drinkPairing !== undefined) {
          patch.drinkPairing = body.drinkPairing?.trim() || undefined;
        }

        let updatedRecipe: Recipe | null = null;
        if (authored) {
          updatedRecipe = await updateRecipeFields(code, recipeId, patch);
        } else if (community) {
          updatedRecipe = await updateCommunityRecipe(code, recipeId, {
            ...community.recipe,
            ...patch,
            id: community.recipe.id,
          });
        }

        res.json({
          country: await getCountryFromDb(code),
          recipe: updatedRecipe,
        });
      } catch (error) {
        console.error("Patch recipe failed", error);
        res.status(500).json({
          message: error instanceof Error ? error.message : "Could not update recipe.",
        });
      }
    },
  );

  app.delete(
    "/api/admin/countries/:code/shops/:shopId",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const code = String(req.params.code ?? "");
        const shopId = String(req.params.shopId ?? "");
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        if (!(country.specialtyShops ?? []).some((shop) => shop.id === shopId)) {
          res.status(404).json({ message: "Shop not found." });
          return;
        }
        const updated = await removeSpecialtyShop(code, shopId);
        res.json({ country: updated });
      } catch (error) {
        console.error("Delete shop failed", error);
        res.status(500).json({
          message: error instanceof Error ? error.message : "Could not delete shop.",
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/shops/:shopId/replace-text",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const code = String(req.params.code ?? "");
        const shopId = String(req.params.shopId ?? "");
        const country = await getCountryFromDb(code);
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }
        const shop = (country.specialtyShops ?? []).find((item) => item.id === shopId);
        if (!shop) {
          res.status(404).json({ message: "Shop not found." });
          return;
        }
        const rewritten = await rewriteShopText({
          countryName: country.name,
          shop,
        });
        const updated = await updateSpecialtyShop(code, shopId, rewritten.patch);
        if (!updated) {
          res.status(404).json({ message: "Shop not found." });
          return;
        }
        res.json({
          country: updated.country,
          shop: updated.shop,
          notes: rewritten.notes,
        });
      } catch (error) {
        console.error("Replace shop text failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not replace shop text.",
        });
      }
    },
  );

  app.delete(
    "/api/admin/restaurants/:id",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const id = String(req.params.id ?? "");
        const deleted = await deleteRestaurantById(id);
        if (!deleted) {
          res.status(404).json({ message: "Restaurant not found." });
          return;
        }
        res.json({ ok: true, id });
      } catch (error) {
        console.error("Delete restaurant failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not delete restaurant.",
        });
      }
    },
  );

  app.patch(
    "/api/admin/restaurants/:id",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      const parsed = restaurantCopyPatchSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({
          message:
            parsed.error.issues[0]?.message ?? "Invalid restaurant edit payload.",
        });
        return;
      }
      try {
        const id = String(req.params.id ?? "");
        const existing = await getRestaurantById(id);
        if (!existing) {
          res.status(404).json({ message: "Restaurant not found." });
          return;
        }
        const body = parsed.data;
        const updated = await updateRestaurantFields(id, {
          name: body.name,
          website:
            body.website === undefined
              ? undefined
              : body.website === null || body.website === ""
                ? null
                : body.website,
          authenticityNotes:
            body.authenticityNotes === undefined
              ? undefined
              : body.authenticityNotes?.trim() || null,
          cuisineCodes: body.cuisineCodes?.map((code) => code.toLowerCase()),
        });
        if (!updated) {
          res.status(404).json({ message: "Restaurant not found." });
          return;
        }
        res.json({ restaurant: toPublicRestaurant(updated) });
      } catch (error) {
        console.error("Patch restaurant failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not update restaurant.",
        });
      }
    },
  );

  app.post(
    "/api/admin/restaurants/:id/replace-image",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const id = String(req.params.id ?? "");
        const restaurant = await getRestaurantById(id);
        if (!restaurant) {
          res.status(404).json({ message: "Restaurant not found." });
          return;
        }
        const countryName =
          typeof req.body?.countryName === "string" && req.body.countryName.trim()
            ? req.body.countryName.trim()
            : "world";

        // Prefer Google Places, then the restaurant website, then Wikimedia.
        let image: {
          url: string;
          attribution: string;
          query: string;
        } | null = null;
        let notes = "Found via Google Places.";
        let source: "google" | "website" | "wikimedia" = "google";

        try {
          image = await fetchGoogleRestaurantPhoto({
            name: restaurant.name,
            city: restaurant.city,
            address: restaurant.address,
            excludeUrls: [restaurant.photoUrl],
          });
        } catch (error) {
          console.warn("Google restaurant photo failed", error);
        }

        if (!image && restaurant.website) {
          source = "website";
          notes = isGooglePlacesConfigured()
            ? "No Google photo matched; used the restaurant website."
            : "GOOGLE_PLACES_API_KEY not set; used the restaurant website.";
          try {
            image = await fetchBestWebsiteRestaurantPhoto({
              website: restaurant.website,
              restaurantName: restaurant.name,
              excludeUrls: [restaurant.photoUrl],
            });
          } catch (error) {
            console.warn("Restaurant website photo failed", error);
          }
        }

        if (!image) {
          source = "wikimedia";
          notes = restaurant.website
            ? "No Google or website photo matched; tried Wikimedia Commons."
            : isGooglePlacesConfigured()
              ? "No Google photo matched; tried Wikimedia Commons."
              : "GOOGLE_PLACES_API_KEY not set; tried Wikimedia Commons.";
          const queries = [
            `${restaurant.name} ${restaurant.city} restaurant`,
            `${restaurant.name} restaurant Netherlands`,
            `${restaurant.name} ${countryName} restaurant`,
          ];
          const commons = await findCuisineImageFromQueries(queries, {
            excludeUrls: [restaurant.photoUrl],
          });
          if (commons) {
            image = {
              url: commons.url,
              attribution: commons.attribution,
              query: commons.query,
            };
          }
        }

        if (
          image &&
          restaurant.photoUrl &&
          sameImageUrl(image.url, restaurant.photoUrl)
        ) {
          // Last resort already fell back to the only available photo.
          notes = `${notes} (only one photo available; could not pick a different one.)`;
        }

        if (!image) {
          res.status(404).json({
            message: isGooglePlacesConfigured()
              ? "Could not find a Google, website, or Wikimedia photo for this restaurant."
              : "Could not find a photo. Set GOOGLE_PLACES_API_KEY for best results.",
            notes,
          });
          return;
        }

        const updated = await updateRestaurantPhoto(id, image.url, image.attribution);
        res.json({
          restaurant: toPublicRestaurant(updated!),
          imageUrl: image.url,
          imageAttribution: image.attribution,
          notes,
          query: image.query,
          source,
        });
      } catch (error) {
        console.error("Replace restaurant image failed", error);
        res.status(500).json({
          message:
            error instanceof Error
              ? error.message
              : "Could not replace restaurant image.",
        });
      }
    },
  );

  app.post(
    "/api/admin/restaurants/:id/replace-text",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const id = String(req.params.id ?? "");
        const restaurant = await getRestaurantById(id);
        if (!restaurant) {
          res.status(404).json({ message: "Restaurant not found." });
          return;
        }
        const countryName =
          typeof req.body?.countryName === "string" && req.body.countryName.trim()
            ? req.body.countryName.trim()
            : "world";
        const countryCode =
          typeof req.body?.countryCode === "string" &&
          /^[a-z]{2}$/i.test(req.body.countryCode.trim())
            ? req.body.countryCode.trim().toLowerCase()
            : restaurant.cuisineCodes[0];
        const rewritten = await rewriteRestaurantText({
          countryName,
          countryCode,
          existingCuisineCodes: restaurant.cuisineCodes,
          restaurant: {
            name: restaurant.name,
            address: restaurant.address,
            city: restaurant.city,
            authenticityNotes: restaurant.authenticityNotes,
          },
        });
        const updated = await updateRestaurantNotes(id, rewritten.authenticityNotes, {
          cuisineCodes: rewritten.cuisineCodes,
        });
        res.json({
          restaurant: toPublicRestaurant(updated!),
          notes: rewritten.notes,
        });
      } catch (error) {
        console.error("Replace restaurant text failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not replace restaurant text.",
        });
      }
    },
  );

  app.post(
    "/api/admin/restaurants/:id/find-menu",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const id = String(req.params.id ?? "");
        const restaurant = await getRestaurantById(id);
        if (!restaurant) {
          res.status(404).json({ message: "Restaurant not found." });
          return;
        }
        const countryName =
          typeof req.body?.countryName === "string" && req.body.countryName.trim()
            ? req.body.countryName.trim()
            : "world";
        const countryCode =
          typeof req.body?.countryCode === "string" &&
          /^[a-z]{2}$/i.test(req.body.countryCode.trim())
            ? req.body.countryCode.trim().toLowerCase()
            : restaurant.cuisineCodes[0];
        const researched = await researchRestaurantMenu({
          countryName,
          countryCode,
          knownCuisineCodes: Array.from(
            new Set(
              [...(countryCode ? [countryCode] : []), ...restaurant.cuisineCodes].map(
                (code) => code.toLowerCase(),
              ),
            ),
          ),
          restaurant: {
            name: restaurant.name,
            address: restaurant.address,
            city: restaurant.city,
            website: restaurant.website,
          },
        });
        const updated = await updateRestaurantMenu(id, researched.items, {
          cuisineCodes: researched.cuisineCodes,
        });
        res.json({
          restaurant: toPublicRestaurant(updated!),
          notes: researched.notes,
          itemCount: researched.items.length,
        });
      } catch (error) {
        console.error("Find restaurant menu failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not find restaurant menu.",
        });
      }
    },
  );

  app.post(
    "/api/admin/restaurants/:id/find-scores",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      if (!openaiRequired(res)) return;
      try {
        const id = String(req.params.id ?? "");
        const restaurant = await getRestaurantById(id);
        if (!restaurant) {
          res.status(404).json({ message: "Restaurant not found." });
          return;
        }
        const countryName =
          typeof req.body?.countryName === "string" && req.body.countryName.trim()
            ? req.body.countryName.trim()
            : "world";
        const researched = await researchRestaurantScores({
          countryName,
          restaurant: {
            name: restaurant.name,
            address: restaurant.address,
            city: restaurant.city,
            website: restaurant.website,
            authenticityNotes: restaurant.authenticityNotes,
            authenticityRating: restaurant.authenticityRating,
          },
        });
        const ratings = Object.fromEntries(
          Object.entries(researched.ratings).filter(([, value]) => value != null),
        );
        const updated = await updateRestaurantScoresAndAuthenticity(id, {
          ratings,
          priceLevel: researched.priceLevel,
          authenticityRating: researched.authenticityRating,
          authenticityNotes: researched.authenticityNotes,
        });
        res.json({
          restaurant: toPublicRestaurant(updated!),
          notes: researched.notes,
        });
      } catch (error) {
        console.error("Find restaurant scores failed", error);
        res.status(500).json({
          message:
            error instanceof Error ? error.message : "Could not find restaurant scores.",
        });
      }
    },
  );
}

function toPublicRestaurant(
  row: NonNullable<Awaited<ReturnType<typeof getRestaurantById>>>,
): Restaurant {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    cuisineCodes: row.cuisineCodes,
    rating: row.userRating ?? undefined,
    reviewCount: row.reviewCount ?? undefined,
    ratings: row.ratings ?? undefined,
    priceLevel: row.priceLevel ?? undefined,
    menu: row.menu ?? undefined,
    website: row.website ?? undefined,
    mapsUrl: stableMapsUrl(row.mapsUrl, {
      name: row.name,
      address: row.address,
      city: row.city,
    }),
    photoUrl: row.photoUrl ?? undefined,
    photoAttribution: row.photoAttribution ?? undefined,
    location:
      row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : undefined,
    authenticityRating: row.authenticityRating ?? undefined,
    authenticityNotes: row.authenticityNotes ?? undefined,
    reviewed: row.reviewed,
  };
}
