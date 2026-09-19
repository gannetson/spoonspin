/** Provider-neutral reservation types (TypeScript adaptation of the design doc). */

export type ReservationProviderKey = "zenchef" | "guestplan" | "thefork";

export type BookingAction =
  | "RESERVE"
  | "BOOK_EXTERNALLY"
  | "VISIT_WEBSITE"
  | "VIEW_ON_MAP";

export type ProviderMatchStatus =
  | "unmatched"
  | "candidate"
  | "verified"
  | "rejected"
  | "stale";

/** Explicit adapter outcomes — never invent availability or booking URLs. */
export type AdapterStatus =
  | "ok"
  | "not_configured"
  | "unsupported"
  | "not_found"
  | "error"
  | "timeout";

export type ProviderCapabilities = {
  restaurantMatching: boolean;
  availability: boolean;
  bookingUrl: boolean;
  directBooking: boolean;
  attribution: boolean;
};

export type ReservationProvider = {
  key: ReservationProviderKey;
  name: string;
  /** Runtime env flag; DB row may also store intended capability flags. */
  enabled: boolean;
  priority: number;
  capabilities: ProviderCapabilities;
};

export type RestaurantReservationLink = {
  id: string;
  restaurantId: string;
  providerKey: ReservationProviderKey;
  externalRestaurantId: string | null;
  bookingUrl: string | null;
  matchConfidence: number | null;
  matchStatus: ProviderMatchStatus;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  active: boolean;
  /** Provider-specific extras only. */
  metadata: Record<string, unknown> | null;
};

export type AvailabilitySlot = {
  provider: ReservationProviderKey;
  restaurantId: string;
  startAt: string;
  partySize: number;
  bookingUrl: string | null;
};

export type BookingOption = {
  provider: ReservationProviderKey | "website" | "maps";
  action: BookingAction;
  time?: string;
  url: string;
  availabilitySlot?: AvailabilitySlot;
};

export type AdapterResult<T> =
  | { status: "ok"; data: T }
  | {
      status: Exclude<AdapterStatus, "ok">;
      message: string;
      retryable?: boolean;
    };

export type ReservationReferralEvent =
  | "clicked"
  | "booked"
  | "cancelled"
  | "seated";
