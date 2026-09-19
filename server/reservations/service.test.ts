/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import type { StoredRestaurant } from "../db/restaurants";
import { createGuestplanAdapter } from "./adapters/guestplan";
import { createTheForkAdapter } from "./adapters/thefork";
import { createZenchefAdapter } from "./adapters/zenchef";
import type { ReservationProviderAdapter } from "./adapters/types";
import {
  buildFallbackOption,
  compareBookingOptions,
  createReservationService,
  optionFromTheForkRatings,
  optionFromVerifiedLink,
} from "./service";
import type { AvailabilitySlot, BookingOption, RestaurantReservationLink } from "./types";

function restaurant(partial: Partial<StoredRestaurant> = {}): StoredRestaurant {
  return {
    id: "r1",
    name: "Test Spot",
    address: "Street 1",
    city: "Leiden",
    postcode: "2312 JS",
    lat: 52.16,
    lng: 4.49,
    cuisineCodes: ["it"],
    cuisineTags: ["italian"],
    website: "https://testspot.nl",
    phone: null,
    source: "test",
    osmId: "test:1",
    googlePlaceId: "ChIJ_test",
    mapsUrl: "https://maps.google.com/?q=Test+Spot",
    updatedAt: new Date().toISOString(),
    reviewed: true,
    authenticityRating: 4,
    authenticityNotes: null,
    reviewedAt: null,
    reviewSource: null,
    userRating: null,
    reviewCount: null,
    ratings: null,
    priceLevel: null,
    menu: null,
    photoUrl: null,
    photoAttribution: null,
    regionId: null,
    businessStatus: "OPERATIONAL",
    primaryType: "restaurant",
    placesRefreshedAt: null,
    ...partial,
  };
}

describe("reservation adapters without credentials", () => {
  afterEach(() => {
    delete process.env.ZENCHEF_API_KEY;
    delete process.env.GUESTPLAN_API_KEY;
    delete process.env.THEFORK_CLIENT_ID;
    delete process.env.THEFORK_CLIENT_SECRET;
  });

  it("returns not_configured for all three providers", async () => {
    const adapters = [
      createZenchefAdapter(),
      createGuestplanAdapter(),
      createTheForkAdapter(),
    ];
    for (const adapter of adapters) {
      expect(adapter.isConfigured()).toBe(false);
      const result = await adapter.getAvailability(restaurant(), {
        date: "2026-09-19",
        partySize: 4,
      });
      expect(result.status).toBe("not_configured");
    }
  });
});

describe("fallback and ranking", () => {
  it("falls back to website then maps", () => {
    expect(buildFallbackOption(restaurant()).action).toBe("VISIT_WEBSITE");
    expect(
      buildFallbackOption(restaurant({ website: null })).action,
    ).toBe("VIEW_ON_MAP");
  });

  it("prefers closer availability over affiliate", () => {
    const zenchef: BookingOption = {
      provider: "zenchef",
      action: "RESERVE",
      time: "19:30",
      url: "https://zenchef.example/book",
      availabilitySlot: {
        provider: "zenchef",
        restaurantId: "r1",
        startAt: "2026-09-19T19:30:00",
        partySize: 4,
        bookingUrl: "https://zenchef.example/book",
      },
    };
    const thefork: BookingOption = {
      provider: "thefork",
      action: "RESERVE",
      time: "21:30",
      url: "https://thefork.example/book",
      availabilitySlot: {
        provider: "thefork",
        restaurantId: "r1",
        startAt: "2026-09-19T21:30:00",
        partySize: 4,
        bookingUrl: "https://thefork.example/book",
      },
    };
    process.env.THEFORK_AFFILIATE_ID = "aff-1";
    expect(
      compareBookingOptions(zenchef, thefork, "19:30", {
        zenchef: 10,
        thefork: 30,
      }),
    ).toBeLessThan(0);
    delete process.env.THEFORK_AFFILIATE_ID;
  });

  it("uses affiliate only as tie-breaker when UX is equivalent", () => {
    process.env.THEFORK_AFFILIATE_ID = "aff-1";
    const slot = (provider: "zenchef" | "thefork"): AvailabilitySlot => ({
      provider,
      restaurantId: "r1",
      startAt: "2026-09-19T19:30:00",
      partySize: 4,
      bookingUrl: `https://${provider}.example/book`,
    });
    const zenchef: BookingOption = {
      provider: "zenchef",
      action: "RESERVE",
      url: "https://zenchef.example/book",
      availabilitySlot: slot("zenchef"),
    };
    const thefork: BookingOption = {
      provider: "thefork",
      action: "RESERVE",
      url: "https://thefork.example/book",
      availabilitySlot: slot("thefork"),
    };
    // Same time distance + action; equal priority → affiliate wins
    expect(
      compareBookingOptions(thefork, zenchef, "19:30", {
        zenchef: 10,
        thefork: 10,
      }),
    ).toBeLessThan(0);
    delete process.env.THEFORK_AFFILIATE_ID;
  });

  it("builds BOOK_EXTERNALLY only from verified active links", () => {
    const link: RestaurantReservationLink = {
      id: "l1",
      restaurantId: "r1",
      providerKey: "thefork",
      externalRestaurantId: "tf-1",
      bookingUrl: "https://www.thefork.nl/restaurant/x",
      matchConfidence: 0.9,
      matchStatus: "verified",
      verifiedAt: new Date().toISOString(),
      lastCheckedAt: null,
      active: true,
      metadata: null,
    };
    expect(optionFromVerifiedLink(link)?.action).toBe("BOOK_EXTERNALLY");
    expect(
      optionFromVerifiedLink({ ...link, matchStatus: "candidate" }),
    ).toBeNull();
  });

  it("builds BOOK_EXTERNALLY from a stored TheFork ratings URL", () => {
    const option = optionFromTheForkRatings(
      restaurant({
        ratings: {
          theFork: {
            url: "https://www.thefork.nl/restaurant/test-spot-r827794/reviews",
          },
        },
      }),
    );
    expect(option?.action).toBe("BOOK_EXTERNALLY");
    expect(option?.provider).toBe("thefork");
    expect(option?.url).toBe("https://www.thefork.nl/restaurant/test-spot-r827794");
  });
});

describe("createReservationService", () => {
  afterEach(() => {
    delete process.env.RESERVATIONS_ENABLED;
    delete process.env.ZENCHEF_ENABLED;
  });

  it("returns website fallback when providers are off", async () => {
    const service = createReservationService({
      listLinks: async () => [],
    });
    const result = await service.getReservationOptions(restaurant());
    expect(result.bestOption?.action).toBe("VISIT_WEBSITE");
    expect(result.fallback.action).toBe("VISIT_WEBSITE");
  });

  it("isolates adapter failures and still returns fallback", async () => {
    process.env.RESERVATIONS_ENABLED = "true";
    process.env.ZENCHEF_ENABLED = "true";

    const boom: ReservationProviderAdapter = {
      key: "zenchef",
      capabilities: () => ({
        restaurantMatching: true,
        availability: true,
        bookingUrl: true,
        directBooking: true,
        attribution: true,
      }),
      isConfigured: () => true,
      findRestaurant: async () => {
        throw new Error("network down");
      },
      getAvailability: async () => {
        throw new Error("timeout");
      },
      getBookingUrl: async () => {
        throw new Error("timeout");
      },
    };

    const service = createReservationService({
      adapters: [boom],
      listLinks: async () => [],
    });
    const result = await service.getReservationOptions(restaurant(), {
      date: "2026-09-19",
      time: "19:30",
      partySize: 4,
    });
    expect(result.bestOption?.action).toBe("VISIT_WEBSITE");
  });

  it("prefers verified deep link over website fallback", async () => {
    const service = createReservationService({
      listLinks: async () => [
        {
          id: "l1",
          restaurantId: "r1",
          providerKey: "zenchef",
          externalRestaurantId: "zc-1",
          bookingUrl: "https://book.zenchef.com/r/1",
          matchConfidence: 0.95,
          matchStatus: "verified",
          verifiedAt: new Date().toISOString(),
          lastCheckedAt: null,
          active: true,
          metadata: null,
        },
      ],
    });
    const best = await service.getBestBookingOption(restaurant());
    expect(best.action).toBe("BOOK_EXTERNALLY");
    expect(best.provider).toBe("zenchef");
  });

  it("uses a TheFork ratings URL when no reservation link exists", async () => {
    const service = createReservationService({
      listLinks: async () => [],
    });
    const best = await service.getBestBookingOption(
      restaurant({
        ratings: {
          theFork: { url: "https://www.thefork.nl/restaurant/test-spot-r827794" },
        },
      }),
    );
    expect(best.action).toBe("BOOK_EXTERNALLY");
    expect(best.provider).toBe("thefork");
    expect(best.url).toBe("https://www.thefork.nl/restaurant/test-spot-r827794");
  });
});
