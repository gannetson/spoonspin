import type {
  ProviderCapabilities,
  ReservationProvider,
  ReservationProviderKey,
} from "./types.ts";

function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw == null || raw === "") return defaultValue;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** Master switch — when false, adapters stay dormant and APIs use website/maps fallbacks. */
export function isReservationsEnabled(): boolean {
  return envFlag("RESERVATIONS_ENABLED", false);
}

export function isZenchefEnabled(): boolean {
  return isReservationsEnabled() && envFlag("ZENCHEF_ENABLED", false);
}

export function isGuestplanEnabled(): boolean {
  return isReservationsEnabled() && envFlag("GUESTPLAN_ENABLED", false);
}

export function isTheForkEnabled(): boolean {
  return isReservationsEnabled() && envFlag("THEFORK_ENABLED", false);
}

export function isProviderEnabled(key: ReservationProviderKey): boolean {
  switch (key) {
    case "zenchef":
      return isZenchefEnabled();
    case "guestplan":
      return isGuestplanEnabled();
    case "thefork":
      return isTheForkEnabled();
  }
}

/**
 * Intended capabilities once partner access is granted.
 * Runtime adapters still return `not_configured` until credentials exist.
 */
export const PROVIDER_CAPABILITY_CATALOG: Record<
  ReservationProviderKey,
  ProviderCapabilities
> = {
  zenchef: {
    restaurantMatching: true,
    availability: true,
    bookingUrl: true,
    directBooking: true,
    attribution: true,
  },
  guestplan: {
    restaurantMatching: true,
    availability: true,
    bookingUrl: true,
    directBooking: true,
    attribution: true,
  },
  thefork: {
    restaurantMatching: true,
    availability: true,
    bookingUrl: true,
    directBooking: true,
    attribution: true,
  },
};

export const PROVIDER_DEFAULT_PRIORITY: Record<ReservationProviderKey, number> = {
  zenchef: 10,
  guestplan: 20,
  thefork: 30,
};

export function listReservationProviders(): ReservationProvider[] {
  const keys: ReservationProviderKey[] = ["zenchef", "guestplan", "thefork"];
  return keys.map((key) => ({
    key,
    name:
      key === "zenchef" ? "Zenchef" : key === "guestplan" ? "Guestplan" : "TheFork",
    enabled: isProviderEnabled(key),
    priority: PROVIDER_DEFAULT_PRIORITY[key],
    capabilities: PROVIDER_CAPABILITY_CATALOG[key],
  }));
}

/** Soft TTL for Places *content* fields (not place IDs). Place IDs may be stored indefinitely. */
export const PLACES_CONTENT_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

/** Short in-memory cache for availability lookups (seconds). */
export const AVAILABILITY_CACHE_TTL_MS = 60_000;

export function zenchefCredentials(): {
  configured: boolean;
  apiKey: string | null;
  partnerId: string | null;
} {
  const apiKey = process.env.ZENCHEF_API_KEY?.trim() || null;
  const partnerId = process.env.ZENCHEF_PARTNER_ID?.trim() || null;
  return { configured: Boolean(apiKey), apiKey, partnerId };
}

export function guestplanCredentials(): {
  configured: boolean;
  apiKey: string | null;
} {
  const apiKey = process.env.GUESTPLAN_API_KEY?.trim() || null;
  return { configured: Boolean(apiKey), apiKey };
}

export function theForkCredentials(): {
  configured: boolean;
  clientId: string | null;
  clientSecret: string | null;
  affiliateId: string | null;
} {
  const clientId = process.env.THEFORK_CLIENT_ID?.trim() || null;
  const clientSecret = process.env.THEFORK_CLIENT_SECRET?.trim() || null;
  const affiliateId = process.env.THEFORK_AFFILIATE_ID?.trim() || null;
  return {
    configured: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
    affiliateId,
  };
}
