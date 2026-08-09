import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAdmin, type AuthedRequest } from "./auth.ts";
import {
  getCountryFromDb,
  getRecipeRow,
  publicDrinkKey,
  updateCountryDrink,
  updateCountryImage,
  updateRecipeImage,
} from "../db/content.ts";
import {
  findVisibleCommunityRecipe,
  updateCommunityRecipe,
} from "../db/submissions.ts";
import {
  getRestaurantById,
  updateRestaurantPhoto,
} from "../db/restaurants.ts";
import { searchCommonsImagesPage } from "../lib/wikimedia.ts";
import { getCountryDrinks } from "../../src/content/countries/menuAccessors.ts";
import { stableMapsUrl } from "../../src/restaurants/utils.ts";
import type { Recipe } from "../../src/types/content.ts";
import type { Drink } from "../../src/types/content.ts";
import type { Restaurant } from "../../src/restaurants/types.ts";
import { getUploadsRoot } from "./me.ts";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const targetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("country"),
    countryCode: z.string().min(2).max(2),
  }),
  z.object({
    kind: z.literal("recipe"),
    countryCode: z.string().min(2).max(2),
    recipeId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("drink"),
    countryCode: z.string().min(2).max(2),
    drinkKey: z.string().min(1),
  }),
  z.object({
    kind: z.literal("restaurant"),
    restaurantId: z.string().min(1),
  }),
]);

const setImageSchema = z.object({
  target: targetSchema,
  imageUrl: z.string().min(1).max(2000),
  imageAttribution: z.string().max(500).nullish(),
});

function ensureAdminUploadDir(): string {
  const dir = path.join(getUploadsRoot(), "admin");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const upload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      try {
        cb(null, ensureAdminUploadDir());
      } catch (error) {
        cb(error as Error, "");
      }
    },
    filename(_req, file, cb) {
      const ext =
        file.mimetype === "image/png"
          ? ".png"
          : file.mimetype === "image/webp"
            ? ".webp"
            : ".jpg";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/webp"
    ) {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPEG, PNG, or WebP images are allowed."));
  },
});

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

function drinkMatchesKey(drink: Drink, drinkKeyValue: string): boolean {
  const key = drinkKeyValue.toLowerCase();
  return (
    publicDrinkKey(drink).toLowerCase() === key ||
    drink.name.trim().toLowerCase() === key ||
    drink.id?.toLowerCase() === key
  );
}

async function applyImage(
  target: z.infer<typeof targetSchema>,
  imageUrl: string,
  imageAttribution: string | null | undefined,
): Promise<Record<string, unknown>> {
  if (target.kind === "country") {
    const country = await getCountryFromDb(target.countryCode);
    if (!country) throw Object.assign(new Error("Country not found."), { status: 404 });
    const updated = await updateCountryImage(
      target.countryCode,
      imageUrl,
      imageAttribution,
    );
    return {
      country: updated,
      imageUrl,
      imageAttribution: imageAttribution ?? null,
    };
  }

  if (target.kind === "recipe") {
    const country = await getCountryFromDb(target.countryCode);
    if (!country) throw Object.assign(new Error("Country not found."), { status: 404 });

    const authored = await getRecipeRow(target.countryCode, target.recipeId);
    const community = authored
      ? null
      : await findVisibleCommunityRecipe(target.countryCode, target.recipeId);
    const recipe = authored?.recipe ?? community?.recipe;
    if (!recipe) {
      throw Object.assign(new Error("Recipe not found."), { status: 404 });
    }

    let updatedRecipe: Recipe | null = null;
    if (authored) {
      updatedRecipe = await updateRecipeImage(
        target.countryCode,
        target.recipeId,
        imageUrl,
        imageAttribution,
      );
    } else if (community) {
      updatedRecipe = await updateCommunityRecipe(
        target.countryCode,
        target.recipeId,
        {
          ...community.recipe,
          imageUrl,
          imageAttribution: imageAttribution ?? undefined,
        },
      );
    }

    return {
      country: await getCountryFromDb(target.countryCode),
      recipe: updatedRecipe,
      imageUrl,
      imageAttribution: imageAttribution ?? null,
    };
  }

  if (target.kind === "drink") {
    const country = await getCountryFromDb(target.countryCode);
    if (!country) throw Object.assign(new Error("Country not found."), { status: 404 });
    const drink = getCountryDrinks(country).find((item) =>
      drinkMatchesKey(item, target.drinkKey),
    );
    if (!drink) {
      throw Object.assign(new Error("Drink not found."), { status: 404 });
    }
    const result = await updateCountryDrink(
      target.countryCode,
      target.drinkKey,
      {
        imageUrl,
        imageAttribution: imageAttribution ?? undefined,
      },
    );
    return {
      country: result.country,
      drink: result.drink,
      imageUrl,
      imageAttribution: imageAttribution ?? null,
    };
  }

  const restaurant = await getRestaurantById(target.restaurantId);
  if (!restaurant) {
    throw Object.assign(new Error("Restaurant not found."), { status: 404 });
  }
  const updated = await updateRestaurantPhoto(
    target.restaurantId,
    imageUrl,
    imageAttribution,
  );
  return {
    restaurant: toPublicRestaurant(updated!),
    imageUrl,
    imageAttribution: imageAttribution ?? null,
  };
}

function statusFromError(error: unknown): number {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return 500;
}

export function registerAdminImageRoutes(app: Express): void {
  app.get(
    "/api/admin/images/search",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const q = String(req.query.q ?? "").trim();
        const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);
        const limit = Math.min(
          24,
          Math.max(1, Number(req.query.limit ?? 12) || 12),
        );
        if (!q) {
          res.json({ results: [], nextOffset: null, totalHits: 0, offset, limit });
          return;
        }
        const page = await searchCommonsImagesPage(q, { offset, limit });
        res.json({
          results: page.results,
          nextOffset: page.nextOffset,
          totalHits: page.totalHits,
          offset,
          limit,
        });
      } catch (error) {
        console.error("Admin image search failed", error);
        res.status(500).json({
          message:
            error instanceof Error
              ? error.message
              : "Could not search images.",
        });
      }
    },
  );

  app.post(
    "/api/admin/images/set",
    requireAdmin,
    async (req: AuthedRequest, res) => {
      try {
        const parsed = setImageSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ message: "Invalid image selection." });
          return;
        }
        const { target, imageUrl, imageAttribution } = parsed.data;
        const result = await applyImage(target, imageUrl, imageAttribution);
        res.json(result);
      } catch (error) {
        console.error("Admin set image failed", error);
        res.status(statusFromError(error)).json({
          message:
            error instanceof Error ? error.message : "Could not set image.",
        });
      }
    },
  );

  app.post(
    "/api/admin/images/upload",
    requireAdmin,
    (req: AuthedRequest, res, next) => {
      upload.single("image")(req, res, (err) => {
        if (err) {
          res.status(400).json({
            message:
              err instanceof Error ? err.message : "Could not upload image.",
          });
          return;
        }
        next();
      });
    },
    async (req: AuthedRequest, res) => {
      try {
        const file = req.file;
        if (!file) {
          res.status(400).json({ message: "No image uploaded." });
          return;
        }

        let targetRaw: unknown = req.body?.target;
        if (typeof targetRaw === "string") {
          try {
            targetRaw = JSON.parse(targetRaw) as unknown;
          } catch {
            res.status(400).json({ message: "Invalid image target." });
            return;
          }
        }
        const targetParsed = targetSchema.safeParse(targetRaw);
        if (!targetParsed.success) {
          try {
            fs.unlinkSync(file.path);
          } catch {
            // ignore
          }
          res.status(400).json({ message: "Invalid image target." });
          return;
        }

        const imageUrl = `/uploads/admin/${file.filename}`;
        const imageAttribution =
          typeof req.body?.imageAttribution === "string" &&
          req.body.imageAttribution.trim()
            ? req.body.imageAttribution.trim()
            : "Uploaded by admin";

        const result = await applyImage(
          targetParsed.data,
          imageUrl,
          imageAttribution,
        );
        res.json(result);
      } catch (error) {
        console.error("Admin upload image failed", error);
        if (req.file?.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            // ignore
          }
        }
        res.status(statusFromError(error)).json({
          message:
            error instanceof Error
              ? error.message
              : "Could not upload image.",
        });
      }
    },
  );
}
