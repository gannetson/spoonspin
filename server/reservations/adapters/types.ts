import type {
  AdapterResult,
  AvailabilitySlot,
  ProviderCapabilities,
  ReservationProviderKey,
} from "../types.ts";
import type { StoredRestaurant } from "../../db/restaurants.ts";

export type AvailabilityQuery = {
  date: string;
  partySize: number;
  preferredTime?: string;
  timeRange?: { start: string; end: string };
};

export type BookingUrlQuery = {
  date?: string;
  time?: string;
  partySize?: number;
};

export type MatchedProviderRestaurant = {
  externalRestaurantId: string;
  bookingUrl?: string | null;
  matchConfidence: number;
  metadata?: Record<string, unknown>;
};

/**
 * Common reservation provider adapter.
 * Implementations must never invent availability or undocumented endpoints.
 */
export interface ReservationProviderAdapter {
  readonly key: ReservationProviderKey;
  capabilities(): ProviderCapabilities;
  isConfigured(): boolean;

  findRestaurant(
    restaurant: StoredRestaurant,
  ): Promise<AdapterResult<MatchedProviderRestaurant>>;

  getAvailability(
    restaurant: StoredRestaurant,
    query: AvailabilityQuery,
  ): Promise<AdapterResult<AvailabilitySlot[]>>;

  getBookingUrl(
    restaurant: StoredRestaurant,
    query?: BookingUrlQuery,
  ): Promise<AdapterResult<{ url: string }>>;
}

export function notConfigured(
  provider: ReservationProviderKey,
  detail: string,
): AdapterResult<never> {
  return {
    status: "not_configured",
    message: `${provider}: ${detail}`,
    retryable: false,
  };
}

export function unsupported(
  provider: ReservationProviderKey,
  capability: string,
): AdapterResult<never> {
  return {
    status: "unsupported",
    message: `${provider}: ${capability} is not available with current access`,
    retryable: false,
  };
}
