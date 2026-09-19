/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import {
  clearTheForkHttpCaches,
  parseTheForkTimeslotPayload,
  fetchTheForkTimeslots,
} from "./theforkHttp";
import { createTheForkAdapter } from "./thefork";
import type { StoredRestaurant } from "../../db/restaurants";

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
    ratings: {
      theFork: { url: "https://www.thefork.nl/restaurant/test-spot-r123456" },
    },
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

describe("TheFork timeslot payload parser", () => {
  it("reads HH:MM strings and object slots", () => {
    const fromStrings = parseTheForkTimeslotPayload(
      { timeslots: ["19:00", "19:30"] },
      {
        restaurantId: "r1",
        date: "2026-09-19",
        partySize: 2,
        bookingUrl: "https://www.thefork.nl/restaurant/test-spot-r123456",
      },
    );
    expect(fromStrings.map((slot) => slot.startAt)).toEqual([
      "2026-09-19T19:00:00",
      "2026-09-19T19:30:00",
    ]);

    const fromObjects = parseTheForkTimeslotPayload(
      {
        data: [
          { time: "20:00", available: true, bookingUrl: "https://www.thefork.nl/book/1" },
          { time: "20:30", available: false },
        ],
      },
      {
        restaurantId: "r1",
        date: "2026-09-19",
        partySize: 2,
        bookingUrl: "https://www.thefork.nl/restaurant/test-spot-r123456",
      },
    );
    expect(fromObjects).toHaveLength(1);
    expect(fromObjects[0]?.bookingUrl).toBe("https://www.thefork.nl/book/1");
  });
});

describe("TheFork HTTP adapter", () => {
  afterEach(() => {
    clearTheForkHttpCaches();
    delete process.env.THEFORK_CLIENT_ID;
    delete process.env.THEFORK_CLIENT_SECRET;
  });

  it("matches a restaurant from a stored profile URL without API credentials", async () => {
    const adapter = createTheForkAdapter();
    const result = await adapter.findRestaurant(restaurant());
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.externalRestaurantId).toBe("123456");
      expect(result.data.bookingUrl).toBe(
        "https://www.thefork.nl/restaurant/test-spot-r123456",
      );
    }
  });

  it("returns booking URL from the stored profile without credentials", async () => {
    const adapter = createTheForkAdapter();
    const result = await adapter.getBookingUrl(restaurant());
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.url).toContain("thefork.nl/restaurant/test-spot-r123456");
    }
  });

  it("fetches timeslots with a mocked B2B client", async () => {
    process.env.THEFORK_CLIENT_ID = "client";
    process.env.THEFORK_CLIENT_SECRET = "secret";

    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("oauth/token")) {
        return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
      }
      if (url.includes("/timeslots")) {
        return new Response(JSON.stringify({ timeslots: ["19:00", "19:30"] }), {
          status: 200,
        });
      }
      return new Response("nope", { status: 404 });
    };

    const result = await fetchTheForkTimeslots(
      {
        externalRestaurantId: "123456",
        restaurantId: "r1",
        date: "2026-09-19",
        partySize: 2,
        bookingUrl: "https://www.thefork.nl/restaurant/test-spot-r123456",
      },
      { fetchImpl },
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.slots).toHaveLength(2);
    }

    const adapter = createTheForkAdapter({ fetchImpl });
    const availability = await adapter.getAvailability(restaurant(), {
      date: "2026-09-19",
      partySize: 2,
    });
    expect(availability.status).toBe("ok");
  });
});
