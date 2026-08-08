import { z } from "zod";
import { createHash } from "node:crypto";
import { requireAdmin, type AuthedRequest } from "./auth.ts";
import {
  appendMoreDrinks,
  appendMoreRecipes,
  appendSpecialtyShops,
  deleteRecipe,
  getAdminCountryOverview,
  getCountryFromDb,
  getRecipeRow,
  listRecipeIdsForCountry,
  removeSpecialtyShop,
  saveCountryDrinks,
  updateCountryImage,
  updateRecipeFields,
  updateRecipeImage,
  updateSpecialtyShop,
} from "../db/content.ts";
import {
  deleteRestaurantById,
  getRestaurantById,
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
  discoverCountryRecipes,
  discoverCountryRestaurants,
  discoverCountryShops,
  discoverItemImageQueries,
  enrichDrinkWithImage,
  expandDishCandidates,
  isOpenAiConfigured,
  researchRestaurantMenu,
  researchRestaurantScores,
  rewriteRecipeText,
  rewriteRestaurantText,
  rewriteShopText,
} from "../openai/adminDiscover.ts";
import { findCuisineImageFromQueries, sameImageUrl } from "../lib/wikimedia.ts";
import {
  fetchGoogleRestaurantPhoto,
  isGooglePlacesConfigured,
} from "../lib/googlePlacesPhoto.ts";
import { lookupGoogleRestaurant } from "../lib/googlePlacesLookup.ts";
import { scheduleRestaurantEnrichments } from "../lib/restaurantEnrichmentQueue.ts";
import type { Drink, Recipe, SpecialtyShop } from "../../src/types/content.ts";
import type { Restaurant } from "../../src/restaurants/types.ts";
import { getCountryDrinks } from "../../src/content/countries/menuAccessors.ts";
import { osmTagsForCountry } from "../../src/restaurants/osmCuisineMap.ts";
import { stableMapsUrl } from "../../src/restaurants/utils.ts";

const querySchema = z.object({
  query: z.string().max(200).optional(),
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

const restaurantSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  postcode: z.string().nullish(),
  website: z.string().nullish(),
  mapsUrl: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  authenticityNotes: z.string().nullish(),
  authenticityRating: z.number().min(1).max(5).nullish(),
  phone: z.string().nullish(),
  verified: z.boolean().nullish(),
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

const drinkSchema = z.object({
  name: z.string().min(1),
  localName: z.string().nullish(),
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

function openaiRequired(
  res: import("express").Response,
): boolean {
  if (isOpenAiConfigured()) return true;
  res.status(503).json({
    message: "OPENAI_API_KEY is not configured.",
  });
  return false;
}

export function registerAdminCountryRoutes(
  app: import("express").Express,
): void {
  app.get(
    "/api/admin/overview",
    requireAdmin,
    async (_req: AuthedRequest, res) => {
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
            error instanceof Error
              ? error.message
              : "Could not load admin overview.",
        });
      }
    },
  );

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

        const fullRecipes: Recipe[] = [];
        const candidates: Array<{
          id: string;
          name: string;
          localName?: string;
          description: string;
          category: Recipe["category"];
        }> = [];
        for (const recipe of parsed.data.recipes) {
          if (isFullRecipe(recipe)) {
            fullRecipes.push({
              ...recipe,
              id: recipe.id?.trim() || slugify(recipe.name) || "dish",
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
            });
          } else {
            candidates.push({
              id: recipe.id?.trim() || slugify(recipe.name) || "dish",
              name: recipe.name,
              localName: recipe.localName ?? undefined,
              description: recipe.description,
              category: recipe.category,
            });
          }
        }

        if (candidates.length > 0) {
          if (!openaiRequired(res)) return;
          const expanded = await expandDishCandidates({
            countryCode: country.code,
            countryName: country.name,
            dishes: candidates,
          });
          fullRecipes.push(...expanded);
        }

        const updated = await appendMoreRecipes(country.code, fullRecipes);
        res.json({ country: updated, added: fullRecipes.length });
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
        const result = await discoverCountryRestaurants({
          countryCode: country.code,
          countryName: country.name,
          query: parsed.data.query,
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
        .object({ restaurants: z.array(restaurantSchema).min(1).max(50) })
        .safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ message: "Select at least one valid restaurant." });
        return;
      }
      try {
        const country = await getCountryFromDb(String(req.params.code ?? ""));
        if (!country) {
          res.status(404).json({ message: "Country not found." });
          return;
        }

        let added = 0;
        const enrichmentJobs: Array<{
          restaurantId: string;
          countryCode: string;
          countryName: string;
        }> = [];
        const osmTags = osmTagsForCountry(country.code);
        const cuisineTags =
          osmTags.length > 0
            ? osmTags
            : country.cuisineAliases
                .map((alias) => alias.trim().toLowerCase())
                .filter(Boolean)
                .slice(0, 4);
        for (const place of parsed.data.restaurants) {
          const key = createHash("sha1")
            .update(
              `${country.code}|${place.name}|${place.city}|${place.address}`.toLowerCase(),
            )
            .digest("hex")
            .slice(0, 16);

          let lat = place.lat ?? null;
          let lng = place.lng ?? null;
          let address = place.address;
          let city = place.city;
          let postcode = place.postcode ?? null;
          let website = place.website ?? null;
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
              console.warn(
                `Places lookup on add failed for ${place.name}`,
                error,
              );
            }
          }

          const restaurantId = `admin-${key}`;
          const authenticityRating =
            place.authenticityRating != null && place.authenticityRating >= 3
              ? place.authenticityRating
              : 4;
          await upsertRestaurant({
            id: restaurantId,
            osmId: `admin:${key}`,
            name: place.name,
            address,
            city,
            postcode,
            lat,
            lng,
            cuisineCodes: [country.code],
            cuisineTags:
              cuisineTags.length > 0
                ? cuisineTags
                : [country.name.toLowerCase()],
            website,
            phone,
            source: "admin-discover",
            mapsUrl,
            reviewed: true,
            authenticityRating,
            authenticityNotes:
              place.authenticityNotes ??
              `Admin-added specialist for ${country.name} cuisine.`,
            reviewedAt: new Date().toISOString(),
            reviewSource: verified
              ? "admin-discover-verified"
              : "admin-discover",
          });
          enrichmentJobs.push({
            restaurantId,
            countryCode: country.code,
            countryName: country.name,
          });
          added += 1;
        }

        const enrichmentQueued = scheduleRestaurantEnrichments(enrichmentJobs);
        res.json({
          added,
          countryCode: country.code,
          enrichmentQueued,
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
          message: publicErrorMessage(
            error,
            "Could not discover specialty shops.",
          ),
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
        const existingNames = getCountryDrinks(country).map(
          (drink) => drink.name,
        );
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
        const existingMore =
          country.menu?.moreDrinks ?? country.moreDrinks ?? [];
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
          message: publicErrorMessage(
            error,
            "Could not find drink images.",
          ),
        });
      }
    },
  );

  app.delete(
    "/api/admin/countries/:code/recipes/:recipeId",
    requireAdmin,
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
          message:
            error instanceof Error ? error.message : "Could not delete recipe.",
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/recipes/:recipeId/replace-image",
    requireAdmin,
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
          `${recipe.name} food`,
          `${recipe.name} ${country.name}`,
          `${recipe.localName ?? recipe.name} dish`,
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
            error instanceof Error
              ? error.message
              : "Could not replace recipe image.",
        });
      }
    },
  );

  app.post(
    "/api/admin/countries/:code/recipes/:recipeId/replace-text",
    requireAdmin,
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
          updatedRecipe = await updateRecipeFields(
            code,
            recipeId,
            rewritten.patch,
          );
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
            error instanceof Error
              ? error.message
              : "Could not replace recipe text.",
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
          message:
            error instanceof Error ? error.message : "Could not delete shop.",
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
        const shop = (country.specialtyShops ?? []).find(
          (item) => item.id === shopId,
        );
        if (!shop) {
          res.status(404).json({ message: "Shop not found." });
          return;
        }
        const rewritten = await rewriteShopText({
          countryName: country.name,
          shop,
        });
        const updated = await updateSpecialtyShop(
          code,
          shopId,
          rewritten.patch,
        );
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
            error instanceof Error
              ? error.message
              : "Could not replace shop text.",
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
            error instanceof Error
              ? error.message
              : "Could not delete restaurant.",
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

        // Prefer Google Places (real venue photo) over Wikimedia/OpenAI guesses.
        let image: {
          url: string;
          attribution: string;
          query: string;
        } | null = null;
        let notes = "Found via Google Places.";
        let source: "google" | "wikimedia" = "google";

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

        if (!image) {
          source = "wikimedia";
          notes = isGooglePlacesConfigured()
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
              ? "Could not find a Google or Wikimedia photo for this restaurant."
              : "Could not find a photo. Set GOOGLE_PLACES_API_KEY for best results.",
            notes,
          });
          return;
        }

        const updated = await updateRestaurantPhoto(
          id,
          image.url,
          image.attribution,
        );
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
        const updated = await updateRestaurantNotes(
          id,
          rewritten.authenticityNotes,
          { cuisineCodes: rewritten.cuisineCodes },
        );
        res.json({
          restaurant: toPublicRestaurant(updated!),
          notes: rewritten.notes,
        });
      } catch (error) {
        console.error("Replace restaurant text failed", error);
        res.status(500).json({
          message:
            error instanceof Error
              ? error.message
              : "Could not replace restaurant text.",
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
              [
                ...(countryCode ? [countryCode] : []),
                ...restaurant.cuisineCodes,
              ].map((code) => code.toLowerCase()),
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
            error instanceof Error
              ? error.message
              : "Could not find restaurant menu.",
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
            error instanceof Error
              ? error.message
              : "Could not find restaurant scores.",
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
      row.lat != null && row.lng != null
        ? { lat: row.lat, lng: row.lng }
        : undefined,
    authenticityRating: row.authenticityRating ?? undefined,
    authenticityNotes: row.authenticityNotes ?? undefined,
    reviewed: row.reviewed,
  };
}
