/** @vitest-environment node */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, ensureDb, resetAllTables } from "./restaurants";
import { seedCountryRegions } from "./regions";
import {
  CHINESE_REGION_RECIPES,
  seedChineseRegionRecipes,
} from "./seedChineseRegionRecipes";
import { seedDevCountries } from "./seedCountries";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL?.trim() ||
  "postgresql://spoonspin:spoonspin@localhost:5435/spoonspin_test";

const cnCatalog = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "regions/data/cn.json"),
    "utf8",
  ),
) as { subdivisions: Array<{ isoCode: string; name: string }> };

/** Regions with seeded recipes (Taiwan has no recipe yet). */
const REGIONS_WITH_RECIPES = cnCatalog.subdivisions.filter(
  (entry) => entry.isoCode !== "CN-TW",
);

describe("seedChineseRegionRecipes", () => {
  it("defines one recipe for every seeded Chinese region", () => {
    expect(CHINESE_REGION_RECIPES).toHaveLength(REGIONS_WITH_RECIPES.length);
    expect(new Set(CHINESE_REGION_RECIPES.map((entry) => entry.region)).size).toBe(
      REGIONS_WITH_RECIPES.length,
    );
  });

  beforeEach(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    await ensureDb();
    await resetAllTables();
    const db = await ensureDb();
    await seedDevCountries(db);
    await seedCountryRegions("cn", db);
  });

  afterEach(async () => {
    await closeDb();
    delete process.env.DATABASE_URL;
  });

  it("inserts one recipe per Chinese region", async () => {
    const db = await ensureDb();
    const inserted = await seedChineseRegionRecipes(db);
    expect(inserted).toBe(CHINESE_REGION_RECIPES.length);

    const linked = await db.query(
      `SELECT COUNT(*)::int AS n
       FROM recipes
       WHERE country_code = 'cn' AND region_id IS NOT NULL`,
    );
    expect(linked.rows[0]?.n).toBe(CHINESE_REGION_RECIPES.length);
  });

  it("is idempotent when recipes already exist", async () => {
    const db = await ensureDb();
    expect(await seedChineseRegionRecipes(db)).toBe(CHINESE_REGION_RECIPES.length);
    expect(await seedChineseRegionRecipes(db)).toBe(0);
  });
});
