import { describe, expect, it } from "vitest";
import {
  mapZenchefRestaurantItem,
  zenchefBookingUrl,
} from "./zenchefRestaurantSearch.ts";
import { searchTheForkRestaurants } from "./theforkRestaurantSearch.ts";

describe("mapZenchefRestaurantItem", () => {
  it("maps a NL partner restaurant with a booking widget URL", () => {
    const place = mapZenchefRestaurantItem(
      {
        id: 353006,
        name: "Oda Albania",
        address: "Haarlemmerstraat 10",
        zip: "2312 GD",
        city: "Leiden",
        country_iso2: "NL",
        latitude: 52.16,
        longitude: 4.49,
        own_website: "https://oda.example",
        phone: "+31 71 000 0000",
        cuisines: [{ translations: [{ title: "Albanian", locale: "en" }] }],
      },
      "Zenchef · Albania",
    );
    expect(place).toMatchObject({
      source: "zenchef",
      name: "Oda Albania",
      city: "Leiden",
      website: "https://oda.example",
    });
    expect(place?.zenchefUrl).toBe(zenchefBookingUrl(353006));
    expect(place?.placeId).toBe("zenchef:353006");
  });

  it("rejects restaurants outside the Netherlands", () => {
    expect(
      mapZenchefRestaurantItem(
        {
          id: 1,
          name: "Paris Bistro",
          address: "1 Rue Example",
          city: "Paris",
          country_iso2: "FR",
        },
        "Zenchef · France",
      ),
    ).toBeNull();
  });
});

describe("searchTheForkRestaurants", () => {
  it("skips when B2B credentials are missing", async () => {
    delete process.env.THEFORK_CLIENT_ID;
    delete process.env.THEFORK_CLIENT_SECRET;
    const logs: string[] = [];
    const result = await searchTheForkRestaurants({
      countryName: "Albania",
      onProgress: (message) => logs.push(message),
    });
    expect(result.places).toEqual([]);
    expect(result.notes).toMatch(/no restaurant search/i);
    expect(logs).toEqual([]);
  });
});
