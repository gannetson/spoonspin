/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, ensureDb, resetAllTables } from "../restaurants";
import { seedCountryRegions } from "../regions";
import { migrateRegionIdsToIso } from "./migrateIds";
import { seedDevCountries } from "../seeds/countries";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL?.trim() ||
  "postgresql://spoonspin:spoonspin@localhost:5435/spoonspin_test";

describe("migrateRegionIdsToIso", () => {
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

  it("rewires legacy slug region ids to ISO ids", async () => {
    const db = await ensureDb();

    await db.query(
      `UPDATE regions
       SET id = 'cn:legacy-anhui'
       WHERE country_code = 'cn' AND iso_code = 'CN-AH'`,
    );

    await db.query(
      `INSERT INTO recipes (
        country_code, id, menu_slot, sort_order, name, description,
        category, servings, prep_minutes, cook_minutes, difficulty,
        dietary_labels, ingredients, steps, region_id, updated_at
      ) VALUES (
        'cn', 'legacy-anhui-recipe', 'more', 0, 'Test dish', 'Test',
        'main', 4, 10, 10, 'easy', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        'cn:legacy-anhui', NOW()
      )`,
    );

    await migrateRegionIdsToIso(db);

    const region = await db.query(
      `SELECT id FROM regions WHERE country_code = 'cn' AND iso_code = 'CN-AH'`,
    );
    expect(region.rows[0]?.id).toBe("cn:CN-AH");

    const recipe = await db.query(`SELECT region_id FROM recipes WHERE id = 'legacy-anhui-recipe'`);
    expect(recipe.rows[0]?.region_id).toBe("cn:CN-AH");

    const legacy = await db.query(`SELECT id FROM regions WHERE id = 'cn:legacy-anhui'`);
    expect(legacy.rows).toHaveLength(0);
  });
});
