import { describe, expect, it } from "vitest";
import {
  buildOvertureTileQuery,
  buildUnmappedCategoriesQuery,
  overtureRowToRestaurant,
  type OvertureRow,
} from "./overtureRestaurants.ts";
import {
  OVERTURE_CUISINE_BY_CATEGORY,
  overtureCuisineCodes,
} from "../../src/restaurants/overtureCuisineMap.ts";
import {
  OSM_CUISINE_BY_COUNTRY,
  hasPrimaryCuisineMatch,
} from "../../src/restaurants/osmCuisineMap.ts";

const row = (overrides: Partial<OvertureRow> = {}): OvertureRow => ({
  id: "08f1-abc",
  name: "Tanuki",
  category: "japanese_restaurant",
  alternates: null,
  confidence: 0.9,
  street: "Adalbertsteinweg 12",
  city: "Aachen",
  postcode: "52070",
  lat: 50.774,
  lng: 6.098,
  website: "https://tanuki.example",
  phone: "+49 241 000",
  ...overrides,
});

const place = (lat: number, lng: number) => (lat > 0 && lng > 0 ? "Germany" : "?");

describe("overtureCuisineCodes", () => {
  it("maps cuisine categories and ignores broad or unknown ones", () => {
    expect(overtureCuisineCodes(["korean_restaurant"])).toEqual(["kr"]);
    expect(
      overtureCuisineCodes(["restaurant", "pizza_restaurant", "asian_restaurant"]),
    ).toEqual([]);
    expect(overtureCuisineCodes(["sushi_restaurant", "japanese_restaurant"])).toEqual([
      "jp",
    ]);
    expect(overtureCuisineCodes([null, undefined, "made_up_restaurant"])).toEqual([]);
  });

  it("every mapped country has an OSM tag, so promotion can accept its rows", () => {
    for (const [category, code] of Object.entries(OVERTURE_CUISINE_BY_CATEGORY)) {
      expect(OSM_CUISINE_BY_COUNTRY[code], `${category} -> ${code}`).toBeDefined();
    }
  });
});

describe("overtureRowToRestaurant", () => {
  it("builds a restaurant that passes the same promotion rule as a tagged OSM place", () => {
    const r = overtureRowToRestaurant(row(), place)!;
    expect(r).toMatchObject({
      id: "overture:08f1-abc",
      osmId: "overture/08f1-abc",
      source: "overture",
      name: "Tanuki",
      city: "Aachen",
      cuisineCodes: ["jp"],
    });
    expect(r.address).toBe("Adalbertsteinweg 12, 52070, Aachen");
    expect(hasPrimaryCuisineMatch("jp", r.cuisineTags)).toBe(true);
  });

  it("collects cuisines from alternate categories too", () => {
    const r = overtureRowToRestaurant(
      row({
        category: "restaurant",
        alternates: ["thai_restaurant", "vietnamese_restaurant"],
      }),
      place,
    )!;
    expect(r.cuisineCodes).toEqual(["th", "vn"]);
  });

  it("falls back to coordinates and a place name when the address is missing", () => {
    const r = overtureRowToRestaurant(
      row({ street: null, city: null, postcode: null }),
      place,
    )!;
    expect(r.address).toBe("50.77400, 6.09800");
    expect(r.city).toBe("Germany");
  });

  it("skips places without a name, a location, or a specific cuisine", () => {
    expect(overtureRowToRestaurant(row({ name: "  " }), place)).toBeNull();
    expect(overtureRowToRestaurant(row({ lat: null }), place)).toBeNull();
    expect(
      overtureRowToRestaurant(row({ category: "pizza_restaurant" }), place),
    ).toBeNull();
  });
});

describe("tile query", () => {
  const tile = { south: 51, west: 6.5, north: 51.5, east: 7 };
  const sql = buildOvertureTileQuery(tile, "2026-11-18.0", 0.7);

  it("reads the given release, filters on the half-open tile, and keeps only open, confident places", () => {
    expect(sql).toContain("release/2026-11-18.0/theme=places/type=place/");
    expect(sql).toContain("bbox.xmin >= 6.5 AND bbox.xmin < 7");
    expect(sql).toContain("bbox.ymin >= 51 AND bbox.ymin < 51.5");
    expect(sql).toContain("operating_status = 'open'");
    expect(sql).toContain("confidence >= 0.7");
    expect(sql).toContain("'korean_restaurant'");
    expect(sql).toContain("list_has_any(taxonomy.alternates");
  });

  it("refuses a non-numeric bound instead of putting it in the SQL", () => {
    expect(() => buildOvertureTileQuery({ ...tile, west: Number.NaN }, "r")).toThrow();
  });

  it("the unmapped-category audit excludes what is already mapped", () => {
    const audit = buildUnmappedCategoriesQuery(tile, "2026-11-18.0");
    expect(audit).toContain("NOT IN (");
    expect(audit).toContain("LIKE '%restaurant%'");
  });
});
