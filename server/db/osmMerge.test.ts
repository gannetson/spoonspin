import { describe, expect, it } from "vitest";
import { isProtectedRow, planOsmMerge, type ExistingOsmRow } from "./osmMerge.ts";
import type { RestaurantUpsert } from "./restaurants.ts";

const incoming = (over: Partial<RestaurantUpsert> = {}): RestaurantUpsert => ({
  id: "osm:node/1",
  name: "Lotus",
  address: "1 Main Street, 2311 AA, Leiden",
  city: "Leiden",
  postcode: "2311 AA",
  lat: 52.16,
  lng: 4.49,
  cuisineCodes: ["cn"],
  cuisineTags: ["chinese"],
  website: "https://lotus.example",
  phone: "+31 71 1234567",
  source: "overpass",
  osmId: "node/1",
  mapsUrl: "https://maps.example/x",
  ...over,
});

const stored = (over: Partial<ExistingOsmRow> = {}): ExistingOsmRow => ({
  id: "osm:node/1",
  name: "Lotus",
  address: "1 Main Street, 2311 AA, Leiden",
  city: "Leiden",
  postcode: "2311 AA",
  lat: 52.16,
  lng: 4.49,
  website: "https://lotus.example",
  phone: "+31 71 1234567",
  source: "overpass",
  reviewed: false,
  googlePlaceId: null,
  placesRefreshedAt: null,
  cuisineCodes: ["cn"],
  cuisineTags: ["chinese"],
  ...over,
});

describe("planOsmMerge: places that are not stored yet", () => {
  it("inserts", () => {
    expect(planOsmMerge(undefined, incoming())).toEqual({ action: "insert" });
  });
});

describe("planOsmMerge: plain, untouched OSM rows", () => {
  it("skips when nothing changed, so a re-harvest costs no write", () => {
    expect(planOsmMerge(stored(), incoming())).toEqual({ action: "skip" });
  });

  it("does not see a change in a field OSM no longer lists", () => {
    expect(planOsmMerge(stored(), incoming({ website: null, phone: null, postcode: null }))).toEqual({
      action: "skip",
    });
  });

  it("updates when the name, address or position changed upstream", () => {
    expect(planOsmMerge(stored(), incoming({ name: "Lotus Garden" })).action).toBe("update");
    expect(planOsmMerge(stored(), incoming({ address: "3 Other Road, Leiden" })).action).toBe("update");
    expect(planOsmMerge(stored(), incoming({ lat: 52.2 })).action).toBe("update");
  });

  it("updates when a new cuisine code appears", () => {
    expect(planOsmMerge(stored(), incoming({ cuisineCodes: ["cn", "th"] })).action).toBe("update");
  });
});

describe("planOsmMerge: reviewed or enriched rows are protected", () => {
  const cases: Array<[string, Partial<ExistingOsmRow>]> = [
    ["reviewed", { reviewed: true }],
    ["from another source", { source: "curated" }],
    ["matched to Google Places", { googlePlaceId: "ChIJabc" }],
    ["refreshed from Google Places", { placesRefreshedAt: "2026-10-01T00:00:00Z" }],
  ];

  for (const [label, over] of cases) {
    it(`treats a row that is ${label} as protected`, () => {
      expect(isProtectedRow(stored(over))).toBe(true);
    });

    it(`never overwrites the name or address of a row that is ${label}`, () => {
      const plan = planOsmMerge(
        stored({ ...over, name: "Curated Name", address: "Edited address" }),
        incoming({ name: "OSM Name", address: "OSM address", cuisineCodes: ["cn", "th"] }),
      );
      expect(plan.action).toBe("merge");
      // A merge plan has no name or address to write at all.
      expect(Object.keys(plan)).not.toContain("name");
      expect(Object.keys(plan)).not.toContain("address");
    });
  }

  it("adds new cuisine codes and tags to a reviewed row", () => {
    const plan = planOsmMerge(
      stored({ reviewed: true }),
      incoming({ cuisineCodes: ["th"], cuisineTags: ["thai"] }),
    );
    expect(plan).toMatchObject({ action: "merge", cuisineCodes: ["cn", "th"], cuisineTags: ["chinese", "thai"] });
  });

  it("fills only empty contact fields, never replaces existing ones", () => {
    const plan = planOsmMerge(
      stored({ reviewed: true, website: null, phone: "+31 6 000", postcode: null }),
      incoming({ website: "https://new.example", phone: "+31 71 999", postcode: "2311 AA" }),
    );
    expect(plan).toMatchObject({
      action: "merge",
      website: "https://new.example",
      phone: null,
      postcode: "2311 AA",
    });
  });

  it("skips a protected row that has nothing to gain", () => {
    expect(planOsmMerge(stored({ reviewed: true }), incoming())).toEqual({ action: "skip" });
  });
});
