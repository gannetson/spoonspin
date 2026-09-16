/**
 * Attach / refresh Google Places identity on a stored restaurant.
 * Never invent place IDs; returns explicit not_configured / not_found.
 */

import {
  applyGooglePlaceIdentity,
  type StoredRestaurant,
} from "../db/restaurants.ts";
import {
  getRestaurantByPlaceId,
  isGooglePlacesConfigured,
  lookupGoogleRestaurant,
  placesContentNeedsRefresh,
} from "./googlePlacesService.ts";

export type ReconcilePlacesResult =
  | { ok: true; restaurant: StoredRestaurant }
  | {
      ok: false;
      status: "not_configured" | "not_found" | "conflict" | "error";
      message: string;
    };

export async function reconcileRestaurantWithGooglePlaces(
  restaurant: StoredRestaurant,
  options?: { forceRefresh?: boolean },
): Promise<ReconcilePlacesResult> {
  if (!isGooglePlacesConfigured()) {
    return {
      ok: false,
      status: "not_configured",
      message: "GOOGLE_PLACES_API_KEY is not configured.",
    };
  }

  try {
    let placeId = restaurant.googlePlaceId?.trim() || null;

    if (!placeId) {
      const match = await lookupGoogleRestaurant({
        name: restaurant.name,
        city: restaurant.city,
        address: restaurant.address,
      });
      if (!match?.placeId) {
        return {
          ok: false,
          status: "not_found",
          message: "No Google Place match found for this restaurant.",
        };
      }
      placeId = match.placeId;
    }

    const needsDetails =
      options?.forceRefresh ||
      placesContentNeedsRefresh(restaurant.placesRefreshedAt) ||
      !restaurant.googlePlaceId;

    if (!needsDetails && restaurant.googlePlaceId === placeId) {
      return { ok: true, restaurant };
    }

    const details = await getRestaurantByPlaceId(placeId);
    if (!details) {
      return {
        ok: false,
        status: "not_found",
        message: `Google Place ${placeId} was not found.`,
      };
    }

    const updated = await applyGooglePlaceIdentity(restaurant.id, {
      googlePlaceId: details.placeId,
      name: details.name,
      address: details.address,
      city: details.city,
      postcode: details.postcode ?? null,
      lat: details.lat ?? null,
      lng: details.lng ?? null,
      website: details.website ?? null,
      phone: details.phone ?? null,
      mapsUrl: details.mapsUrl,
      priceLevel: details.priceLevel ?? null,
      userRating: details.rating ?? null,
      reviewCount: details.reviewCount ?? null,
      businessStatus: details.businessStatus ?? null,
      primaryType: details.primaryType ?? null,
      placesRefreshedAt: details.fetchedAt,
    });

    return { ok: true, restaurant: updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Places reconcile failed";
    if (/already linked/i.test(message)) {
      return { ok: false, status: "conflict", message };
    }
    return { ok: false, status: "error", message };
  }
}
