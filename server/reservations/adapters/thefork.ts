import {
  PROVIDER_CAPABILITY_CATALOG,
  theForkCredentials,
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
 * TheFork B2B adapter.
 *
 * Documented Partners/B2B API: https://docs.thefork.io
 * Auth0 client credentials required from integrations@thefork.com.
 * Affiliate ID (if any) is env-only via THEFORK_AFFILIATE_ID — never hard-coded.
 */
export function createTheForkAdapter(): ReservationProviderAdapter {
  return {
    key: "thefork",
    capabilities(): ProviderCapabilities {
      return PROVIDER_CAPABILITY_CATALOG.thefork;
    },
    isConfigured(): boolean {
      return theForkCredentials().configured;
    },
    async findRestaurant(_restaurant: StoredRestaurant) {
      if (!theForkCredentials().configured) {
        return notConfigured(
          "thefork",
          "set THEFORK_CLIENT_ID + THEFORK_CLIENT_SECRET after partner approval",
        );
      }
      return unsupported("thefork", "restaurant matching HTTP client");
    },
    async getAvailability(_restaurant: StoredRestaurant, _query: AvailabilityQuery) {
      if (!theForkCredentials().configured) {
        return notConfigured(
          "thefork",
          "set THEFORK_CLIENT_ID + THEFORK_CLIENT_SECRET after partner approval",
        );
      }
      return unsupported("thefork", "availability HTTP client");
    },
    async getBookingUrl(_restaurant: StoredRestaurant, _query?: BookingUrlQuery) {
      if (!theForkCredentials().configured) {
        return notConfigured(
          "thefork",
          "set THEFORK_CLIENT_ID + THEFORK_CLIENT_SECRET after partner approval",
        );
      }
      return unsupported("thefork", "booking URL HTTP client");
    },
  };
}
