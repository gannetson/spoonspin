/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeDb,
  ensureDb,
  resetAllTables,
  searchLocalRestaurants,
  upsertRestaurant,
} from "./restaurants";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL?.trim() || "postgresql://localhost:5432/spoonspin_test";

describe("local restaurant repository", () => {
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

  it("returns specialty Italian matches and ignores weak tags", async () => {
    await upsertRestaurant({
      id: "osm:node/1",
      name: "Trattoria Leiden",
      address: "Breestraat 1, Leiden",
      city: "Leiden",
      lat: 52.16,
      lng: 4.49,
      cuisineCodes: ["it"],
      cuisineTags: ["italian"],
      source: "overpass",
      osmId: "node/1",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Trattoria",
      reviewed: true,
      authenticityRating: 4,
    });
    await upsertRestaurant({
      id: "osm:node/2",
      name: "Asian Fusion Spot",
      address: "Somewhere 2, Leiden",
      city: "Leiden",
      lat: 52.161,
      lng: 4.491,
      cuisineCodes: ["it"],
      cuisineTags: ["asian"],
      source: "overpass",
      osmId: "node/2",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Asian",
      reviewed: true,
      authenticityRating: 2,
    });

    const results = await searchLocalRestaurants({
      countryCode: "it",
      cityOrPostcode: "Leiden",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Trattoria Leiden");
  });

  it("includes admin-discovered places even when cuisine tags are aliases", async () => {
    await upsertRestaurant({
      id: "admin-test-af",
      name: "Admin Afghan Spot",
      address: "Somewhere 9, Den Haag",
      city: "Den Haag",
      lat: 52.07,
      lng: 4.3,
      cuisineCodes: ["af"],
      cuisineTags: ["Afghanistan restaurant", "Afghanistan cuisine"],
      source: "admin-discover",
      osmId: "admin:test-af",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Admin",
      reviewed: true,
      authenticityRating: 4,
    });

    const results = await searchLocalRestaurants({
      countryCode: "af",
      cityOrPostcode: "Den Haag",
    });

    expect(results.some((row) => row.name === "Admin Afghan Spot")).toBe(true);
  });

  it("ranks nearby specialty places even when city text differs", async () => {
    await upsertRestaurant({
      id: "osm:node/3",
      name: "Marani",
      address: "Delft",
      city: "Delft",
      lat: 52.0116,
      lng: 4.3571,
      cuisineCodes: ["ge"],
      cuisineTags: ["georgian"],
      source: "overpass",
      osmId: "node/3",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Marani",
      reviewed: true,
      authenticityRating: 5,
    });

    const results = await searchLocalRestaurants({
      countryCode: "ge",
      cityOrPostcode: "Leiden",
    });

    expect(results[0]?.name).toBe("Marani");
  });

  it("defaults to reviewed-only and sorts by authenticity then distance", async () => {
    await upsertRestaurant({
      id: "curated:a",
      name: "High Authenticity Far",
      address: "Amsterdam",
      city: "Amsterdam",
      lat: 52.3676,
      lng: 4.9041,
      cuisineCodes: ["ge"],
      cuisineTags: ["georgian"],
      source: "curated",
      osmId: "curated:a",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=High",
      reviewed: true,
      authenticityRating: 5,
      authenticityNotes: "Highly authentic Georgian specialty kitchen for testing.",
    });
    await upsertRestaurant({
      id: "curated:b",
      name: "Mid Authenticity Near",
      address: "Leiden",
      city: "Leiden",
      lat: 52.1601,
      lng: 4.497,
      cuisineCodes: ["ge"],
      cuisineTags: ["georgian"],
      source: "curated",
      osmId: "curated:b",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mid",
      reviewed: true,
      authenticityRating: 3,
      authenticityNotes: "Solid specialty with adaptation for testing order.",
    });
    await upsertRestaurant({
      id: "osm:node/unreviewed",
      name: "Unreviewed OSM",
      address: "Leiden",
      city: "Leiden",
      lat: 52.1602,
      lng: 4.4971,
      cuisineCodes: ["ge"],
      cuisineTags: ["georgian"],
      source: "overpass",
      osmId: "node/unreviewed",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Unreviewed",
    });

    const reviewed = await searchLocalRestaurants({
      countryCode: "ge",
      cityOrPostcode: "Leiden",
    });
    expect(reviewed.map((r) => r.name)).toEqual([
      "High Authenticity Far",
      "Mid Authenticity Near",
    ]);
    expect(reviewed[0]?.authenticityRating).toBe(5);

    const all = await searchLocalRestaurants({
      countryCode: "ge",
      cityOrPostcode: "Leiden",
      reviewedOnly: false,
    });
    expect(all).toHaveLength(3);
  });

  it("hides low-authenticity and ungeocoded admin additions", async () => {
    await upsertRestaurant({
      id: "admin-weak",
      name: "Weak Match Cafe",
      address: "Somewhere 1, Leiden",
      city: "Leiden",
      lat: 52.16,
      lng: 4.49,
      cuisineCodes: ["it"],
      cuisineTags: ["italian"],
      source: "admin-discover",
      osmId: "admin:weak",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Weak",
      reviewed: true,
      authenticityRating: 2,
    });
    await upsertRestaurant({
      id: "admin-nocoords",
      name: "No Coords Trattoria",
      address: "Mystery Street 1, Leiden",
      city: "Leiden",
      cuisineCodes: ["it"],
      cuisineTags: ["italian"],
      source: "admin-discover",
      osmId: "admin:nocoords",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=NoCoords",
      reviewed: true,
      authenticityRating: 4,
    });
    await upsertRestaurant({
      id: "admin-good",
      name: "Good Trattoria",
      address: "Breestraat 9, Leiden",
      city: "Leiden",
      lat: 52.1605,
      lng: 4.492,
      cuisineCodes: ["it"],
      cuisineTags: ["italian"],
      source: "admin-discover",
      osmId: "admin:good",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Good",
      reviewed: true,
      authenticityRating: 4,
    });

    const results = await searchLocalRestaurants({
      countryCode: "it",
      cityOrPostcode: "Leiden",
    });

    expect(results.map((row) => row.name)).toEqual(["Good Trattoria"]);
  });
});

async function countRows(): Promise<number> {
  const db = await ensureDb();
  const result = await db.query(`SELECT COUNT(*)::int AS n FROM restaurants`);
  return Number(result.rows[0]?.n ?? 0);
}

async function row(id: string) {
  const db = await ensureDb();
  const result = await db.query(`SELECT * FROM restaurants WHERE id = $1`, [id]);
  return result.rows[0];
}

/** A venue as discovery first files it, under one cuisine. */
function baseVenue() {
  return {
    id: "admin-aaaa1111",
    osmId: "admin-reassign:aaaa1111",
    name: "Orontes West",
    address: "Bos en Lommerplein 8",
    city: "Amsterdam",
    cuisineCodes: ["tr"],
    cuisineTags: ["turkish"],
    source: "admin-discover-reassign",
    mapsUrl: "https://maps.example/orontes",
    googlePlaceId: "ChIJorontes",
    reviewed: true,
    authenticityRating: 4,
  };
}

describe("restaurant upsert deduplication", () => {
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

  it("merges a venue arriving under a new osm id but the same Google place", async () => {
    // Re-filing a venue under a second cuisine changes the synthetic hash, so
    // it arrives with different `id` and `osm_id` — but the same real venue.
    const first = await upsertRestaurant(baseVenue());
    const second = await upsertRestaurant({
      ...baseVenue(),
      id: "admin-bbbb2222",
      osmId: "admin:bbbb2222",
      cuisineCodes: ["am"],
      cuisineTags: ["armenian"],
      source: "admin-discover",
    });

    expect(second).toBe(first);
    expect(await countRows()).toBe(1);
  });

  it("unions the cuisines of the rows it merges", async () => {
    await upsertRestaurant(baseVenue());
    const id = await upsertRestaurant({
      ...baseVenue(),
      id: "admin-bbbb2222",
      osmId: "admin:bbbb2222",
      cuisineCodes: ["am"],
      cuisineTags: ["armenian"],
    });

    const stored = await row(id);
    expect(stored?.cuisine_codes).toEqual(expect.arrayContaining(["tr", "am"]));
    expect(stored?.cuisine_tags).toEqual(expect.arrayContaining(["turkish", "armenian"]));
  });

  it("merges on the primary key when the osm id drifts", async () => {
    // The admin save path and the reassign path build the same `admin-<hash>`
    // id but different osm ids, which used to be a primary key violation.
    await upsertRestaurant({ ...baseVenue(), googlePlaceId: null });
    const id = await upsertRestaurant({
      ...baseVenue(),
      osmId: "admin:aaaa1111",
      googlePlaceId: null,
    });

    expect(id).toBe("admin-aaaa1111");
    expect(await countRows()).toBe(1);
  });

  it("still keeps genuinely different venues apart", async () => {
    await upsertRestaurant(baseVenue());
    await upsertRestaurant({
      ...baseVenue(),
      id: "admin-cccc3333",
      osmId: "admin:cccc3333",
      name: "Somewhere Else",
      googlePlaceId: "ChIJsomewhereelse",
    });

    expect(await countRows()).toBe(2);
  });

  it("adopts a Google place id the stored row was missing", async () => {
    await upsertRestaurant({ ...baseVenue(), googlePlaceId: null });
    const id = await upsertRestaurant({ ...baseVenue(), googlePlaceId: "ChIJorontes" });

    expect(await row(id)).toMatchObject({ google_place_id: "ChIJorontes" });
    expect(await countRows()).toBe(1);
  });

  it("does not fail when two venues resolve to one Google place", async () => {
    // A restaurant inside a hotel can share a Places entry with it. The second
    // row keeps its own identity and simply goes without the place id.
    await upsertRestaurant(baseVenue());
    const id = await upsertRestaurant({
      ...baseVenue(),
      id: "admin-dddd4444",
      osmId: "admin:dddd4444",
      name: "Hotel Restaurant",
      googlePlaceId: "ChIJorontes",
    });

    // Merged into the existing row rather than duplicated.
    expect(id).toBe("admin-aaaa1111");
    expect(await countRows()).toBe(1);
  });

  it("keeps updating the same row on an ordinary OSM re-import", async () => {
    const first = await upsertRestaurant({
      id: "osm:node/99",
      osmId: "node/99",
      name: "Sofra",
      address: "Kerkstraat 1",
      city: "Utrecht",
      cuisineCodes: ["tr"],
      cuisineTags: ["turkish"],
      source: "overpass",
      mapsUrl: "https://maps.example/sofra",
      reviewed: false,
    });
    const second = await upsertRestaurant({
      id: "osm:node/99",
      osmId: "node/99",
      name: "Sofra Pide",
      address: "Kerkstraat 1",
      city: "Utrecht",
      cuisineCodes: ["tr"],
      cuisineTags: ["turkish"],
      source: "overpass",
      mapsUrl: "https://maps.example/sofra",
      reviewed: false,
    });

    expect(second).toBe(first);
    expect(await countRows()).toBe(1);
    expect(await row(second)).toMatchObject({ name: "Sofra Pide" });
  });
});
