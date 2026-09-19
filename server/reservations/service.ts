import { listRestaurantReservationLinks } from "../db/reservations.ts";
import type { StoredRestaurant } from "../db/restaurants.ts";
import {
  isPlausibleTheForkRestaurantId,
  normalizeTheForkBookingUrl,
  parseTheForkRestaurantId,
} from "../../src/restaurants/reviewLinks.ts";
import { createGuestplanAdapter } from "./adapters/guestplan.ts";
import { createTheForkAdapter } from "./adapters/thefork.ts";
import { createZenchefAdapter } from "./adapters/zenchef.ts";
import type {
  AvailabilityQuery,
  ReservationProviderAdapter,
} from "./adapters/types.ts";
import {
  isProviderEnabled,
  isReservationsEnabled,
  listReservationProviders,
  theForkCredentials,
} from "./config.ts";
import type {
  AvailabilitySlot,
  BookingAction,
  BookingOption,
  ReservationProviderKey,
  RestaurantReservationLink,
} from "./types.ts";

export type ReservationOptionsRequest = {
  date?: string;
  time?: string;
  partySize?: number;
};

export type ReservationOptionsResponse = {
  restaurantId: string;
  requested: {
    date: string | null;
    time: string | null;
    partySize: number | null;
  };
  bestOption: BookingOption | null;
  alternatives: BookingOption[];
  fallback: BookingOption;
  providers: Array<{
    key: ReservationProviderKey;
    enabled: boolean;
    configured: boolean;
    link: RestaurantReservationLink | null;
  }>;
};

function defaultAdapters(): ReservationProviderAdapter[] {
  return [createZenchefAdapter(), createGuestplanAdapter(), createTheForkAdapter()];
}

function minutesFromTime(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  return hours * 60 + mins;
}

function slotTimeLabel(isoStart: string): string {
  const date = new Date(isoStart);
  if (!Number.isFinite(date.getTime())) return isoStart;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function slotDistanceMinutes(slot: AvailabilitySlot, preferredTime?: string): number {
  const preferred = minutesFromTime(preferredTime);
  if (preferred == null) return 0;
  const slotMins = minutesFromTime(slotTimeLabel(slot.startAt));
  if (slotMins == null) return Number.POSITIVE_INFINITY;
  return Math.abs(slotMins - preferred);
}

function providerHasAffiliate(key: ReservationProviderKey): boolean {
  if (key === "thefork") return Boolean(theForkCredentials().affiliateId);
  return false;
}

/**
 * Ranking after restaurant is already selected:
 * 1) availability closeness to preferred time
 * 2) deep-link / reserve UX (RESERVE > BOOK_EXTERNALLY)
 * 3) configured provider priority
 * 4) affiliate only as final tie-breaker
 */
export function compareBookingOptions(
  a: BookingOption,
  b: BookingOption,
  preferredTime: string | undefined,
  priority: Record<string, number>,
): number {
  const aSlotDist =
    a.availabilitySlot != null
      ? slotDistanceMinutes(a.availabilitySlot, preferredTime)
      : Number.POSITIVE_INFINITY;
  const bSlotDist =
    b.availabilitySlot != null
      ? slotDistanceMinutes(b.availabilitySlot, preferredTime)
      : Number.POSITIVE_INFINITY;
  if (aSlotDist !== bSlotDist) return aSlotDist - bSlotDist;

  const actionRank = (action: BookingAction) =>
    action === "RESERVE" ? 0 : action === "BOOK_EXTERNALLY" ? 1 : 2;
  const actionDiff = actionRank(a.action) - actionRank(b.action);
  if (actionDiff !== 0) return actionDiff;

  const aPri = priority[a.provider] ?? 999;
  const bPri = priority[b.provider] ?? 999;
  if (aPri !== bPri) return aPri - bPri;

  const aAff =
    a.provider !== "website" && a.provider !== "maps" && providerHasAffiliate(a.provider)
      ? 0
      : 1;
  const bAff =
    b.provider !== "website" && b.provider !== "maps" && providerHasAffiliate(b.provider)
      ? 0
      : 1;
  return aAff - bAff;
}

export function buildFallbackOption(restaurant: StoredRestaurant): BookingOption {
  const website = restaurant.website?.trim();
  if (website && /^https?:\/\//i.test(website)) {
    return {
      provider: "website",
      action: "VISIT_WEBSITE",
      url: website,
    };
  }
  return {
    provider: "maps",
    action: "VIEW_ON_MAP",
    url: restaurant.mapsUrl,
  };
}

export function optionFromVerifiedLink(
  link: RestaurantReservationLink,
): BookingOption | null {
  if (!link.active || link.matchStatus !== "verified") return null;
  const url = link.bookingUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return {
    provider: link.providerKey,
    action: "BOOK_EXTERNALLY",
    url,
  };
}

/** Deep-link from a stored TheFork profile URL when no reservation_providers row exists yet. */
export function optionFromTheForkRatings(
  restaurant: StoredRestaurant,
): BookingOption | null {
  const raw = restaurant.ratings?.theFork?.url?.trim();
  if (!raw) return null;
  const url = normalizeTheForkBookingUrl(raw);
  const id = url ? parseTheForkRestaurantId(url) : null;
  if (!url || !id || !isPlausibleTheForkRestaurantId(id)) return null;
  return {
    provider: "thefork",
    action: "BOOK_EXTERNALLY",
    url,
  };
}

export type ReservationServiceDeps = {
  adapters?: ReservationProviderAdapter[];
  listLinks?: (restaurantId: string) => Promise<RestaurantReservationLink[]>;
};

export function createReservationService(deps: ReservationServiceDeps = {}) {
  const adapters = deps.adapters ?? defaultAdapters();
  const listLinks = deps.listLinks ?? listRestaurantReservationLinks;

  async function collectAvailability(
    restaurant: StoredRestaurant,
    query: AvailabilityQuery,
  ): Promise<BookingOption[]> {
    if (!isReservationsEnabled()) return [];

    const options: BookingOption[] = [];
    await Promise.all(
      adapters.map(async (adapter) => {
        if (!isProviderEnabled(adapter.key) || !adapter.isConfigured()) return;
        try {
          const result = await adapter.getAvailability(restaurant, query);
          if (result.status !== "ok") return;
          for (const slot of result.data) {
            options.push({
              provider: adapter.key,
              action: slot.bookingUrl ? "RESERVE" : "BOOK_EXTERNALLY",
              time: slotTimeLabel(slot.startAt),
              url: slot.bookingUrl ?? "",
              availabilitySlot: slot,
            });
          }
        } catch (error) {
          console.warn(`[reservations] ${adapter.key} availability failed`, error);
        }
      }),
    );
    return options.filter((opt) => Boolean(opt.url));
  }

  async function getReservationOptions(
    restaurant: StoredRestaurant,
    request: ReservationOptionsRequest = {},
  ): Promise<ReservationOptionsResponse> {
    const fallback = buildFallbackOption(restaurant);
    const links = await listLinks(restaurant.id);
    const linkByProvider = new Map(links.map((link) => [link.providerKey, link]));

    const providers = listReservationProviders().map((provider) => {
      const adapter = adapters.find((item) => item.key === provider.key);
      return {
        key: provider.key,
        enabled: provider.enabled,
        configured: adapter?.isConfigured() ?? false,
        link: linkByProvider.get(provider.key) ?? null,
      };
    });

    const priority = Object.fromEntries(
      listReservationProviders().map((p) => [p.key, p.priority]),
    );

    const liveOptions: BookingOption[] = [];
    if (
      isReservationsEnabled() &&
      request.date &&
      request.partySize &&
      request.partySize > 0
    ) {
      liveOptions.push(
        ...(await collectAvailability(restaurant, {
          date: request.date,
          partySize: request.partySize,
          preferredTime: request.time,
        })),
      );
    }

    const deepLinkOptions = links
      .map(optionFromVerifiedLink)
      .filter((opt): opt is BookingOption => Boolean(opt));

    if (!deepLinkOptions.some((opt) => opt.provider === "thefork")) {
      const fromRatings = optionFromTheForkRatings(restaurant);
      if (fromRatings) deepLinkOptions.push(fromRatings);
    }

    const ranked = [...liveOptions, ...deepLinkOptions].sort((a, b) =>
      compareBookingOptions(a, b, request.time, priority),
    );

    // Deduplicate by provider+url keeping best rank
    const seen = new Set<string>();
    const unique: BookingOption[] = [];
    for (const opt of ranked) {
      const key = `${opt.provider}|${opt.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(opt);
    }

    const bestOption = unique[0] ?? fallback;
    const alternatives = unique.slice(1);

    return {
      restaurantId: restaurant.id,
      requested: {
        date: request.date ?? null,
        time: request.time ?? null,
        partySize: request.partySize ?? null,
      },
      bestOption,
      alternatives,
      fallback,
      providers,
    };
  }

  return {
    getReservationOptions,
    getBestBookingOption: async (
      restaurant: StoredRestaurant,
      request?: ReservationOptionsRequest,
    ) => {
      const options = await getReservationOptions(restaurant, request);
      return options.bestOption ?? options.fallback;
    },
    adapters,
  };
}

export const reservationService = createReservationService();
