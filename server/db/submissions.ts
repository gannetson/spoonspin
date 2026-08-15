import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { ensureDb } from "./restaurants.ts";
import type { Drink, Recipe, SpecialtyShop } from "../../src/types/content.ts";

export type SubmissionStatus = "pending" | "approved" | "rejected";
export type SubmissionKind = "recipe" | "restaurant" | "drink" | "shop";

export type RecipeSubmission = {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  status: SubmissionStatus;
  recipe: Recipe;
  confirmationNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type RestaurantSubmissionPayload = {
  name: string;
  address: string;
  city: string;
  postcode?: string;
  website?: string;
  mapsUrl: string;
  lat?: number;
  lng?: number;
  authenticityNotes?: string;
  phone?: string;
};

export type RestaurantSubmission = {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  status: SubmissionStatus;
  restaurant: RestaurantSubmissionPayload;
  restaurantRowId: string | null;
  confirmationNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type DrinkSubmission = {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  status: SubmissionStatus;
  drink: Drink;
  confirmationNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type ShopSubmission = {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  status: SubmissionStatus;
  shop: SpecialtyShop;
  confirmationNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type AnySubmission =
  | ({ kind: "recipe" } & RecipeSubmission)
  | ({ kind: "restaurant" } & RestaurantSubmission)
  | ({ kind: "drink" } & DrinkSubmission)
  | ({ kind: "shop" } & ShopSubmission);

function parseRecipe(value: unknown): Recipe {
  if (typeof value === "string") return JSON.parse(value) as Recipe;
  return value as Recipe;
}

function parseRestaurant(value: unknown): RestaurantSubmissionPayload {
  if (typeof value === "string") {
    return JSON.parse(value) as RestaurantSubmissionPayload;
  }
  return value as RestaurantSubmissionPayload;
}

function parseDrink(value: unknown): Drink {
  if (typeof value === "string") return JSON.parse(value) as Drink;
  return value as Drink;
}

function parseShop(value: unknown): SpecialtyShop {
  if (typeof value === "string") return JSON.parse(value) as SpecialtyShop;
  return value as SpecialtyShop;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return toIso(value);
}

function rowToRecipeSubmission(row: QueryResultRow): RecipeSubmission {
  return {
    id: String(row.id),
    countryCode: String(row.country_code),
    countryName: String(row.country_name),
    query: String(row.query),
    status: String(row.status) as SubmissionStatus,
    recipe: parseRecipe(row.recipe_json),
    confirmationNotes:
      row.confirmation_notes == null ? null : String(row.confirmation_notes),
    createdAt: toIso(row.created_at),
    reviewedAt: toIsoOrNull(row.reviewed_at),
  };
}

function rowToRestaurantSubmission(row: QueryResultRow): RestaurantSubmission {
  return {
    id: String(row.id),
    countryCode: String(row.country_code),
    countryName: String(row.country_name),
    query: String(row.query),
    status: String(row.status) as SubmissionStatus,
    restaurant: parseRestaurant(row.restaurant_json),
    restaurantRowId: row.restaurant_row_id == null ? null : String(row.restaurant_row_id),
    confirmationNotes:
      row.confirmation_notes == null ? null : String(row.confirmation_notes),
    createdAt: toIso(row.created_at),
    reviewedAt: toIsoOrNull(row.reviewed_at),
  };
}

function rowToDrinkSubmission(row: QueryResultRow): DrinkSubmission {
  return {
    id: String(row.id),
    countryCode: String(row.country_code),
    countryName: String(row.country_name),
    query: String(row.query),
    status: String(row.status) as SubmissionStatus,
    drink: parseDrink(row.drink_json),
    confirmationNotes:
      row.confirmation_notes == null ? null : String(row.confirmation_notes),
    createdAt: toIso(row.created_at),
    reviewedAt: toIsoOrNull(row.reviewed_at),
  };
}

function rowToShopSubmission(row: QueryResultRow): ShopSubmission {
  return {
    id: String(row.id),
    countryCode: String(row.country_code),
    countryName: String(row.country_name),
    query: String(row.query),
    status: String(row.status) as SubmissionStatus,
    shop: parseShop(row.shop_json),
    confirmationNotes:
      row.confirmation_notes == null ? null : String(row.confirmation_notes),
    createdAt: toIso(row.created_at),
    reviewedAt: toIsoOrNull(row.reviewed_at),
  };
}

export async function insertRecipeSubmission(input: {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  recipe: Recipe;
  confirmationNotes?: string | null;
}): Promise<RecipeSubmission> {
  const db = await ensureDb();
  const createdAt = new Date().toISOString();
  await db.query(
    `INSERT INTO recipe_submissions
      (id, country_code, country_name, query, status, recipe_json, confirmation_notes, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, $6, $7::timestamptz)`,
    [
      input.id,
      input.countryCode.toLowerCase(),
      input.countryName,
      input.query,
      JSON.stringify(input.recipe),
      input.confirmationNotes ?? null,
      createdAt,
    ],
  );
  const created = await getRecipeSubmission(input.id);
  if (!created) throw new Error(`Failed to insert recipe submission ${input.id}`);
  return created;
}

export async function insertRestaurantSubmission(input: {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  restaurant: RestaurantSubmissionPayload;
  restaurantRowId?: string | null;
  confirmationNotes?: string | null;
}): Promise<RestaurantSubmission> {
  const db = await ensureDb();
  const createdAt = new Date().toISOString();
  await db.query(
    `INSERT INTO restaurant_submissions
      (id, country_code, country_name, query, status, restaurant_json, restaurant_row_id, confirmation_notes, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, $6, $7, $8::timestamptz)`,
    [
      input.id,
      input.countryCode.toLowerCase(),
      input.countryName,
      input.query,
      JSON.stringify(input.restaurant),
      input.restaurantRowId ?? null,
      input.confirmationNotes ?? null,
      createdAt,
    ],
  );
  const created = await getRestaurantSubmission(input.id);
  if (!created) {
    throw new Error(`Failed to insert restaurant submission ${input.id}`);
  }
  return created;
}

export async function insertDrinkSubmission(input: {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  drink: Drink;
  confirmationNotes?: string | null;
}): Promise<DrinkSubmission> {
  const db = await ensureDb();
  const createdAt = new Date().toISOString();
  await db.query(
    `INSERT INTO drink_submissions
      (id, country_code, country_name, query, status, drink_json, confirmation_notes, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, $6, $7::timestamptz)`,
    [
      input.id,
      input.countryCode.toLowerCase(),
      input.countryName,
      input.query,
      JSON.stringify(input.drink),
      input.confirmationNotes ?? null,
      createdAt,
    ],
  );
  const created = await getDrinkSubmission(input.id);
  if (!created) throw new Error(`Failed to insert drink submission ${input.id}`);
  return created;
}

export async function insertShopSubmission(input: {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  shop: SpecialtyShop;
  confirmationNotes?: string | null;
}): Promise<ShopSubmission> {
  const db = await ensureDb();
  const createdAt = new Date().toISOString();
  await db.query(
    `INSERT INTO shop_submissions
      (id, country_code, country_name, query, status, shop_json, confirmation_notes, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, $6, $7::timestamptz)`,
    [
      input.id,
      input.countryCode.toLowerCase(),
      input.countryName,
      input.query,
      JSON.stringify(input.shop),
      input.confirmationNotes ?? null,
      createdAt,
    ],
  );
  const created = await getShopSubmission(input.id);
  if (!created) throw new Error(`Failed to insert shop submission ${input.id}`);
  return created;
}

export async function getRecipeSubmission(
  id: string,
): Promise<RecipeSubmission | undefined> {
  const db = await ensureDb();
  const result = await db.query(`SELECT * FROM recipe_submissions WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? rowToRecipeSubmission(row) : undefined;
}

export async function getRestaurantSubmission(
  id: string,
): Promise<RestaurantSubmission | undefined> {
  const db = await ensureDb();
  const result = await db.query(`SELECT * FROM restaurant_submissions WHERE id = $1`, [
    id,
  ]);
  const row = result.rows[0];
  return row ? rowToRestaurantSubmission(row) : undefined;
}

export async function getDrinkSubmission(
  id: string,
): Promise<DrinkSubmission | undefined> {
  const db = await ensureDb();
  const result = await db.query(`SELECT * FROM drink_submissions WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? rowToDrinkSubmission(row) : undefined;
}

export async function getShopSubmission(id: string): Promise<ShopSubmission | undefined> {
  const db = await ensureDb();
  const result = await db.query(`SELECT * FROM shop_submissions WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? rowToShopSubmission(row) : undefined;
}

/** Visible in the public app: pending + approved. */
export async function listVisibleRecipesForCountry(
  countryCode: string,
): Promise<Recipe[]> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT recipe_json FROM recipe_submissions
     WHERE country_code = $1 AND status IN ('pending', 'approved')
     ORDER BY created_at DESC`,
    [countryCode.toLowerCase()],
  );
  return result.rows.map((row) => parseRecipe(row.recipe_json));
}

export async function listVisibleDrinksForCountry(countryCode: string): Promise<Drink[]> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT drink_json FROM drink_submissions
     WHERE country_code = $1 AND status IN ('pending', 'approved')
     ORDER BY created_at DESC`,
    [countryCode.toLowerCase()],
  );
  return result.rows.map((row) => parseDrink(row.drink_json));
}

export async function listVisibleShopsForCountry(
  countryCode: string,
): Promise<SpecialtyShop[]> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT shop_json FROM shop_submissions
     WHERE country_code = $1 AND status IN ('pending', 'approved')
     ORDER BY created_at DESC`,
    [countryCode.toLowerCase()],
  );
  return result.rows.map((row) => parseShop(row.shop_json));
}

export async function listSubmissions(options?: {
  status?: SubmissionStatus | "all";
  kind?: SubmissionKind | "all";
}): Promise<AnySubmission[]> {
  const status = options?.status ?? "pending";
  const kind = options?.kind ?? "all";
  const db = await ensureDb();
  const out: AnySubmission[] = [];

  if (kind === "all" || kind === "recipe") {
    const result =
      status === "all"
        ? await db.query(`SELECT * FROM recipe_submissions ORDER BY created_at DESC`)
        : await db.query(
            `SELECT * FROM recipe_submissions WHERE status = $1 ORDER BY created_at DESC`,
            [status],
          );
    for (const row of result.rows) {
      out.push({ kind: "recipe", ...rowToRecipeSubmission(row) });
    }
  }

  if (kind === "all" || kind === "restaurant") {
    const result =
      status === "all"
        ? await db.query(`SELECT * FROM restaurant_submissions ORDER BY created_at DESC`)
        : await db.query(
            `SELECT * FROM restaurant_submissions WHERE status = $1 ORDER BY created_at DESC`,
            [status],
          );
    for (const row of result.rows) {
      out.push({ kind: "restaurant", ...rowToRestaurantSubmission(row) });
    }
  }

  if (kind === "all" || kind === "drink") {
    const result =
      status === "all"
        ? await db.query(`SELECT * FROM drink_submissions ORDER BY created_at DESC`)
        : await db.query(
            `SELECT * FROM drink_submissions WHERE status = $1 ORDER BY created_at DESC`,
            [status],
          );
    for (const row of result.rows) {
      out.push({ kind: "drink", ...rowToDrinkSubmission(row) });
    }
  }

  if (kind === "all" || kind === "shop") {
    const result =
      status === "all"
        ? await db.query(`SELECT * FROM shop_submissions ORDER BY created_at DESC`)
        : await db.query(
            `SELECT * FROM shop_submissions WHERE status = $1 ORDER BY created_at DESC`,
            [status],
          );
    for (const row of result.rows) {
      out.push({ kind: "shop", ...rowToShopSubmission(row) });
    }
  }

  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setRecipeSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): Promise<RecipeSubmission | undefined> {
  const reviewedAt = status === "pending" ? null : new Date().toISOString();
  const db = await ensureDb();
  await db.query(
    `UPDATE recipe_submissions SET status = $1, reviewed_at = $2::timestamptz WHERE id = $3`,
    [status, reviewedAt, id],
  );
  return getRecipeSubmission(id);
}

export async function setRestaurantSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): Promise<RestaurantSubmission | undefined> {
  const reviewedAt = status === "pending" ? null : new Date().toISOString();
  const db = await ensureDb();
  await db.query(
    `UPDATE restaurant_submissions SET status = $1, reviewed_at = $2::timestamptz WHERE id = $3`,
    [status, reviewedAt, id],
  );
  return getRestaurantSubmission(id);
}

export async function setDrinkSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): Promise<DrinkSubmission | undefined> {
  const reviewedAt = status === "pending" ? null : new Date().toISOString();
  const db = await ensureDb();
  await db.query(
    `UPDATE drink_submissions SET status = $1, reviewed_at = $2::timestamptz WHERE id = $3`,
    [status, reviewedAt, id],
  );
  return getDrinkSubmission(id);
}

export async function setShopSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): Promise<ShopSubmission | undefined> {
  const reviewedAt = status === "pending" ? null : new Date().toISOString();
  const db = await ensureDb();
  await db.query(
    `UPDATE shop_submissions SET status = $1, reviewed_at = $2::timestamptz WHERE id = $3`,
    [status, reviewedAt, id],
  );
  return getShopSubmission(id);
}

export async function setRestaurantRowReviewed(
  id: string,
  reviewed: boolean,
): Promise<void> {
  const db = await ensureDb();
  await db.query(
    `UPDATE restaurants SET reviewed = $1, updated_at = $2::timestamptz WHERE id = $3`,
    [reviewed, new Date().toISOString(), id],
  );
}

export async function findVisibleCommunityRecipe(
  countryCode: string,
  recipeId: string,
): Promise<{ submissionId: string; recipe: Recipe } | null> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT id, recipe_json FROM recipe_submissions
     WHERE country_code = $1
       AND status IN ('pending', 'approved')
       AND recipe_json->>'id' = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [countryCode.toLowerCase(), recipeId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    submissionId: String(row.id),
    recipe: parseRecipe(row.recipe_json),
  };
}

export async function deleteCommunityRecipe(
  countryCode: string,
  recipeId: string,
): Promise<boolean> {
  const db = await ensureDb();
  const result = await db.query(
    `DELETE FROM recipe_submissions
     WHERE country_code = $1
       AND status IN ('pending', 'approved')
       AND recipe_json->>'id' = $2`,
    [countryCode.toLowerCase(), recipeId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateCommunityRecipe(
  countryCode: string,
  recipeId: string,
  recipe: Recipe,
): Promise<Recipe | null> {
  const found = await findVisibleCommunityRecipe(countryCode, recipeId);
  if (!found) return null;
  const db = await ensureDb();
  await db.query(
    `UPDATE recipe_submissions
     SET recipe_json = $2::jsonb
     WHERE id = $1`,
    [found.submissionId, JSON.stringify(recipe)],
  );
  return recipe;
}

export function slugifyId(prefix: string, name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .slice(0, 40);
  const suffix = randomUUID().slice(0, 8);
  return `${prefix}-${slug || "item"}-${suffix}`;
}
