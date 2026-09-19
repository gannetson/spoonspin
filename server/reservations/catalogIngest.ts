/**
 * Partner catalog ingest is gated: TheFork’s public B2B API has no restaurant
 * directory/search. Until a partner dump exists, only *attach* booking links
 * onto already-curated Spoonspin restaurants (Places identity + authenticity).
 * Never insert a raw marketplace listing into Dine.
 */
import { getRestaurantByGooglePlaceId, type StoredRestaurant } from "../db/restaurants.ts";
import { reconcileRestaurantWithGooglePlaces } from "../lib/reconcileRestaurantPlaces.ts";
import { upsertTheForkLinkFromRatings } from "./theForkFromRatings.ts";
import {
  isPlausibleTheForkRestaurantId,
  normalizeTheForkBookingUrl,
  parseTheForkRestaurantId,
} from "../../src/restaurants/reviewLinks.ts";
import { upsertRestaurantReservationLink } from "../db/reservations.ts";

export type CatalogCandidate = {
  name: string;
  city: string;
  address?: string;
  googlePlaceId?: string;
  theForkUrl?: string;
  theForkId?: string;
};

export type CatalogIngestResult =
  | { status: "attached"; restaurantId: string }
  | { status: "skipped"; reason: string }
  | { status: "needs_review"; reason: string };

/**
 * Attach TheFork (and future Zenchef) ids onto an existing curated row.
 * Call after OSM harvest / Places reconcile — not as a Dine search source.
 */
export async function attachProviderLinksToRestaurant(
  restaurant: StoredRestaurant,
): Promise<boolean> {
  return upsertTheForkLinkFromRatings(restaurant);
}

export async function ingestCatalogCandidate(
  candidate: CatalogCandidate,
): Promise<CatalogIngestResult> {
  const placeId = candidate.googlePlaceId?.trim();
  if (!placeId) {
    return {
      status: "needs_review",
      reason:
        "Catalog rows need a Google Place id before Dine. Keep OSM/admin harvest as discovery.",
    };
  }

  const existing = await getRestaurantByGooglePlaceId(placeId);
  if (!existing) {
    return {
      status: "needs_review",
      reason:
        "No curated restaurant for this Place id. Import via OSM/admin discover, then attach booking links.",
    };
  }

  if (!existing.reviewed || (existing.authenticityRating ?? 0) < 3) {
    return {
      status: "needs_review",
      reason: `Restaurant ${existing.id} is not Dine-ready (reviewed + authenticity ≥ 3).`,
    };
  }

  const bookingUrl = candidate.theForkUrl
    ? normalizeTheForkBookingUrl(candidate.theForkUrl)
    : null;
  const externalId =
    candidate.theForkId?.trim() ||
    (bookingUrl ? parseTheForkRestaurantId(bookingUrl) : null);

  if (bookingUrl && externalId && isPlausibleTheForkRestaurantId(externalId)) {
    await upsertRestaurantReservationLink({
      restaurantId: existing.id,
      providerKey: "thefork",
      externalRestaurantId: externalId,
      bookingUrl,
      matchStatus: "verified",
      matchConfidence: 1,
      active: true,
      verifiedAt: new Date().toISOString(),
      metadata: { source: "partner_catalog" },
    });
    return { status: "attached", restaurantId: existing.id };
  }

  const attached = await attachProviderLinksToRestaurant(existing);
  return attached
    ? { status: "attached", restaurantId: existing.id }
    : { status: "skipped", reason: "No TheFork profile URL or id on this candidate." };
}

/** After Places identity is refreshed, attach any TheFork URL already on the row. */
export async function attachLinksAfterPlacesReconcile(
  restaurant: StoredRestaurant,
): Promise<boolean> {
  const reconciled = await reconcileRestaurantWithGooglePlaces(restaurant);
  const row = reconciled.ok ? reconciled.restaurant : restaurant;
  return attachProviderLinksToRestaurant(row);
}
