/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyGooglePlaceIdentity,
  closeDb,
  ensureDb,
  getRestaurantByGooglePlaceId,
  getRestaurantById,
  resetAllTables,
  upsertRestaurant,
} from "./restaurants";
import {
  listRestaurantReservationLinks,
  createReservationReferral,
  upsertRestaurantReservationLink,
} from "./reservations";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL?.trim() || "postgresql://localhost:5432/spoonspin_test";

describe("google place identity + reservation links", () => {
  beforeEach(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    await closeDb();
    await ensureDb();
    await resetAllTables();
  });

  afterEach(async () => {
    await closeDb();
    delete process.env.DATABASE_URL;
  });

  it("stores google_place_id uniquely and prevents duplicate venues", async () => {
    await upsertRestaurant({
      id: "osm:node/10",
      name: "Venue A",
      address: "Street 1",
      city: "Leiden",
      lat: 52.16,
      lng: 4.49,
      cuisineCodes: ["it"],
      cuisineTags: ["italian"],
      source: "overpass",
      osmId: "node/10",
      mapsUrl: "https://maps.google.com/?cid=1",
      googlePlaceId: "ChIJ_test_a",
    });

    await upsertRestaurant({
      id: "osm:node/11",
      name: "Venue B",
      address: "Street 2",
      city: "Leiden",
      cuisineCodes: ["it"],
      cuisineTags: ["italian"],
      source: "overpass",
      osmId: "node/11",
      mapsUrl: "https://maps.google.com/?cid=2",
    });

    const byPlace = await getRestaurantByGooglePlaceId("ChIJ_test_a");
    expect(byPlace?.id).toBe("osm:node/10");

    await expect(
      applyGooglePlaceIdentity("osm:node/11", { googlePlaceId: "ChIJ_test_a" }),
    ).rejects.toThrow(/already linked/);
  });

  it("applies Places details onto an existing OSM restaurant", async () => {
    await upsertRestaurant({
      id: "osm:node/20",
      name: "Old Name",
      address: "Old",
      city: "Leiden",
      cuisineCodes: ["jp"],
      cuisineTags: ["japanese"],
      source: "overpass",
      osmId: "node/20",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Old",
    });

    const updated = await applyGooglePlaceIdentity("osm:node/20", {
      googlePlaceId: "ChIJ_refresh",
      name: "New Name",
      website: "https://example.nl",
      businessStatus: "OPERATIONAL",
      primaryType: "restaurant",
      priceLevel: 2,
      placesRefreshedAt: new Date().toISOString(),
    });

    expect(updated.googlePlaceId).toBe("ChIJ_refresh");
    expect(updated.name).toBe("New Name");
    expect(updated.website).toBe("https://example.nl");
    expect(updated.businessStatus).toBe("OPERATIONAL");
    expect(updated.primaryType).toBe("restaurant");
    expect(updated.priceLevel).toBe(2);
    expect(updated.placesRefreshedAt).toBeTruthy();
  });

  it("stores provider-neutral reservation associations without duplicating restaurants", async () => {
    await upsertRestaurant({
      id: "osm:node/30",
      name: "Bookable Spot",
      address: "Breestraat 1",
      city: "Leiden",
      cuisineCodes: ["fr"],
      cuisineTags: ["french"],
      source: "overpass",
      osmId: "node/30",
      mapsUrl: "https://maps.google.com/?q=Bookable",
      googlePlaceId: "ChIJ_bookable",
    });

    await upsertRestaurantReservationLink({
      restaurantId: "osm:node/30",
      providerKey: "zenchef",
      externalRestaurantId: "zc-123",
      matchStatus: "verified",
      matchConfidence: 0.92,
      active: true,
      verifiedAt: new Date().toISOString(),
    });
    await upsertRestaurantReservationLink({
      restaurantId: "osm:node/30",
      providerKey: "thefork",
      externalRestaurantId: "tf-abc",
      bookingUrl: "https://www.thefork.nl/restaurant/bookable-spot-r123",
      matchStatus: "verified",
      active: true,
    });

    const links = await listRestaurantReservationLinks("osm:node/30");
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.providerKey).sort()).toEqual(["thefork", "zenchef"]);

    const restaurant = await getRestaurantById("osm:node/30");
    expect(restaurant?.googlePlaceId).toBe("ChIJ_bookable");

    const referralId = await createReservationReferral({
      restaurantId: "osm:node/30",
      providerKey: "zenchef",
      partySize: 4,
      requestedDate: "2026-09-19",
      requestedTime: "19:30",
    });
    expect(referralId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
