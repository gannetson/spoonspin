import {
  PROVIDER_CAPABILITY_CATALOG,
  zenchefCredentials,
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
 * Zenchef partner adapter.
 *
 * Official docs confirm availability + reservation APIs exist for partners, but
 * credentials and full endpoint docs require partnership
 * (https://www.zenchef.com/integrations or help@zenchef.com).
 * Until configured, every call returns `not_configured` — no invented endpoints.
 */
export function createZenchefAdapter(): ReservationProviderAdapter {
  return {
    key: "zenchef",
    capabilities(): ProviderCapabilities {
      return PROVIDER_CAPABILITY_CATALOG.zenchef;
    },
    isConfigured(): boolean {
      return zenchefCredentials().configured;
    },
    async findRestaurant(_restaurant: StoredRestaurant) {
      if (!zenchefCredentials().configured) {
        return notConfigured(
          "zenchef",
          "set ZENCHEF_API_KEY after partnership approval (see docs/reservations.md)",
        );
      }
      return unsupported("zenchef", "restaurant matching HTTP client");
    },
    async getAvailability(_restaurant: StoredRestaurant, _query: AvailabilityQuery) {
      if (!zenchefCredentials().configured) {
        return notConfigured(
          "zenchef",
          "set ZENCHEF_API_KEY after partnership approval (see docs/reservations.md)",
        );
      }
      return unsupported("zenchef", "availability HTTP client");
    },
    async getBookingUrl(_restaurant: StoredRestaurant, _query?: BookingUrlQuery) {
      if (!zenchefCredentials().configured) {
        return notConfigured(
          "zenchef",
          "set ZENCHEF_API_KEY after partnership approval (see docs/reservations.md)",
        );
      }
      return unsupported("zenchef", "booking URL HTTP client");
    },
  };
}
