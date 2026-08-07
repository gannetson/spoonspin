import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import {
  countryCodesFromOsmTags,
  hasPrimaryCuisineMatch,
} from "../../src/restaurants/osmCuisineMap.ts";
import {
  aggregateGuestRating,
  type RestaurantRatings,
} from "../../src/restaurants/ratings.ts";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const DEFAULT_DB_PATH = path.join(rootDir, "data", "restaurants.sqlite");

export type StoredRestaurant = {
  id: string;
  name: string;
  address: string;
  city: string;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  cuisineCodes: string[];
  cuisineTags: string[];
  website: string | null;
  phone: string | null;
  source: string;
  osmId: string;
  mapsUrl: string;
  updatedAt: string;
  reviewed: boolean;
  authenticityRating: number | null;
  authenticityNotes: string | null;
  reviewedAt: string | null;
  reviewSource: string | null;
  userRating: number | null;
  reviewCount: number | null;
  ratings: RestaurantRatings | null;
  photoUrl: string | null;
  photoAttribution: string | null;
};

export type RestaurantUpsert = {
  id: string;
  name: string;
  address: string;
  city: string;
  postcode?: string | null;
  lat?: number | null;
  lng?: number | null;
  cuisineCodes: string[];
  cuisineTags: string[];
  website?: string | null;
  phone?: string | null;
  source: string;
  osmId: string;
  mapsUrl: string;
  reviewed?: boolean;
  authenticityRating?: number | null;
  authenticityNotes?: string | null;
  reviewedAt?: string | null;
  reviewSource?: string | null;
  userRating?: number | null;
  reviewCount?: number | null;
  ratings?: RestaurantRatings | null;
  photoUrl?: string | null;
  photoAttribution?: string | null;
};

let dbInstance: Database.Database | null = null;
let dbPathOpen: string | null = null;

export function getDb(
  dbPath = process.env.RESTAURANTS_DB_PATH || DEFAULT_DB_PATH,
) {
  if (dbInstance && dbPathOpen === dbPath) {
    return dbInstance;
  }
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  migrate(db);
  dbInstance = db;
  dbPathOpen = dbPath;
  return db;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    dbPathOpen = null;
  }
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postcode TEXT,
      lat REAL,
      lng REAL,
      cuisine_codes TEXT NOT NULL,
      cuisine_tags TEXT NOT NULL,
      website TEXT,
      phone TEXT,
      source TEXT NOT NULL,
      osm_id TEXT NOT NULL UNIQUE,
      maps_url TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      reviewed INTEGER NOT NULL DEFAULT 0,
      authenticity_rating REAL,
      authenticity_notes TEXT,
      reviewed_at TEXT,
      review_source TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_restaurants_city
      ON restaurants (city COLLATE NOCASE);
  `);

  const columns = db
    .prepare(`PRAGMA table_info(restaurants)`)
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((c) => c.name));
  const addColumn = (name: string, ddl: string) => {
    if (!names.has(name)) db.exec(`ALTER TABLE restaurants ADD COLUMN ${ddl}`);
  };
  addColumn("reviewed", "reviewed INTEGER NOT NULL DEFAULT 0");
  addColumn("authenticity_rating", "authenticity_rating REAL");
  addColumn("authenticity_notes", "authenticity_notes TEXT");
  addColumn("reviewed_at", "reviewed_at TEXT");
  addColumn("review_source", "review_source TEXT");
  addColumn("user_rating", "user_rating REAL");
  addColumn("review_count", "review_count INTEGER");
  addColumn("ratings_json", "ratings_json TEXT");
  addColumn("photo_url", "photo_url TEXT");
  addColumn("photo_attribution", "photo_attribution TEXT");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_restaurants_reviewed
      ON restaurants (reviewed, authenticity_rating);
  `);
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function parseRatings(value: unknown): RestaurantRatings | null {
  if (value == null || value === "") return null;
  try {
    const parsed: unknown =
      typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as RestaurantRatings;
  } catch {
    return null;
  }
}

function rowToStored(row: Record<string, unknown>): StoredRestaurant {
  const ratings = parseRatings(row.ratings_json);
  const aggregated = aggregateGuestRating(ratings);
  return {
    id: String(row.id),
    name: String(row.name),
    address: String(row.address),
    city: String(row.city),
    postcode: row.postcode == null ? null : String(row.postcode),
    lat: typeof row.lat === "number" ? row.lat : null,
    lng: typeof row.lng === "number" ? row.lng : null,
    cuisineCodes: parseJsonArray(String(row.cuisine_codes)),
    cuisineTags: parseJsonArray(String(row.cuisine_tags)),
    website: row.website == null ? null : String(row.website),
    phone: row.phone == null ? null : String(row.phone),
    source: String(row.source),
    osmId: String(row.osm_id),
    mapsUrl: String(row.maps_url),
    updatedAt: String(row.updated_at),
    reviewed: Number(row.reviewed ?? 0) === 1,
    authenticityRating:
      typeof row.authenticity_rating === "number"
        ? row.authenticity_rating
        : null,
    authenticityNotes:
      row.authenticity_notes == null ? null : String(row.authenticity_notes),
    reviewedAt: row.reviewed_at == null ? null : String(row.reviewed_at),
    reviewSource:
      row.review_source == null ? null : String(row.review_source),
    userRating:
      typeof row.user_rating === "number"
        ? row.user_rating
        : (aggregated.rating ?? null),
    reviewCount:
      typeof row.review_count === "number"
        ? row.review_count
        : (aggregated.reviewCount ?? null),
    ratings,
    photoUrl: row.photo_url == null ? null : String(row.photo_url),
    photoAttribution:
      row.photo_attribution == null ? null : String(row.photo_attribution),
  };
}

export function upsertRestaurant(restaurant: RestaurantUpsert, db = getDb()) {
  const existing = db
    .prepare(`SELECT * FROM restaurants WHERE osm_id = ?`)
    .get(restaurant.osmId) as Record<string, unknown> | undefined;

  const now = new Date().toISOString();
  if (existing) {
    const current = rowToStored(existing);
    const cuisineCodes = Array.from(
      new Set([...current.cuisineCodes, ...restaurant.cuisineCodes]),
    );
    const cuisineTags = Array.from(
      new Set([...current.cuisineTags, ...restaurant.cuisineTags]),
    );
    const reviewed = restaurant.reviewed ?? current.reviewed;
    const ratings = restaurant.ratings
      ? { ...(current.ratings ?? {}), ...restaurant.ratings }
      : current.ratings;
    const aggregated = aggregateGuestRating(ratings);
    const userRating =
      restaurant.userRating ?? aggregated.rating ?? current.userRating;
    const reviewCount =
      restaurant.reviewCount ?? aggregated.reviewCount ?? current.reviewCount;

    db.prepare(
      `UPDATE restaurants SET
        name = ?,
        address = ?,
        city = ?,
        postcode = ?,
        lat = ?,
        lng = ?,
        cuisine_codes = ?,
        cuisine_tags = ?,
        website = ?,
        phone = ?,
        source = ?,
        maps_url = ?,
        updated_at = ?,
        reviewed = ?,
        authenticity_rating = ?,
        authenticity_notes = ?,
        reviewed_at = ?,
        review_source = ?,
        user_rating = ?,
        review_count = ?,
        ratings_json = ?,
        photo_url = ?,
        photo_attribution = ?
      WHERE osm_id = ?`,
    ).run(
      restaurant.name,
      restaurant.address || current.address,
      restaurant.city || current.city,
      restaurant.postcode ?? current.postcode,
      restaurant.lat ?? current.lat,
      restaurant.lng ?? current.lng,
      JSON.stringify(cuisineCodes),
      JSON.stringify(cuisineTags),
      restaurant.website ?? current.website,
      restaurant.phone ?? current.phone,
      restaurant.source,
      restaurant.mapsUrl || current.mapsUrl,
      now,
      reviewed ? 1 : 0,
      restaurant.authenticityRating ?? current.authenticityRating,
      restaurant.authenticityNotes ?? current.authenticityNotes,
      restaurant.reviewedAt ?? current.reviewedAt,
      restaurant.reviewSource ?? current.reviewSource,
      userRating,
      reviewCount,
      ratings ? JSON.stringify(ratings) : null,
      restaurant.photoUrl ?? current.photoUrl,
      restaurant.photoAttribution ?? current.photoAttribution,
      restaurant.osmId,
    );
    return;
  }

  const ratings = restaurant.ratings ?? null;
  const aggregated = aggregateGuestRating(ratings);

  db.prepare(
    `INSERT INTO restaurants (
      id, name, address, city, postcode, lat, lng,
      cuisine_codes, cuisine_tags, website, phone, source, osm_id, maps_url, updated_at,
      reviewed, authenticity_rating, authenticity_notes, reviewed_at, review_source,
      user_rating, review_count, ratings_json, photo_url, photo_attribution
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    restaurant.id,
    restaurant.name,
    restaurant.address,
    restaurant.city,
    restaurant.postcode ?? null,
    restaurant.lat ?? null,
    restaurant.lng ?? null,
    JSON.stringify(restaurant.cuisineCodes),
    JSON.stringify(restaurant.cuisineTags),
    restaurant.website ?? null,
    restaurant.phone ?? null,
    restaurant.source,
    restaurant.osmId,
    restaurant.mapsUrl,
    now,
    restaurant.reviewed ? 1 : 0,
    restaurant.authenticityRating ?? null,
    restaurant.authenticityNotes ?? null,
    restaurant.reviewedAt ?? null,
    restaurant.reviewSource ?? null,
    restaurant.userRating ?? aggregated.rating ?? null,
    restaurant.reviewCount ?? aggregated.reviewCount ?? null,
    ratings ? JSON.stringify(ratings) : null,
    restaurant.photoUrl ?? null,
    restaurant.photoAttribution ?? null,
  );
}

export type LocalSearchOptions = {
  countryCode: string;
  cityOrPostcode?: string;
  visitorLocation?: { lat: number; lng: number };
  maxDistanceKm?: number;
  limit?: number;
  reviewedOnly?: boolean;
};

const CITY_ANCHORS: Record<string, { lat: number; lng: number }> = {
  leiden: { lat: 52.1601, lng: 4.497 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  rotterdam: { lat: 51.9244, lng: 4.4777 },
  utrecht: { lat: 52.0907, lng: 5.1214 },
  "den haag": { lat: 52.0705, lng: 4.3007 },
  "the hague": { lat: 52.0705, lng: 4.3007 },
  "s-gravenhage": { lat: 52.0705, lng: 4.3007 },
  haarlem: { lat: 52.3874, lng: 4.6462 },
  delft: { lat: 52.0116, lng: 4.3571 },
  eindhoven: { lat: 51.4416, lng: 5.4697 },
};

function resolveSearchAnchor(
  cityOrPostcode?: string,
  visitorLocation?: { lat: number; lng: number },
): { lat: number; lng: number } | undefined {
  if (visitorLocation) return visitorLocation;
  const key = cityOrPostcode?.trim().toLowerCase() ?? "";
  for (const [city, coords] of Object.entries(CITY_ANCHORS)) {
    if (key.includes(city)) return coords;
  }
  return CITY_ANCHORS.leiden;
}

export function searchLocalRestaurants(
  options: LocalSearchOptions,
  db = getDb(),
): StoredRestaurant[] {
  const code = options.countryCode.toLowerCase();
  const rows = db
    .prepare(`SELECT * FROM restaurants ORDER BY name COLLATE NOCASE`)
    .all() as Array<Record<string, unknown>>;

  const cityFilter = options.cityOrPostcode?.trim().toLowerCase();
  const maxDistance = options.maxDistanceKm ?? 100;
  const limit = options.limit ?? 50;
  const reviewedOnly = options.reviewedOnly ?? true;
  const anchor = resolveSearchAnchor(
    options.cityOrPostcode,
    options.visitorLocation,
  );

  const matched = rows
    .map(rowToStored)
    .filter((restaurant) => restaurant.cuisineCodes.includes(code))
    .filter(
      (restaurant) =>
        restaurant.source === "user-suggestion" ||
        hasPrimaryCuisineMatch(code, restaurant.cuisineTags),
    )
    .filter((restaurant) => (reviewedOnly ? restaurant.reviewed : true))
    .map((restaurant) => {
      const cityHit = cityFilter
        ? `${restaurant.city} ${restaurant.postcode ?? ""} ${restaurant.address}`
            .toLowerCase()
            .includes(cityFilter)
        : false;
      let distanceKm: number | undefined;
      if (anchor && restaurant.lat != null && restaurant.lng != null) {
        distanceKm = haversineKm(anchor, {
          lat: restaurant.lat,
          lng: restaurant.lng,
        });
      }
      return { restaurant, distanceKm, cityHit };
    })
    .filter((item) => {
      if (item.distanceKm == null) return true;
      return item.distanceKm <= maxDistance;
    });

  return matched
    .sort((a, b) => {
      const aScore = a.restaurant.authenticityRating ?? 0;
      const bScore = b.restaurant.authenticityRating ?? 0;
      if (bScore !== aScore) return bScore - aScore;
      if (a.cityHit !== b.cityHit) return a.cityHit ? -1 : 1;
      if (a.distanceKm == null && b.distanceKm == null) {
        return a.restaurant.name.localeCompare(b.restaurant.name);
      }
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, limit)
    .map((item) => item.restaurant);
}

export function rebuildCuisineCodes(db = getDb()): {
  updated: number;
  deleted: number;
} {
  const rows = db
    .prepare(`SELECT osm_id, cuisine_tags, reviewed FROM restaurants`)
    .all() as Array<{ osm_id: string; cuisine_tags: string; reviewed: number }>;

  const update = db.prepare(
    `UPDATE restaurants SET cuisine_codes = ?, updated_at = ? WHERE osm_id = ?`,
  );
  const remove = db.prepare(`DELETE FROM restaurants WHERE osm_id = ?`);

  let updated = 0;
  let deleted = 0;
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (const row of rows) {
      const tags = parseJsonArray(row.cuisine_tags);
      const codes = countryCodesFromOsmTags(tags);
      if (codes.length === 0 && row.reviewed !== 1) {
        remove.run(row.osm_id);
        deleted += 1;
        continue;
      }
      update.run(JSON.stringify(codes), now, row.osm_id);
      updated += 1;
    }
  });
  tx();
  return { updated, deleted };
}

export function countByCuisineCode(db = getDb()): Record<string, number> {
  const rows = db
    .prepare(`SELECT cuisine_codes FROM restaurants WHERE reviewed = 1`)
    .all() as Array<{ cuisine_codes: string }>;
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const code of parseJsonArray(row.cuisine_codes)) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  return counts;
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
