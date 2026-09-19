import {
  PROVIDER_CAPABILITY_CATALOG,
  guestplanCredentials,
} from "../config.ts";
import type { ProviderCapabilities } from "../types.ts";
import type { StoredRestaurant } from "../../db/restaurants.ts";
import {
  notConfigured,
  unsupported,
  type AvailabilityQuery,
  type BookingUrlQuery,
  type ReservationProviderAdapter,
} from "./types.ts";

/**
 * Guestplan partner adapter.
 *
 * Guestplan documents marketplace integrations and an Enterprise “Export API”,
 * but no public discovery/availability partner API. Contact
 * https://www.guestplan.com/integrations/ for access.
 */
export function createGuestplanAdapter(): ReservationProviderAdapter {
  return {
    key: "guestplan",
    capabilities(): ProviderCapabilities {
      return PROVIDER_CAPABILITY_CATALOG.guestplan;
    },
    isConfigured(): boolean {
      return guestplanCredentials().configured;
    },
    async findRestaurant(_restaurant: StoredRestaurant) {
      if (!guestplanCredentials().configured) {
        return notConfigured(
          "guestplan",
          "set GUESTPLAN_API_KEY after Guestplan grants partner API access",
        );
      }
      return unsupported("guestplan", "restaurant matching HTTP client");
    },
    async getAvailability(_restaurant: StoredRestaurant, _query: AvailabilityQuery) {
      if (!guestplanCredentials().configured) {
        return notConfigured(
          "guestplan",
          "set GUESTPLAN_API_KEY after Guestplan grants partner API access",
        );
      }
      return unsupported("guestplan", "availability HTTP client");
    },
    async getBookingUrl(_restaurant: StoredRestaurant, _query?: BookingUrlQuery) {
      if (!guestplanCredentials().configured) {
        return notConfigured(
          "guestplan",
          "set GUESTPLAN_API_KEY after Guestplan grants partner API access",
        );
      }
      return unsupported("guestplan", "booking URL HTTP client");
    },
  };
}
