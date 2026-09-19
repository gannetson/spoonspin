/**
 * Promote stored TheFork profile URLs (ratings_json) into reservation links.
 * Does not scrape; never overwrites a rejected match.
 */
import type { RestaurantRatings } from "../../src/restaurants/ratings.ts";
import {
  isPlausibleTheForkRestaurantId,
  normalizeTheForkBookingUrl,
  parseTheForkRestaurantId,
} from "../../src/restaurants/reviewLinks.ts";
import {
  listRestaurantReservationLinks,
  upsertRestaurantReservationLink,
  type UpsertReservationLinkInput,
} from "../db/reservations.ts";
import { ensureDb, type StoredRestaurant } from "../db/restaurants.ts";

export type TheForkRatingSource = {
  id: string;
  ratings?: RestaurantRatings | null;
};

export function theForkReservationFromRatings(
  restaurant: TheForkRatingSource,
): UpsertReservationLinkInput | null {
  const raw = restaurant.ratings?.theFork?.url?.trim();
  if (!raw) return null;
  const bookingUrl = normalizeTheForkBookingUrl(raw);
  const externalRestaurantId = bookingUrl
    ? parseTheForkRestaurantId(bookingUrl)
    : null;
  if (
    !bookingUrl ||
    !externalRestaurantId ||
    !isPlausibleTheForkRestaurantId(externalRestaurantId)
  ) {
    return null;
  }
  return {
    restaurantId: restaurant.id,
    providerKey: "thefork",
    externalRestaurantId,
    bookingUrl,
    matchConfidence: 1,
    matchStatus: "verified",
    verifiedAt: new Date().toISOString(),
    active: true,
    metadata: { source: "ratings_json" },
  };
}

export async function upsertTheForkLinkFromRatings(
  restaurant: TheForkRatingSource,
): Promise<boolean> {
  const input = theForkReservationFromRatings(restaurant);
  if (!input) return false;

  const existing = (await listRestaurantReservationLinks(restaurant.id)).find(
    (link) => link.providerKey === "thefork",
  );
  if (existing?.matchStatus === "rejected") return false;
  if (
    existing?.matchStatus === "verified" &&
    existing.active &&
    existing.bookingUrl &&
    existing.externalRestaurantId
  ) {
    return false;
  }

  try {
    await upsertRestaurantReservationLink(input);
    return true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "23505") return false;
    console.warn(
      `[reservations] could not attach TheFork link for ${restaurant.id}`,
      error,
    );
    return false;
  }
}

export async function promoteTheForkLinksFromRatings(): Promise<{
  scanned: number;
  attached: number;
  skipped: number;
}> {
  const db = await ensureDb();
  const result = await db.query(
    `SELECT id, ratings_json
     FROM restaurants
     WHERE ratings_json #>> '{theFork,url}' IS NOT NULL`,
  );

  let attached = 0;
  let skipped = 0;
  for (const row of result.rows) {
    const ratings = row.ratings_json as RestaurantRatings | null;
    const wrote = await upsertTheForkLinkFromRatings({
      id: String(row.id),
      ratings,
    });
    if (wrote) attached += 1;
    else skipped += 1;
  }

  return { scanned: result.rows.length, attached, skipped };
}

/** Attach a TheFork booking link onto an already-curated restaurant. */
export async function attachTheForkLinkIfPresent(
  restaurant: StoredRestaurant,
): Promise<boolean> {
  return upsertTheForkLinkFromRatings(restaurant);
}
