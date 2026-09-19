/** Shared reservation option shapes for the SpoonSpin client. */

export type BookingAction =
  | "RESERVE"
  | "BOOK_EXTERNALLY"
  | "VISIT_WEBSITE"
  | "VIEW_ON_MAP";

export type ReservationProviderKey = "zenchef" | "guestplan" | "thefork";

export type BookingOptionDto = {
  provider: ReservationProviderKey | "website" | "maps";
  action: BookingAction;
  time?: string;
  url: string;
};

export type ReservationProviderDebugDto = {
  key: ReservationProviderKey;
  enabled: boolean;
  configured: boolean;
  match_status: string;
  external_restaurant_id: string | null;
  verified: boolean;
  last_checked_at: string | null;
  active: boolean;
};

export type ReservationOptionsDto = {
  restaurant_id: string;
  requested: {
    date: string | null;
    time: string | null;
    party_size: number | null;
  };
  best_option: BookingOptionDto | null;
  alternatives: BookingOptionDto[];
  fallback: BookingOptionDto;
  providers: ReservationProviderDebugDto[];
};

export type ReservationOptionsQuery = {
  date?: string;
  time?: string;
  partySize?: number;
};

export function bookingActionLabelKey(action: BookingAction): string {
  switch (action) {
    case "RESERVE":
      return "restaurant.booking.reserve";
    case "BOOK_EXTERNALLY":
      return "restaurant.booking.bookExternally";
    case "VISIT_WEBSITE":
      return "restaurant.booking.visitWebsite";
    case "VIEW_ON_MAP":
      return "restaurant.booking.viewOnMap";
  }
}

/** Prefer live/provider booking; fall back to website/maps from the payload. */
export function resolvePrimaryBookingOption(
  options: ReservationOptionsDto | null | undefined,
): BookingOptionDto | null {
  if (!options) return null;
  return options.best_option ?? options.fallback ?? null;
}

export function secondaryBookingLinks(
  options: ReservationOptionsDto | null | undefined,
  primary: BookingOptionDto | null,
): BookingOptionDto[] {
  if (!options || !primary) return [];
  const candidates = [
    ...options.alternatives,
    options.fallback,
    ...(options.best_option && options.best_option.url !== primary.url
      ? [options.best_option]
      : []),
  ];
  const seen = new Set<string>([primary.url]);
  const out: BookingOptionDto[] = [];
  for (const opt of candidates) {
    if (!opt?.url || seen.has(opt.url)) continue;
    // Keep website/maps as secondary when primary is a provider booking.
    if (
      primary.action === "RESERVE" ||
      primary.action === "BOOK_EXTERNALLY"
    ) {
      if (opt.action === "VISIT_WEBSITE" || opt.action === "VIEW_ON_MAP") {
        seen.add(opt.url);
        out.push(opt);
      }
      continue;
    }
    if (opt.action === "VIEW_ON_MAP" || opt.action === "VISIT_WEBSITE") {
      seen.add(opt.url);
      out.push(opt);
    }
  }
  return out;
}
