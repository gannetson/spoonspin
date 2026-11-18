import { describe, expect, it } from "vitest";
import { hasUsableAddress, storedRowToGroundedPlace } from "./storedRestaurantSearch.ts";
import { osmSearchAreas } from "./osmRestaurantSearch.ts";
import type { StoredRestaurant } from "../db/restaurants.ts";

const row = (overrides: Partial<StoredRestaurant> = {}): StoredRestaurant =>
  ({
    id: "overture:abc",
    name: "Tanuki",
    address: "Adalbertsteinweg 12, 52070, Aachen",
    city: "Aachen",
    postcode: "52070",
    lat: 50.774,
    lng: 6.098,
    cuisineCodes: ["jp"],
    cuisineTags: ["japanese"],
    website: "https://tanuki.example",
    phone: null,
    source: "overture",
    osmId: "overture/abc",
    mapsUrl: "https://maps.example/x",
    ...overrides,
  }) as StoredRestaurant;

describe("hasUsableAddress", () => {
  it("rejects coordinate and country-name fallbacks", () => {
    expect(hasUsableAddress({ address: "Adalbertsteinweg 12, Aachen" })).toBe(true);
    expect(hasUsableAddress({ address: "50.77400, 6.09800" })).toBe(false);
    expect(hasUsableAddress({ address: "Germany" })).toBe(false);
    expect(hasUsableAddress({ address: " " })).toBe(false);
  });
});

describe("storedRowToGroundedPlace", () => {
  it("labels an Overture row as overture and carries its cuisine tags as evidence", () => {
    const place = storedRowToGroundedPlace(row());
    expect(place).toMatchObject({
      source: "overture",
      placeId: "stored:overture/abc",
      name: "Tanuki",
      address: "Adalbertsteinweg 12",
      city: "Aachen",
      sourceCuisineTags: ["japanese"],
    });
  });

  it("keeps an OSM-harvested row on the live OSM key so one venue stays one candidate", () => {
    const place = storedRowToGroundedPlace(
      row({ source: "overpass", osmId: "node/42", cuisineTags: ["japanese", "sushi"] }),
    );
    expect(place.source).toBe("osm");
    expect(place.placeId).toBe("osm:node/42");
  });
});

describe("osmSearchAreas", () => {
  it("always searches the Netherlands", () => {
    expect(osmSearchAreas().map((a) => a.label)).toEqual(["Netherlands"]);
    expect(osmSearchAreas("family-run, vegan").map((a) => a.label)).toEqual([
      "Netherlands",
    ]);
  });

  it("does not add a second search for a Dutch city (the nationwide one covers it)", () => {
    expect(osmSearchAreas("Amsterdam").map((a) => a.label)).toEqual(["Netherlands"]);
  });

  it("adds a city-sized search around a Belgian or German city named in the focus", () => {
    const areas = osmSearchAreas("Antwerp");
    expect(areas.map((a) => a.label)).toEqual(["Netherlands", "Antwerpen"]);
    const box = areas[1]!.bbox;
    expect(box.south).toBeLessThan(51.2194);
    expect(box.north).toBeGreaterThan(51.2194);
    expect(box.west).toBeLessThan(4.4025);
    expect(box.east).toBeGreaterThan(4.4025);
    expect(box.north - box.south).toBeLessThan(0.5);
    expect(osmSearchAreas("indian near Aachen").map((a) => a.label)).toContain("Aachen");
  });
});
