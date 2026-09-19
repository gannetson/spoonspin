import {
  PROVIDER_CAPABILITY_CATALOG,
  theForkCredentials,
} from "../config.ts";
import type { ProviderCapabilities } from "../types.ts";
import type { StoredRestaurant } from "../../db/restaurants.ts";
import { listRestaurantReservationLinks } from "../../db/reservations.ts";
import {
  normalizeTheForkBookingUrl,
  parseTheForkRestaurantId,
} from "../../../src/restaurants/reviewLinks.ts";
import {
  fetchTheForkTimeslots,
  type TheForkHttpDeps,
} from "./theforkHttp.ts";
import {
  notConfigured,
  unsupported,
  type AvailabilityQuery,
  type BookingUrlQuery,
  type ReservationProviderAdapter,
} from "./types.ts";

async function resolveTheForkIdentity(restaurant: StoredRestaurant): Promise<{
  externalRestaurantId: string;
  bookingUrl: string;
} | null> {
  const fromRatings = restaurant.ratings?.theFork?.url?.trim();
  if (fromRatings) {
    const bookingUrl = normalizeTheForkBookingUrl(fromRatings);
    const externalRestaurantId = bookingUrl
      ? parseTheForkRestaurantId(bookingUrl)
      : null;
    if (bookingUrl && externalRestaurantId) {
      return { externalRestaurantId, bookingUrl };
    }
  }

  const link = (await listRestaurantReservationLinks(restaurant.id)).find(
    (row) => row.providerKey === "thefork" && row.active,
  );
  const bookingUrl = link?.bookingUrl
    ? normalizeTheForkBookingUrl(link.bookingUrl)
    : null;
  const externalRestaurantId =
    link?.externalRestaurantId?.trim() ||
    (bookingUrl ? parseTheForkRestaurantId(bookingUrl) : null);
  if (bookingUrl && externalRestaurantId) {
    return { externalRestaurantId, bookingUrl };
  }
  return null;
}

/**
 * TheFork B2B adapter.
 *
 * Documented Partners/B2B API: https://docs.thefork.io
 * Auth0 client credentials required from integrations@thefork.com for live slots.
 * Restaurant matching uses stored profile URLs (ratings / reservation links) —
 * there is no public catalog search endpoint.
 */
export function createTheForkAdapter(
  deps: TheForkHttpDeps = {},
): ReservationProviderAdapter {
  return {
    key: "thefork",
    capabilities(): ProviderCapabilities {
      return PROVIDER_CAPABILITY_CATALOG.thefork;
    },
    isConfigured(): boolean {
      return theForkCredentials().configured;
    },
    async findRestaurant(restaurant: StoredRestaurant) {
      const identity = await resolveTheForkIdentity(restaurant);
      if (identity) {
        return {
          status: "ok" as const,
          data: {
            externalRestaurantId: identity.externalRestaurantId,
            bookingUrl: identity.bookingUrl,
            matchConfidence: 1,
            metadata: { source: "stored_profile_url" },
          },
        };
      }
      if (!theForkCredentials().configured) {
        return notConfigured(
          "thefork",
          "set THEFORK_CLIENT_ID + THEFORK_CLIENT_SECRET after partner approval",
        );
      }
      return unsupported(
        "thefork",
        "restaurant directory search (not in public B2B docs)",
      );
    },
    async getAvailability(restaurant: StoredRestaurant, query: AvailabilityQuery) {
      if (!theForkCredentials().configured) {
        return notConfigured(
          "thefork",
          "set THEFORK_CLIENT_ID + THEFORK_CLIENT_SECRET after partner approval",
        );
      }
      const identity = await resolveTheForkIdentity(restaurant);
      if (!identity) {
        return { status: "not_found" as const, message: "thefork: no restaurant id" };
      }
      try {
        const result = await fetchTheForkTimeslots(
          {
            externalRestaurantId: identity.externalRestaurantId,
            restaurantId: restaurant.id,
            date: query.date,
            partySize: query.partySize,
            bookingUrl: identity.bookingUrl,
          },
          deps,
        );
        if (result.status === "ok") return { status: "ok" as const, data: result.slots };
        if (result.status === "not_found") {
          return { status: "not_found" as const, message: result.message };
        }
        return {
          status: "error" as const,
          message: result.message,
          retryable: result.retryable,
        };
      } catch (error) {
        return {
          status: "error" as const,
          message: error instanceof Error ? error.message : "thefork availability failed",
          retryable: true,
        };
      }
    },
    async getBookingUrl(restaurant: StoredRestaurant, _query?: BookingUrlQuery) {
      const identity = await resolveTheForkIdentity(restaurant);
      if (identity) {
        return { status: "ok" as const, data: { url: identity.bookingUrl } };
      }
      if (!theForkCredentials().configured) {
        return notConfigured(
          "thefork",
          "set THEFORK_CLIENT_ID + THEFORK_CLIENT_SECRET after partner approval",
        );
      }
      return { status: "not_found" as const, message: "thefork: no booking URL" };
    },
  };
}
