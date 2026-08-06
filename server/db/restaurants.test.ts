/** @vitest-environment node */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeDb,
  getDb,
  searchLocalRestaurants,
  upsertRestaurant,
} from "./restaurants";

describe("local restaurant repository", () => {
  let tempDir: string;
  let dbPath: string;

  afterEach(() => {
    closeDb();
    delete process.env.RESTAURANTS_DB_PATH;
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function openTempDb() {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spoonspin-db-"));
    dbPath = path.join(tempDir, "test.sqlite");
    process.env.RESTAURANTS_DB_PATH = dbPath;
    getDb(dbPath);
  }

  it("returns specialty Italian matches and ignores weak tags", () => {
    openTempDb();
    upsertRestaurant({
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
    upsertRestaurant({
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

    const results = searchLocalRestaurants({
      countryCode: "it",
      cityOrPostcode: "Leiden",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Trattoria Leiden");
  });

  it("ranks nearby specialty places even when city text differs", () => {
    openTempDb();
    upsertRestaurant({
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

    const results = searchLocalRestaurants({
      countryCode: "ge",
      cityOrPostcode: "Leiden",
    });

    expect(results[0]?.name).toBe("Marani");
  });

  it("defaults to reviewed-only and sorts by authenticity then distance", () => {
    openTempDb();
    upsertRestaurant({
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
    upsertRestaurant({
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
    upsertRestaurant({
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

    const reviewed = searchLocalRestaurants({
      countryCode: "ge",
      cityOrPostcode: "Leiden",
    });
    expect(reviewed.map((r) => r.name)).toEqual([
      "High Authenticity Far",
      "Mid Authenticity Near",
    ]);
    expect(reviewed[0]?.authenticityRating).toBe(5);

    const all = searchLocalRestaurants({
      countryCode: "ge",
      cityOrPostcode: "Leiden",
      reviewedOnly: false,
    });
    expect(all).toHaveLength(3);
  });
});
