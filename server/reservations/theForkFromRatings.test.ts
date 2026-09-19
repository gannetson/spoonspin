/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { theForkReservationFromRatings } from "./theForkFromRatings";
import { ingestCatalogCandidate } from "./catalogIngest";

describe("theForkReservationFromRatings", () => {
  it("builds a verified TheFork reservation link from ratings_json", () => {
    const input = theForkReservationFromRatings({
      id: "osm:1",
      ratings: {
        theFork: {
          url: "https://www.thefork.nl/restaurant/foo-bar-r42424/menu",
        },
      },
    });
    expect(input).toMatchObject({
      restaurantId: "osm:1",
      providerKey: "thefork",
      externalRestaurantId: "42424",
      bookingUrl: "https://www.thefork.nl/restaurant/foo-bar-r42424",
      matchStatus: "verified",
      active: true,
    });
  });

  it("ignores search pages", () => {
    expect(
      theForkReservationFromRatings({
        id: "osm:1",
        ratings: { theFork: { url: "https://www.thefork.nl/search?text=x" } },
      }),
    ).toBeNull();
  });
});

describe("ingestCatalogCandidate", () => {
  it("refuses catalog rows without a Google Place id", async () => {
    const result = await ingestCatalogCandidate({
      name: "Mystery Kitchen",
      city: "Leiden",
      theForkUrl: "https://www.thefork.nl/restaurant/mystery-r1",
    });
    expect(result.status).toBe("needs_review");
  });
});
