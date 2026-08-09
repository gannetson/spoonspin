import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import {
  resolveLevelProgress,
  TOTAL_CUISINE_COUNTRIES,
} from "../../src/tags/levels.ts";
import type {
  TagEntityType,
  TagIntent,
  TagSummary,
  UserTag,
} from "../../src/tags/types.ts";
import { ensureDb } from "./restaurants.ts";

export type ListTagsFilter = {
  intent?: TagIntent;
  entityType?: TagEntityType;
  countryCode?: string;
  minRating?: number;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

function parsePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function rowToTag(row: QueryResultRow): UserTag {
  return {
    id: String(row.id),
    entityType: row.entity_type as TagEntityType,
    entityId: String(row.entity_id),
    entityName: String(row.entity_name),
    countryCode: String(row.country_code).toLowerCase(),
    intent: row.intent as TagIntent,
    rating: row.rating == null ? null : Number(row.rating),
    reviewText: row.review_text == null ? null : String(row.review_text),
    photoUrls: parsePhotoUrls(row.photo_urls),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function listUserTags(
  userId: string,
  filter: ListTagsFilter = {},
): Promise<UserTag[]> {
  const db = await ensureDb();
  const clauses = ["user_id = $1"];
  const params: unknown[] = [userId];

  if (filter.intent) {
    params.push(filter.intent);
    clauses.push(`intent = $${params.length}`);
  }
  if (filter.entityType) {
    params.push(filter.entityType);
    clauses.push(`entity_type = $${params.length}`);
  }
  if (filter.countryCode) {
    params.push(filter.countryCode.toLowerCase());
    clauses.push(`LOWER(country_code) = $${params.length}`);
  }
  if (filter.minRating != null) {
    params.push(filter.minRating);
    clauses.push(`rating IS NOT NULL AND rating >= $${params.length}`);
  }

  const result = await db.query(
    `SELECT * FROM user_tags
     WHERE ${clauses.join(" AND ")}
     ORDER BY updated_at DESC`,
    params,
  );
  return result.rows.map(rowToTag);
}

export async function getUserTagById(
  userId: string,
  tagId: string,
): Promise<UserTag | null> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT * FROM user_tags WHERE id = $1 AND user_id = $2`,
    [tagId, userId],
  );
  const row = result.rows[0];
  return row ? rowToTag(row) : null;
}

export async function upsertUserTag(input: {
  userId: string;
  entityType: TagEntityType;
  entityId: string;
  entityName: string;
  countryCode: string;
  intent: TagIntent;
  rating?: number | null;
  reviewText?: string | null;
  /** When true, write reviewText even if null (clear). */
  updateReview?: boolean;
  /** When true, write rating even if null (clear), unless intent is want. */
  updateRating?: boolean;
}): Promise<UserTag> {
  const db = await ensureDb();
  const countryCode = input.countryCode.trim().toLowerCase();
  const entityId = input.entityId.trim();
  const entityName = input.entityName.trim().slice(0, 200) || entityId;

  const updateRating =
    input.updateRating === true || input.rating !== undefined;
  const updateReview =
    input.updateReview === true || input.reviewText !== undefined;

  let rating: number | null = null;
  if (input.intent === "want") {
    rating = null;
  } else if (input.rating != null) {
    rating = Math.max(0, Math.min(5, Math.round(input.rating)));
  }

  let reviewText: string | null = null;
  if (input.reviewText != null) {
    reviewText = input.reviewText.trim().slice(0, 4000);
    if (reviewText === "") reviewText = null;
  }

  const id = randomUUID();
  const result = await db.query(
    `INSERT INTO user_tags (
       id, user_id, entity_type, entity_id, entity_name, country_code,
       intent, rating, review_text, photo_urls, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, '[]'::jsonb, NOW(), NOW()
     )
     ON CONFLICT (user_id, entity_type, entity_id, country_code)
     DO UPDATE SET
       entity_name = EXCLUDED.entity_name,
       intent = EXCLUDED.intent,
       rating = CASE
         WHEN EXCLUDED.intent = 'want' THEN NULL
         WHEN $10::boolean THEN $8
         ELSE user_tags.rating
       END,
       review_text = CASE
         WHEN $11::boolean THEN $9
         ELSE user_tags.review_text
       END,
       updated_at = NOW()
     RETURNING *`,
    [
      id,
      input.userId,
      input.entityType,
      entityId,
      entityName,
      countryCode,
      input.intent,
      rating,
      reviewText,
      input.intent === "want" || updateRating,
      updateReview,
    ],
  );
  return rowToTag(result.rows[0]!);
}

export async function deleteUserTag(
  userId: string,
  tagId: string,
): Promise<boolean> {
  const db = await ensureDb();
  const result = await db.query(
    `DELETE FROM user_tags WHERE id = $1 AND user_id = $2`,
    [tagId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setTagPhotoUrls(
  userId: string,
  tagId: string,
  photoUrls: string[],
): Promise<UserTag | null> {
  const db = await ensureDb();
  const result = await db.query(
    `UPDATE user_tags
     SET photo_urls = $3::jsonb, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [tagId, userId, JSON.stringify(photoUrls)],
  );
  const row = result.rows[0];
  return row ? rowToTag(row) : null;
}

export async function getUserTagSummary(userId: string): Promise<TagSummary> {
  const db = await ensureDb();
  const [countryResult, countResult] = await Promise.all([
    db.query(
      `SELECT DISTINCT LOWER(country_code) AS code
       FROM user_tags
       WHERE user_id = $1
         AND intent = 'did'
         AND entity_type IN ('recipe', 'restaurant')
       ORDER BY code`,
      [userId],
    ),
    db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE intent = 'want')::int AS want,
         COUNT(*) FILTER (WHERE intent = 'did')::int AS did,
         COUNT(*) FILTER (WHERE entity_type = 'recipe')::int AS recipe,
         COUNT(*) FILTER (WHERE entity_type = 'drink')::int AS drink,
         COUNT(*) FILTER (WHERE entity_type = 'restaurant')::int AS restaurant
       FROM user_tags
       WHERE user_id = $1`,
      [userId],
    ),
  ]);

  const countryCodes = countryResult.rows.map((row) => String(row.code));
  const countriesTasted = countryCodes.length;
  const progress = resolveLevelProgress(countriesTasted);
  const counts = countResult.rows[0] ?? {};

  return {
    countriesTasted,
    countryCodes,
    counts: {
      total: Number(counts.total ?? 0),
      want: Number(counts.want ?? 0),
      did: Number(counts.did ?? 0),
      recipe: Number(counts.recipe ?? 0),
      drink: Number(counts.drink ?? 0),
      restaurant: Number(counts.restaurant ?? 0),
    },
    level: {
      countriesTasted,
      totalCountries: TOTAL_CUISINE_COUNTRIES,
      currentId: progress.current?.id ?? null,
      currentThreshold: progress.current?.threshold ?? null,
      nextId: progress.next?.id ?? null,
      nextThreshold: progress.next?.threshold ?? null,
      progressToNext: progress.progressToNext,
    },
  };
}
