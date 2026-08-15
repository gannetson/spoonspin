import { Pool, type PoolClient, type QueryResultRow } from "pg";
import {
  countryCodesFromOsmTags,
  hasPrimaryCuisineMatch,
  osmTagsForCountry,
} from "../../src/restaurants/osmCuisineMap.ts";
import {
  aggregateGuestRating,
  type RestaurantRatings,
} from "../../src/restaurants/ratings.ts";
import type {
  PriceLevel,
  RestaurantMenuItem,
} from "../../src/restaurants/types.ts";

/** Default: Unix socket peer auth (no password). Override with DATABASE_URL. */
export const DEFAULT_DATABASE_URL =
  "postgresql:///spoonspin?host=/var/run/postgresql";

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
  priceLevel: PriceLevel | null;
  menu: RestaurantMenuItem[] | null;
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
  priceLevel?: PriceLevel | null;
  menu?: RestaurantMenuItem[] | null;
  photoUrl?: string | null;
  photoAttribution?: string | null;
};

let pool: Pool | null = null;
let poolUrl: string | null = null;
let migratedForUrl: string | null = null;
/** In-flight migration so concurrent ensureDb() callers share one DDL run. */
let migrateInFlight: Promise<void> | null = null;

export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    DEFAULT_DATABASE_URL
  );
}

const DEFAULT_SOCKET_DIR = "/var/run/postgresql";

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

/**
 * Build node-pg Pool options.
 *
 * Passwordless peer auth needs a Unix socket. TCP `localhost` without a password
 * uses SCRAM and crashes node-pg ("client password must be a string").
 */
export function poolOptions(
  connectionString: string,
): ConstructorParameters<typeof Pool>[0] {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error(
      "Invalid DATABASE_URL. Use postgresql:///spoonspin?host=/var/run/postgresql " +
        "or postgresql://USER:PASSWORD@localhost:5432/spoonspin",
    );
  }

  if (!/^postgres(ql)?:$/i.test(parsed.protocol)) {
    throw new Error(
      `DATABASE_URL must start with postgresql:// (got ${parsed.protocol})`,
    );
  }

  const database =
    decodeURIComponent(parsed.pathname.replace(/^\//, "") || "") || "spoonspin";
  const user = decodeURIComponent(parsed.username || "") || undefined;
  const password = decodeURIComponent(parsed.password || "");
  const hostQuery = parsed.searchParams.get("host")?.trim() || undefined;
  const hostname = parsed.hostname || "";

  if (password) {
    return {
      host: hostname || hostQuery || "localhost",
      port: parsed.port ? Number(parsed.port) : 5432,
      database,
      user,
      password,
    };
  }

  // Explicit socket, or URL with no host (postgresql:///db)
  if (hostQuery || !hostname) {
    return {
      host: hostQuery || DEFAULT_SOCKET_DIR,
      database,
      user,
    };
  }

  // Production passwordless + localhost → force socket (peer), not SCRAM/TCP
  if (process.env.NODE_ENV === "production" && isLoopbackHost(hostname)) {
    console.warn(
      `[db] DATABASE_URL uses ${hostname} without a password; using Unix socket ${DEFAULT_SOCKET_DIR} for peer auth`,
    );
    return {
      host: DEFAULT_SOCKET_DIR,
      database,
      user,
    };
  }

  // Dev/test: allow TCP trust; password must be a string if SCRAM is negotiated
  return {
    host: hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    database,
    user,
    password: "",
  };
}

export function getPool(connectionString = getDatabaseUrl()): Pool {
  if (pool && poolUrl === connectionString) return pool;
  if (pool) {
    void pool.end();
    pool = null;
  }
  const options = poolOptions(connectionString);
  const osUser =
    typeof process.getuid === "function" && process.getuid() === 0
      ? "root"
      : (process.env.USER ?? process.env.LOGNAME ?? "unknown");
  const usingSocket =
    typeof options?.host === "string" && options.host.startsWith("/");
  const usingPassword =
    Boolean(options && "password" in options && options.password);

  // Peer auth maps OS user → DB role. Root has no DB role on a normal install.
  if (usingSocket && !usingPassword && osUser === "root") {
    throw new Error(
      'Peer auth cannot connect as OS user "root". ' +
        "Run the API as www-data (supervisor user=www-data), not root. " +
        "Check: sudo supervisorctl stop spoonspin; " +
        "grep user= /etc/supervisor/conf.d/spoonspin.conf; " +
        "sudo supervisorctl start spoonspin",
    );
  }

  console.info(
    "[db] connecting",
    JSON.stringify({
      osUser,
      host: options?.host ?? null,
      port:
        "port" in (options ?? {})
          ? ((options as { port?: number }).port ?? null)
          : null,
      database: options?.database ?? null,
      user: options?.user ?? `(os:${osUser})`,
      password: usingPassword ? "(set)" : "(none)",
    }),
  );
  pool = new Pool(options);
  poolUrl = connectionString;
  return pool;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    poolUrl = null;
    migratedForUrl = null;
    migrateInFlight = null;
  }
}

/** Ensure schema exists (idempotent). Call before reads/writes. */
export async function ensureDb(): Promise<Pool> {
  const url = getDatabaseUrl();
  const db = getPool(url);
  if (migratedForUrl === url) return db;

  if (!migrateInFlight) {
    migrateInFlight = migrate(db)
      .then(() => {
        migratedForUrl = url;
      })
      .finally(() => {
        migrateInFlight = null;
      });
  }

  await migrateInFlight;
  return db;
}

/** @deprecated Use ensureDb() — kept for call-site clarity during migration. */
export async function getDb(): Promise<Pool> {
  return ensureDb();
}

function isInsufficientPrivilege(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: unknown }).code === "42501",
  );
}

/**
 * Run additive DDL. If the app DB role is not the table owner (common after
 * imports / role mismatches on production), skip and warn instead of taking
 * down every request that calls ensureDb().
 */
async function migrateSql(db: Pool, sql: string): Promise<void> {
  try {
    await db.query(sql);
  } catch (error) {
    if (isInsufficientPrivilege(error)) {
      console.warn(
        "DB migration skipped (insufficient privilege / not table owner):",
        error instanceof Error ? error.message : error,
      );
      return;
    }
    throw error;
  }
}

async function migrate(db: Pool) {
  await migrateSql(
    db,
    `
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postcode TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      cuisine_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
      cuisine_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      website TEXT,
      phone TEXT,
      source TEXT NOT NULL,
      osm_id TEXT NOT NULL UNIQUE,
      maps_url TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      reviewed BOOLEAN NOT NULL DEFAULT FALSE,
      authenticity_rating DOUBLE PRECISION,
      authenticity_notes TEXT,
      reviewed_at TIMESTAMPTZ,
      review_source TEXT,
      user_rating DOUBLE PRECISION,
      review_count INTEGER,
      ratings_json JSONB,
      price_level INTEGER,
      menu_json JSONB,
      photo_url TEXT,
      photo_attribution TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_restaurants_city_lower
      ON restaurants (LOWER(city));
    CREATE INDEX IF NOT EXISTS idx_restaurants_reviewed
      ON restaurants (reviewed, authenticity_rating);

    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS price_level INTEGER;
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS menu_json JSONB;
  `,
  );

  await migrateSql(
    db,
    `
    CREATE TABLE IF NOT EXISTS recipe_submissions (
      id TEXT PRIMARY KEY,
      country_code TEXT NOT NULL,
      country_name TEXT NOT NULL,
      query TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      recipe_json JSONB NOT NULL,
      confirmation_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      reviewed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_recipe_submissions_country_status
      ON recipe_submissions (country_code, status);

    CREATE TABLE IF NOT EXISTS restaurant_submissions (
      id TEXT PRIMARY KEY,
      country_code TEXT NOT NULL,
      country_name TEXT NOT NULL,
      query TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      restaurant_json JSONB NOT NULL,
      restaurant_row_id TEXT,
      confirmation_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      reviewed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_restaurant_submissions_country_status
      ON restaurant_submissions (country_code, status);

    CREATE TABLE IF NOT EXISTS drink_submissions (
      id TEXT PRIMARY KEY,
      country_code TEXT NOT NULL,
      country_name TEXT NOT NULL,
      query TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      drink_json JSONB NOT NULL,
      confirmation_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      reviewed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_drink_submissions_country_status
      ON drink_submissions (country_code, status);

    CREATE TABLE IF NOT EXISTS shop_submissions (
      id TEXT PRIMARY KEY,
      country_code TEXT NOT NULL,
      country_name TEXT NOT NULL,
      query TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      shop_json JSONB NOT NULL,
      confirmation_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      reviewed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_shop_submissions_country_status
      ON shop_submissions (country_code, status);
  `,
  );

  // Split ownership-sensitive DDL so one privilege failure cannot abort later
  // CREATE TABLE IF NOT EXISTS steps in the same batch.
  await migrateSql(
    db,
    `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT users_role_check
        CHECK (role IN ('member', 'editor', 'admin'))
    );
  `,
  );

  await migrateSql(
    db,
    `
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

    DO $$
    BEGIN
      ALTER TABLE users
        ADD CONSTRAINT users_role_check
        CHECK (role IN ('member', 'editor', 'admin'));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
      ON users (LOWER(email));

    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
  `,
  );

  await migrateSql(
    db,
    `
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
  `,
  );

  await migrateSql(
    db,
    `
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (provider, provider_user_id),
      CONSTRAINT oauth_accounts_provider_check
        CHECK (provider IN ('google', 'apple'))
    );
  `,
  );

  await migrateSql(
    db,
    `
    CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id
      ON oauth_accounts (user_id);
  `,
  );

  await migrateSql(
    db,
    `
    UPDATE users u
    SET last_login_at = s.max_created
    FROM (
      SELECT user_id, MAX(created_at) AS max_created
      FROM sessions
      GROUP BY user_id
    ) s
    WHERE u.id = s.user_id
      AND u.last_login_at IS NULL;
  `,
  );

  await migrateSql(
    db,
    `
    CREATE TABLE IF NOT EXISTS countries (
      code TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      flag TEXT NOT NULL,
      region TEXT NOT NULL,
      introduction TEXT NOT NULL,
      cuisine_aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
      national_dish_id TEXT,
      national_drink JSONB,
      menu_drink JSONB,
      more_drinks JSONB NOT NULL DEFAULT '[]'::jsonb,
      wikipedia JSONB,
      specialty_shops JSONB NOT NULL DEFAULT '[]'::jsonb,
      image_url TEXT,
      image_attribution TEXT,
      cook_ready BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'published',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE countries ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS image_attribution TEXT;
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS dinner_json JSONB;
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS order_options JSONB NOT NULL DEFAULT '[]'::jsonb;

    CREATE INDEX IF NOT EXISTS idx_countries_cook_ready
      ON countries (cook_ready);

    CREATE TABLE IF NOT EXISTS recipes (
      country_code TEXT NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
      id TEXT NOT NULL,
      menu_slot TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL,
      local_name TEXT,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      servings INTEGER NOT NULL,
      prep_minutes INTEGER NOT NULL,
      cook_minutes INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      dietary_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
      ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
      steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      substitutions JSONB,
      serving_suggestion TEXT,
      drink_pairing TEXT,
      image_url TEXT,
      image_attribution TEXT,
      source_url TEXT,
      video_url TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (country_code, id)
    );

    CREATE INDEX IF NOT EXISTS idx_recipes_country_slot
      ON recipes (country_code, menu_slot, sort_order);

    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS wait_time TEXT;

    CREATE TABLE IF NOT EXISTS user_tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_name TEXT NOT NULL,
      country_code TEXT NOT NULL,
      intent TEXT NOT NULL,
      rating INTEGER,
      review_text TEXT,
      photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_tags_entity_type_check
        CHECK (entity_type IN ('recipe', 'drink', 'restaurant', 'shop')),
      CONSTRAINT user_tags_intent_check
        CHECK (intent IN ('want', 'did')),
      CONSTRAINT user_tags_rating_check
        CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tags_unique_item
      ON user_tags (user_id, entity_type, entity_id, country_code);

    CREATE INDEX IF NOT EXISTS idx_user_tags_user_intent
      ON user_tags (user_id, intent);

    CREATE INDEX IF NOT EXISTS idx_user_tags_user_country
      ON user_tags (user_id, country_code);
  `,
  );

  await migrateSql(
    db,
    `
    ALTER TABLE user_tags DROP CONSTRAINT IF EXISTS user_tags_entity_type_check;
    ALTER TABLE user_tags ADD CONSTRAINT user_tags_entity_type_check
      CHECK (entity_type IN ('recipe', 'drink', 'restaurant', 'shop'));
  `,
  );

  await migrateSql(
    db,
    `
    CREATE TABLE IF NOT EXISTS content_flags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_name TEXT NOT NULL,
      country_code TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      CONSTRAINT content_flags_entity_type_check
        CHECK (entity_type IN ('recipe', 'drink', 'restaurant', 'shop')),
      CONSTRAINT content_flags_status_check
        CHECK (status IN ('open', 'resolved', 'dismissed'))
    );

    CREATE INDEX IF NOT EXISTS idx_content_flags_status_created
      ON content_flags (status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_content_flags_entity
      ON content_flags (entity_type, entity_id);
  `,
  );

  await migrateSql(
    db,
    `
    CREATE TABLE IF NOT EXISTS api_request_logs (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      ip TEXT NOT NULL,
      user_agent TEXT,
      user_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at
      ON api_request_logs (created_at);
    CREATE INDEX IF NOT EXISTS idx_api_request_logs_ip_created
      ON api_request_logs (ip, created_at);
    CREATE INDEX IF NOT EXISTS idx_api_request_logs_path_created
      ON api_request_logs (path, created_at);

    CREATE TABLE IF NOT EXISTS product_events (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      event_type TEXT NOT NULL,
      ip TEXT NOT NULL,
      user_id TEXT,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE INDEX IF NOT EXISTS idx_product_events_created_at
      ON product_events (created_at);
    CREATE INDEX IF NOT EXISTS idx_product_events_type_created
      ON product_events (event_type, created_at);
  `,
  );
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return [];
    }
  }
  return [];
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

function parsePriceLevel(value: unknown): PriceLevel | null {
  const n = toNumberOrNull(value);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return null;
}

function parseMenu(value: unknown): RestaurantMenuItem[] | null {
  if (value == null || value === "") return null;
  try {
    const parsed: unknown =
      typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return null;
    const items: RestaurantMenuItem[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const row = entry as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id.trim() : "";
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!id || !name) continue;
      const item: RestaurantMenuItem = { id, name };
      if (typeof row.localName === "string" && row.localName.trim()) {
        item.localName = row.localName.trim();
      }
      if (typeof row.description === "string" && row.description.trim()) {
        item.description = row.description.trim();
      }
      const category = row.category;
      if (
        category === "starter" ||
        category === "main" ||
        category === "side" ||
        category === "dessert" ||
        category === "snack" ||
        category === "drink"
      ) {
        item.category = category;
      }
      const priceEur = toNumberOrNull(row.priceEur);
      if (priceEur != null && priceEur > 0) item.priceEur = priceEur;
      items.push(item);
    }
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value ?? "");
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return toIso(value);
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function rowToStored(row: QueryResultRow): StoredRestaurant {
  const ratings = parseRatings(row.ratings_json);
  const aggregated = aggregateGuestRating(ratings);
  return {
    id: String(row.id),
    name: String(row.name),
    address: String(row.address),
    city: String(row.city),
    postcode: row.postcode == null ? null : String(row.postcode),
    lat: toNumberOrNull(row.lat),
    lng: toNumberOrNull(row.lng),
    cuisineCodes: asStringArray(row.cuisine_codes),
    cuisineTags: asStringArray(row.cuisine_tags),
    website: row.website == null ? null : String(row.website),
    phone: row.phone == null ? null : String(row.phone),
    source: String(row.source),
    osmId: String(row.osm_id),
    mapsUrl: String(row.maps_url),
    updatedAt: toIso(row.updated_at),
    reviewed: Boolean(row.reviewed),
    authenticityRating: toNumberOrNull(row.authenticity_rating),
    authenticityNotes:
      row.authenticity_notes == null ? null : String(row.authenticity_notes),
    reviewedAt: toIsoOrNull(row.reviewed_at),
    reviewSource:
      row.review_source == null ? null : String(row.review_source),
    userRating:
      toNumberOrNull(row.user_rating) ?? aggregated.rating ?? null,
    reviewCount:
      toNumberOrNull(row.review_count) ?? aggregated.reviewCount ?? null,
    ratings,
    priceLevel: parsePriceLevel(row.price_level),
    menu: parseMenu(row.menu_json),
    photoUrl: row.photo_url == null ? null : String(row.photo_url),
    photoAttribution:
      row.photo_attribution == null ? null : String(row.photo_attribution),
  };
}

export async function upsertRestaurant(
  restaurant: RestaurantUpsert,
): Promise<void> {
  const db = await ensureDb();
  const existingResult = await db.query(
    `SELECT * FROM restaurants WHERE osm_id = $1`,
    [restaurant.osmId],
  );
  const existing = existingResult.rows[0] as QueryResultRow | undefined;
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

    await db.query(
      `UPDATE restaurants SET
        name = $1,
        address = $2,
        city = $3,
        postcode = $4,
        lat = $5,
        lng = $6,
        cuisine_codes = $7::jsonb,
        cuisine_tags = $8::jsonb,
        website = $9,
        phone = $10,
        source = $11,
        maps_url = $12,
        updated_at = $13::timestamptz,
        reviewed = $14,
        authenticity_rating = $15,
        authenticity_notes = $16,
        reviewed_at = $17::timestamptz,
        review_source = $18,
        user_rating = $19,
        review_count = $20,
        ratings_json = $21::jsonb,
        photo_url = $22,
        photo_attribution = $23,
        price_level = $24,
        menu_json = $25::jsonb
      WHERE osm_id = $26`,
      [
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
        reviewed,
        restaurant.authenticityRating ?? current.authenticityRating,
        restaurant.authenticityNotes ?? current.authenticityNotes,
        restaurant.reviewedAt ?? current.reviewedAt,
        restaurant.reviewSource ?? current.reviewSource,
        userRating,
        reviewCount,
        ratings ? JSON.stringify(ratings) : null,
        restaurant.photoUrl ?? current.photoUrl,
        restaurant.photoAttribution ?? current.photoAttribution,
        restaurant.priceLevel ?? current.priceLevel,
        restaurant.menu !== undefined
          ? restaurant.menu
            ? JSON.stringify(restaurant.menu)
            : null
          : current.menu
            ? JSON.stringify(current.menu)
            : null,
        restaurant.osmId,
      ],
    );
    return;
  }

  const ratings = restaurant.ratings ?? null;
  const aggregated = aggregateGuestRating(ratings);

  await db.query(
    `INSERT INTO restaurants (
      id, name, address, city, postcode, lat, lng,
      cuisine_codes, cuisine_tags, website, phone, source, osm_id, maps_url, updated_at,
      reviewed, authenticity_rating, authenticity_notes, reviewed_at, review_source,
      user_rating, review_count, ratings_json, photo_url, photo_attribution,
      price_level, menu_json
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14, $15::timestamptz,
      $16, $17, $18, $19::timestamptz, $20,
      $21, $22, $23::jsonb, $24, $25,
      $26, $27::jsonb
    )`,
    [
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
      restaurant.reviewed ?? false,
      restaurant.authenticityRating ?? null,
      restaurant.authenticityNotes ?? null,
      restaurant.reviewedAt ?? null,
      restaurant.reviewSource ?? null,
      restaurant.userRating ?? aggregated.rating ?? null,
      restaurant.reviewCount ?? aggregated.reviewCount ?? null,
      ratings ? JSON.stringify(ratings) : null,
      restaurant.photoUrl ?? null,
      restaurant.photoAttribution ?? null,
      restaurant.priceLevel ?? null,
      restaurant.menu ? JSON.stringify(restaurant.menu) : null,
    ],
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

export async function listRestaurants(options?: {
  reviewedOnly?: boolean;
}): Promise<StoredRestaurant[]> {
  const db = await ensureDb();
  const reviewedOnly = options?.reviewedOnly;
  const result =
    reviewedOnly === undefined
      ? await db.query(`SELECT * FROM restaurants ORDER BY LOWER(name)`)
      : await db.query(
          `SELECT * FROM restaurants WHERE reviewed = $1 ORDER BY LOWER(name)`,
          [reviewedOnly],
        );
  return result.rows.map(rowToStored);
}

export async function getRestaurantById(
  id: string,
): Promise<StoredRestaurant | null> {
  const db = await ensureDb();
  const result = await db.query(`SELECT * FROM restaurants WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? rowToStored(row) : null;
}

export async function deleteRestaurantById(id: string): Promise<boolean> {
  const db = await ensureDb();
  const result = await db.query(`DELETE FROM restaurants WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function updateRestaurantPhoto(
  id: string,
  photoUrl: string,
  photoAttribution?: string | null,
): Promise<StoredRestaurant | null> {
  const db = await ensureDb();
  await db.query(
    `UPDATE restaurants
     SET photo_url = $2,
         photo_attribution = $3,
         updated_at = $4::timestamptz
     WHERE id = $1`,
    [id, photoUrl, photoAttribution ?? null, new Date().toISOString()],
  );
  return getRestaurantById(id);
}

function cuisineTagsForCodes(codes: string[]): string[] {
  const tags = new Set<string>();
  for (const code of codes) {
    for (const tag of osmTagsForCountry(code)) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

export async function updateRestaurantNotes(
  id: string,
  authenticityNotes: string,
  options?: { cuisineCodes?: string[] },
): Promise<StoredRestaurant | null> {
  const db = await ensureDb();
  const codes = options?.cuisineCodes?.map((code) => code.toLowerCase()) ?? [];
  if (codes.length > 0) {
    const tags = cuisineTagsForCodes(codes);
    await db.query(
      `UPDATE restaurants
       SET authenticity_notes = $2,
           cuisine_codes = $3::jsonb,
           cuisine_tags = $4::jsonb,
           updated_at = $5::timestamptz
       WHERE id = $1`,
      [
        id,
        authenticityNotes,
        JSON.stringify(codes),
        JSON.stringify(tags.length > 0 ? tags : codes),
        new Date().toISOString(),
      ],
    );
  } else {
    await db.query(
      `UPDATE restaurants
       SET authenticity_notes = $2,
           updated_at = $3::timestamptz
       WHERE id = $1`,
      [id, authenticityNotes, new Date().toISOString()],
    );
  }
  return getRestaurantById(id);
}

export async function updateRestaurantMenu(
  id: string,
  menu: RestaurantMenuItem[],
  options?: { cuisineCodes?: string[] },
): Promise<StoredRestaurant | null> {
  const db = await ensureDb();
  const codes = options?.cuisineCodes?.map((code) => code.toLowerCase()) ?? [];
  if (codes.length > 0) {
    const tags = cuisineTagsForCodes(codes);
    await db.query(
      `UPDATE restaurants
       SET menu_json = $2::jsonb,
           cuisine_codes = $3::jsonb,
           cuisine_tags = $4::jsonb,
           updated_at = $5::timestamptz
       WHERE id = $1`,
      [
        id,
        JSON.stringify(menu),
        JSON.stringify(codes),
        JSON.stringify(tags.length > 0 ? tags : codes),
        new Date().toISOString(),
      ],
    );
  } else {
    await db.query(
      `UPDATE restaurants
       SET menu_json = $2::jsonb,
           updated_at = $3::timestamptz
       WHERE id = $1`,
      [id, JSON.stringify(menu), new Date().toISOString()],
    );
  }
  return getRestaurantById(id);
}

export async function updateRestaurantScoresAndAuthenticity(
  id: string,
  input: {
    ratings: RestaurantRatings;
    priceLevel: PriceLevel | null;
    authenticityRating: number;
    authenticityNotes: string;
  },
): Promise<StoredRestaurant | null> {
  const db = await ensureDb();
  const current = await getRestaurantById(id);
  if (!current) return null;
  const ratings = { ...(current.ratings ?? {}), ...input.ratings };
  const aggregated = aggregateGuestRating(ratings);
  await db.query(
    `UPDATE restaurants
     SET ratings_json = $2::jsonb,
         user_rating = $3,
         review_count = $4,
         price_level = $5,
         authenticity_rating = $6,
         authenticity_notes = $7,
         updated_at = $8::timestamptz
     WHERE id = $1`,
    [
      id,
      JSON.stringify(ratings),
      aggregated.rating ?? current.userRating,
      aggregated.reviewCount ?? current.reviewCount,
      input.priceLevel,
      input.authenticityRating,
      input.authenticityNotes,
      new Date().toISOString(),
    ],
  );
  return getRestaurantById(id);
}

export async function searchLocalRestaurants(
  options: LocalSearchOptions,
): Promise<StoredRestaurant[]> {
  const code = options.countryCode.toLowerCase();
  const rows = await listRestaurants();

  const cityFilter = options.cityOrPostcode?.trim().toLowerCase();
  const maxDistance = options.maxDistanceKm ?? 100;
  const limit = options.limit ?? 50;
  const reviewedOnly = options.reviewedOnly ?? true;
  const anchor = resolveSearchAnchor(
    options.cityOrPostcode,
    options.visitorLocation,
  );

  const matched = rows
    .filter((restaurant) => restaurant.cuisineCodes.includes(code))
    .filter(
      (restaurant) =>
        // Trust curated cuisine codes for admin/user adds (tags may be aliases).
        restaurant.source === "user-suggestion" ||
        restaurant.source === "admin-discover" ||
        hasPrimaryCuisineMatch(code, restaurant.cuisineTags),
    )
    // Weak authenticity scores are usually false positives / thin matches.
    .filter((restaurant) => {
      if (restaurant.authenticityRating == null) return true;
      return restaurant.authenticityRating >= 3;
    })
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
      if (item.distanceKm == null) {
        // Admin/user adds should be geocoded; without coords they often are invented.
        const source = item.restaurant.source;
        if (source === "admin-discover" || source === "user-suggestion") {
          return false;
        }
        return true;
      }
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

export async function rebuildCuisineCodes(): Promise<{
  updated: number;
  deleted: number;
}> {
  const db = await ensureDb();
  const client = await db.connect();
  let updated = 0;
  let deleted = 0;
  const now = new Date().toISOString();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT osm_id, cuisine_tags, reviewed FROM restaurants`,
    );

    for (const row of result.rows) {
      const tags = asStringArray(row.cuisine_tags);
      const codes = countryCodesFromOsmTags(tags);
      if (codes.length === 0 && !row.reviewed) {
        await client.query(`DELETE FROM restaurants WHERE osm_id = $1`, [
          row.osm_id,
        ]);
        deleted += 1;
        continue;
      }
      await client.query(
        `UPDATE restaurants SET cuisine_codes = $1::jsonb, updated_at = $2::timestamptz WHERE osm_id = $3`,
        [JSON.stringify(codes), now, row.osm_id],
      );
      updated += 1;
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { updated, deleted };
}

export async function countByCuisineCode(): Promise<Record<string, number>> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT cuisine_codes FROM restaurants WHERE reviewed = TRUE`,
  );
  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    for (const code of asStringArray(row.cuisine_codes)) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  return counts;
}

/** Truncate all app tables — for tests only. */
export async function resetAllTables(client?: PoolClient): Promise<void> {
  const db = client ?? (await ensureDb());
  await db.query(`
    TRUNCATE TABLE
      restaurants,
      recipe_submissions,
      restaurant_submissions,
      drink_submissions,
      shop_submissions,
      sessions,
      recipes,
      countries,
      users
    RESTART IDENTITY CASCADE
  `);
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
