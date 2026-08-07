import { randomUUID } from "node:crypto";
import { getDb } from "./restaurants.ts";
import type { Recipe } from "../../src/types/content.ts";

export type SubmissionStatus = "pending" | "approved" | "rejected";
export type SubmissionKind = "recipe" | "restaurant";

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

export type AnySubmission =
  | ({ kind: "recipe" } & RecipeSubmission)
  | ({ kind: "restaurant" } & RestaurantSubmission);

function migrateSubmissions() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipe_submissions (
      id TEXT PRIMARY KEY,
      country_code TEXT NOT NULL,
      country_name TEXT NOT NULL,
      query TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      recipe_json TEXT NOT NULL,
      confirmation_notes TEXT,
      created_at TEXT NOT NULL,
      reviewed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_recipe_submissions_country_status
      ON recipe_submissions (country_code, status);

    CREATE TABLE IF NOT EXISTS restaurant_submissions (
      id TEXT PRIMARY KEY,
      country_code TEXT NOT NULL,
      country_name TEXT NOT NULL,
      query TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      restaurant_json TEXT NOT NULL,
      restaurant_row_id TEXT,
      confirmation_notes TEXT,
      created_at TEXT NOT NULL,
      reviewed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_restaurant_submissions_country_status
      ON restaurant_submissions (country_code, status);
  `);
}

let submissionsReadyFor: string | null = null;

function dbReady() {
  const db = getDb();
  const pathKey = process.env.RESTAURANTS_DB_PATH || "default";
  if (submissionsReadyFor !== pathKey) {
    migrateSubmissions();
    submissionsReadyFor = pathKey;
  }
  return db;
}

function parseRecipe(json: string): Recipe {
  return JSON.parse(json) as Recipe;
}

function parseRestaurant(json: string): RestaurantSubmissionPayload {
  return JSON.parse(json) as RestaurantSubmissionPayload;
}

function rowToRecipeSubmission(row: Record<string, unknown>): RecipeSubmission {
  return {
    id: String(row.id),
    countryCode: String(row.country_code),
    countryName: String(row.country_name),
    query: String(row.query),
    status: String(row.status) as SubmissionStatus,
    recipe: parseRecipe(String(row.recipe_json)),
    confirmationNotes:
      row.confirmation_notes == null ? null : String(row.confirmation_notes),
    createdAt: String(row.created_at),
    reviewedAt: row.reviewed_at == null ? null : String(row.reviewed_at),
  };
}

function rowToRestaurantSubmission(
  row: Record<string, unknown>,
): RestaurantSubmission {
  return {
    id: String(row.id),
    countryCode: String(row.country_code),
    countryName: String(row.country_name),
    query: String(row.query),
    status: String(row.status) as SubmissionStatus,
    restaurant: parseRestaurant(String(row.restaurant_json)),
    restaurantRowId:
      row.restaurant_row_id == null ? null : String(row.restaurant_row_id),
    confirmationNotes:
      row.confirmation_notes == null ? null : String(row.confirmation_notes),
    createdAt: String(row.created_at),
    reviewedAt: row.reviewed_at == null ? null : String(row.reviewed_at),
  };
}

export function insertRecipeSubmission(input: {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  recipe: Recipe;
  confirmationNotes?: string | null;
}): RecipeSubmission {
  const db = dbReady();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO recipe_submissions
      (id, country_code, country_name, query, status, recipe_json, confirmation_notes, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
  ).run(
    input.id,
    input.countryCode.toLowerCase(),
    input.countryName,
    input.query,
    JSON.stringify(input.recipe),
    input.confirmationNotes ?? null,
    createdAt,
  );
  return getRecipeSubmission(input.id)!;
}

export function insertRestaurantSubmission(input: {
  id: string;
  countryCode: string;
  countryName: string;
  query: string;
  restaurant: RestaurantSubmissionPayload;
  restaurantRowId?: string | null;
  confirmationNotes?: string | null;
}): RestaurantSubmission {
  const db = dbReady();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO restaurant_submissions
      (id, country_code, country_name, query, status, restaurant_json, restaurant_row_id, confirmation_notes, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.countryCode.toLowerCase(),
    input.countryName,
    input.query,
    JSON.stringify(input.restaurant),
    input.restaurantRowId ?? null,
    input.confirmationNotes ?? null,
    createdAt,
  );
  return getRestaurantSubmission(input.id)!;
}

export function getRecipeSubmission(id: string): RecipeSubmission | undefined {
  const row = dbReady()
    .prepare(`SELECT * FROM recipe_submissions WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToRecipeSubmission(row) : undefined;
}

export function getRestaurantSubmission(
  id: string,
): RestaurantSubmission | undefined {
  const row = dbReady()
    .prepare(`SELECT * FROM restaurant_submissions WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToRestaurantSubmission(row) : undefined;
}

/** Visible in the public app: pending + approved. */
export function listVisibleRecipesForCountry(countryCode: string): Recipe[] {
  const rows = dbReady()
    .prepare(
      `SELECT recipe_json FROM recipe_submissions
       WHERE country_code = ? AND status IN ('pending', 'approved')
       ORDER BY created_at DESC`,
    )
    .all(countryCode.toLowerCase()) as Array<{ recipe_json: string }>;
  return rows.map((row) => parseRecipe(row.recipe_json));
}

export function listSubmissions(options?: {
  status?: SubmissionStatus | "all";
  kind?: SubmissionKind | "all";
}): AnySubmission[] {
  const status = options?.status ?? "pending";
  const kind = options?.kind ?? "all";
  const db = dbReady();
  const out: AnySubmission[] = [];

  if (kind === "all" || kind === "recipe") {
    const sql =
      status === "all"
        ? `SELECT * FROM recipe_submissions ORDER BY created_at DESC`
        : `SELECT * FROM recipe_submissions WHERE status = ? ORDER BY created_at DESC`;
    const rows = (
      status === "all" ? db.prepare(sql).all() : db.prepare(sql).all(status)
    ) as Array<Record<string, unknown>>;
    for (const row of rows) {
      out.push({ kind: "recipe", ...rowToRecipeSubmission(row) });
    }
  }

  if (kind === "all" || kind === "restaurant") {
    const sql =
      status === "all"
        ? `SELECT * FROM restaurant_submissions ORDER BY created_at DESC`
        : `SELECT * FROM restaurant_submissions WHERE status = ? ORDER BY created_at DESC`;
    const rows = (
      status === "all" ? db.prepare(sql).all() : db.prepare(sql).all(status)
    ) as Array<Record<string, unknown>>;
    for (const row of rows) {
      out.push({ kind: "restaurant", ...rowToRestaurantSubmission(row) });
    }
  }

  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function setRecipeSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): RecipeSubmission | undefined {
  const reviewedAt = status === "pending" ? null : new Date().toISOString();
  dbReady()
    .prepare(
      `UPDATE recipe_submissions SET status = ?, reviewed_at = ? WHERE id = ?`,
    )
    .run(status, reviewedAt, id);
  return getRecipeSubmission(id);
}

export function setRestaurantSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): RestaurantSubmission | undefined {
  const reviewedAt = status === "pending" ? null : new Date().toISOString();
  dbReady()
    .prepare(
      `UPDATE restaurant_submissions SET status = ?, reviewed_at = ? WHERE id = ?`,
    )
    .run(status, reviewedAt, id);
  return getRestaurantSubmission(id);
}

export function setRestaurantRowReviewed(id: string, reviewed: boolean) {
  dbReady()
    .prepare(
      `UPDATE restaurants SET reviewed = ?, updated_at = ? WHERE id = ?`,
    )
    .run(reviewed ? 1 : 0, new Date().toISOString(), id);
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
