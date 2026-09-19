import { randomUUID } from "node:crypto";
import type { Pool, QueryResultRow } from "pg";
import {
  PROVIDER_CAPABILITY_CATALOG,
  PROVIDER_DEFAULT_PRIORITY,
} from "../reservations/config.ts";
import type {
  ProviderMatchStatus,
  ReservationProviderKey,
  RestaurantReservationLink,
} from "../reservations/types.ts";
import { ensureDb } from "./restaurants.ts";

const PROVIDER_KEYS: ReservationProviderKey[] = [
  "zenchef",
  "guestplan",
  "thefork",
];

export async function migrateReservationTables(db: Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS reservation_providers (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 100,
      supports_availability BOOLEAN NOT NULL DEFAULT FALSE,
      supports_booking BOOLEAN NOT NULL DEFAULT FALSE,
      supports_deep_link BOOLEAN NOT NULL DEFAULT FALSE,
      supports_affiliate_attribution BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS restaurant_reservation_providers (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      provider_key TEXT NOT NULL REFERENCES reservation_providers(key),
      external_restaurant_id TEXT,
      booking_url TEXT,
      match_confidence DOUBLE PRECISION,
      match_status TEXT NOT NULL DEFAULT 'unmatched',
      verified_at TIMESTAMPTZ,
      last_checked_at TIMESTAMPTZ,
      active BOOLEAN NOT NULL DEFAULT FALSE,
      metadata_json JSONB,
      UNIQUE (restaurant_id, provider_key)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_rrp_provider_external
      ON restaurant_reservation_providers (provider_key, external_restaurant_id)
      WHERE external_restaurant_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_rrp_restaurant
      ON restaurant_reservation_providers (restaurant_id);

    CREATE INDEX IF NOT EXISTS idx_rrp_active_provider
      ON restaurant_reservation_providers (provider_key, active)
      WHERE active = TRUE;

    CREATE TABLE IF NOT EXISTS reservation_referrals (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      provider_key TEXT NOT NULL REFERENCES reservation_providers(key),
      user_id TEXT,
      clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      party_size INTEGER,
      requested_date DATE,
      requested_time TEXT,
      external_click_id TEXT,
      converted_at TIMESTAMPTZ,
      external_booking_id TEXT,
      commission_amount NUMERIC,
      commission_currency TEXT,
      event_status TEXT NOT NULL DEFAULT 'clicked'
    );

    CREATE INDEX IF NOT EXISTS idx_reservation_referrals_restaurant
      ON reservation_referrals (restaurant_id, clicked_at DESC);
  `);

  for (const key of PROVIDER_KEYS) {
    const caps = PROVIDER_CAPABILITY_CATALOG[key];
    const name =
      key === "zenchef" ? "Zenchef" : key === "guestplan" ? "Guestplan" : "TheFork";
    await db.query(
      `INSERT INTO reservation_providers (
         key, name, priority,
         supports_availability, supports_booking, supports_deep_link, supports_affiliate_attribution
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (key) DO UPDATE SET
         name = EXCLUDED.name,
         priority = EXCLUDED.priority,
         supports_availability = EXCLUDED.supports_availability,
         supports_booking = EXCLUDED.supports_booking,
         supports_deep_link = EXCLUDED.supports_deep_link,
         supports_affiliate_attribution = EXCLUDED.supports_affiliate_attribution`,
      [
        key,
        name,
        PROVIDER_DEFAULT_PRIORITY[key],
        caps.availability,
        caps.bookingUrl || caps.directBooking,
        caps.bookingUrl,
        caps.attribution,
      ],
    );
  }
}

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (value == null || value === "") return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function rowToLink(row: QueryResultRow): RestaurantReservationLink {
  return {
    id: String(row.id),
    restaurantId: String(row.restaurant_id),
    providerKey: String(row.provider_key) as ReservationProviderKey,
    externalRestaurantId:
      row.external_restaurant_id == null ? null : String(row.external_restaurant_id),
    bookingUrl: row.booking_url == null ? null : String(row.booking_url),
    matchConfidence:
      typeof row.match_confidence === "number" ? row.match_confidence : null,
    matchStatus: String(row.match_status ?? "unmatched") as ProviderMatchStatus,
    verifiedAt: toIsoOrNull(row.verified_at),
    lastCheckedAt: toIsoOrNull(row.last_checked_at),
    active: Boolean(row.active),
    metadata: parseMetadata(row.metadata_json),
  };
}

export async function listRestaurantReservationLinks(
  restaurantId: string,
): Promise<RestaurantReservationLink[]> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT rrp.*
     FROM restaurant_reservation_providers rrp
     JOIN reservation_providers rp ON rp.key = rrp.provider_key
     WHERE rrp.restaurant_id = $1
     ORDER BY rp.priority ASC, rrp.provider_key ASC`,
    [restaurantId],
  );
  return result.rows.map(rowToLink);
}

export type UpsertReservationLinkInput = {
  restaurantId: string;
  providerKey: ReservationProviderKey;
  externalRestaurantId?: string | null;
  bookingUrl?: string | null;
  matchConfidence?: number | null;
  matchStatus?: ProviderMatchStatus;
  verifiedAt?: string | null;
  lastCheckedAt?: string | null;
  active?: boolean;
  metadata?: Record<string, unknown> | null;
};

export async function upsertRestaurantReservationLink(
  input: UpsertReservationLinkInput,
): Promise<RestaurantReservationLink> {
  const db = await ensureDb();
  const existing = await db.query(
    `SELECT * FROM restaurant_reservation_providers
     WHERE restaurant_id = $1 AND provider_key = $2`,
    [input.restaurantId, input.providerKey],
  );
  const current = existing.rows[0] as QueryResultRow | undefined;
  const id = current ? String(current.id) : randomUUID();
  const now = new Date().toISOString();

  await db.query(
    `INSERT INTO restaurant_reservation_providers (
       id, restaurant_id, provider_key, external_restaurant_id, booking_url,
       match_confidence, match_status, verified_at, last_checked_at, active, metadata_json
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10, $11::jsonb
     )
     ON CONFLICT (restaurant_id, provider_key) DO UPDATE SET
       external_restaurant_id = COALESCE(EXCLUDED.external_restaurant_id, restaurant_reservation_providers.external_restaurant_id),
       booking_url = COALESCE(EXCLUDED.booking_url, restaurant_reservation_providers.booking_url),
       match_confidence = COALESCE(EXCLUDED.match_confidence, restaurant_reservation_providers.match_confidence),
       match_status = COALESCE(EXCLUDED.match_status, restaurant_reservation_providers.match_status),
       verified_at = COALESCE(EXCLUDED.verified_at, restaurant_reservation_providers.verified_at),
       last_checked_at = COALESCE(EXCLUDED.last_checked_at, restaurant_reservation_providers.last_checked_at),
       active = COALESCE(EXCLUDED.active, restaurant_reservation_providers.active),
       metadata_json = COALESCE(EXCLUDED.metadata_json, restaurant_reservation_providers.metadata_json)
     RETURNING *`,
    [
      id,
      input.restaurantId,
      input.providerKey,
      input.externalRestaurantId ?? null,
      input.bookingUrl ?? null,
      input.matchConfidence ?? null,
      input.matchStatus ?? "unmatched",
      input.verifiedAt ?? null,
      input.lastCheckedAt ?? now,
      input.active ?? false,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );

  const result = await db.query(
    `SELECT * FROM restaurant_reservation_providers WHERE restaurant_id = $1 AND provider_key = $2`,
    [input.restaurantId, input.providerKey],
  );
  return rowToLink(result.rows[0]!);
}

export async function createReservationReferral(input: {
  restaurantId: string;
  providerKey: ReservationProviderKey;
  userId?: string | null;
  partySize?: number | null;
  requestedDate?: string | null;
  requestedTime?: string | null;
}): Promise<string> {
  const db = await ensureDb();
  const id = randomUUID();
  await db.query(
    `INSERT INTO reservation_referrals (
       id, restaurant_id, provider_key, user_id, party_size,
       requested_date, requested_time, event_status
     ) VALUES ($1, $2, $3, $4, $5, $6::date, $7, 'clicked')`,
    [
      id,
      input.restaurantId,
      input.providerKey,
      input.userId ?? null,
      input.partySize ?? null,
      input.requestedDate ?? null,
      input.requestedTime ?? null,
    ],
  );
  return id;
}
