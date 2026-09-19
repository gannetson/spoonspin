/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoredRestaurant } from "../db/restaurants";

vi.mock("./googlePlacesService.ts", () => ({
  isGooglePlacesConfigured: vi.fn(),
  lookupGoogleRestaurant: vi.fn(),
  getRestaurantByPlaceId: vi.fn(),
  placesContentNeedsRefresh: vi.fn(),
}));

vi.mock("../db/restaurants.ts", async () => {
  const actual = await vi.importActual<typeof import("../db/restaurants.ts")>(
    "../db/restaurants.ts",
  );
  return {
    ...actual,
    applyGooglePlaceIdentity: vi.fn(),
  };
});

import { applyGooglePlaceIdentity } from "../db/restaurants";
import {
  getRestaurantByPlaceId,
  isGooglePlacesConfigured,
  lookupGoogleRestaurant,
  placesContentNeedsRefresh,
} from "./googlePlacesService";
import { reconcileRestaurantWithGooglePlaces } from "./reconcileRestaurantPlaces";

function baseRestaurant(partial: Partial<StoredRestaurant> = {}): StoredRestaurant {
  return {
    id: "osm:node/1",
    name: "Trattoria",
    address: "Breestraat 1",
    city: "Leiden",
    postcode: "2311 CS",
    lat: 52.16,
    lng: 4.49,
    cuisineCodes: ["it"],
    cuisineTags: ["italian"],
    website: null,
    phone: null,
    source: "overpass",
    osmId: "node/1",
    googlePlaceId: null,
    mapsUrl: "https://maps.google.com/?q=Trattoria",
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
    businessStatus: null,
    primaryType: null,
    placesRefreshedAt: null,
    ...partial,
  };
}

describe("reconcileRestaurantWithGooglePlaces", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns not_configured without a Places key", async () => {
    vi.mocked(isGooglePlacesConfigured).mockReturnValue(false);
    const result = await reconcileRestaurantWithGooglePlaces(baseRestaurant());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe("not_configured");
  });

  it("looks up and applies Place Details when missing place id", async () => {
    vi.mocked(isGooglePlacesConfigured).mockReturnValue(true);
    vi.mocked(lookupGoogleRestaurant).mockResolvedValue({
      placeId: "ChIJ_new",
      name: "Trattoria",
      address: "Breestraat 1",
      city: "Leiden",
    });
    vi.mocked(placesContentNeedsRefresh).mockReturnValue(true);
    vi.mocked(getRestaurantByPlaceId).mockResolvedValue({
      placeId: "ChIJ_new",
      name: "Trattoria Leiden",
      formattedAddress: "Breestraat 1, 2311 CS Leiden, Netherlands",
      address: "Breestraat 1",
      city: "Leiden",
      postcode: "2311 CS",
      website: "https://trattoria.nl",
      mapsUrl: "https://maps.google.com/?cid=1",
      businessStatus: "OPERATIONAL",
      primaryType: "restaurant",
      fetchedAt: "2026-09-16T00:00:00.000Z",
    });
    const updated = baseRestaurant({
      googlePlaceId: "ChIJ_new",
      name: "Trattoria Leiden",
      website: "https://trattoria.nl",
    });
    vi.mocked(applyGooglePlaceIdentity).mockResolvedValue(updated);

    const result = await reconcileRestaurantWithGooglePlaces(baseRestaurant());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.restaurant.googlePlaceId).toBe("ChIJ_new");
      expect(result.restaurant.website).toBe("https://trattoria.nl");
    }
  });

  it("returns not_found when lookup misses", async () => {
    vi.mocked(isGooglePlacesConfigured).mockReturnValue(true);
    vi.mocked(lookupGoogleRestaurant).mockResolvedValue(null);
    const result = await reconcileRestaurantWithGooglePlaces(baseRestaurant());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe("not_found");
  });
});
