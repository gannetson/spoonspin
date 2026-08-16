/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, ensureDb, resetAllTables } from "./restaurants";
import { CHINESE_REGIONS, seedChineseRegions } from "./regions";
import {
  CHINESE_REGION_RECIPES,
  seedChineseRegionRecipes,
} from "./seedChineseRegionRecipes";
import { seedDevCountries } from "./seedCountries";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL?.trim() ||
  "postgresql://spoonspin:spoonspin@localhost:5435/spoonspin_test";

describe("seedChineseRegionRecipes", () => {
  it("defines one recipe for every Chinese region", () => {
    expect(CHINESE_REGION_RECIPES).toHaveLength(CHINESE_REGIONS.length);
    expect(new Set(CHINESE_REGION_RECIPES.map((entry) => entry.region)).size).toBe(
      CHINESE_REGIONS.length,
    );
  });

  beforeEach(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    await ensureDb();
    await resetAllTables();
    const db = await ensureDb();
    await seedDevCountries(db);
    await seedChineseRegions(db);
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
