/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getCountryFromDb,
  getRecipeRow,
  listCountriesFromDb,
} from "./content";
import { seedCountryRegions } from "./regions";
import { closeDb, ensureDb, resetAllTables } from "./restaurants";
import { seedDevCountries } from "./seeds/countries";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL?.trim() ||
  "postgresql://spoonspin:spoonspin@localhost:5435/spoonspin_test";

describe("recipe queries with regions join", () => {
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

  it("loads country recipes without ambiguous country_code", async () => {
    const db = await ensureDb();
    const region = await db.query(
      `SELECT id, name FROM regions WHERE country_code = 'cn' AND iso_code = 'CN-SC'`,
    );
    const regionId = String(region.rows[0]?.id);
    const regionName = String(region.rows[0]?.name);

    await db.query(
      `INSERT INTO recipes (
        country_code, id, menu_slot, sort_order, name, description,
        category, servings, prep_minutes, cook_minutes, difficulty,
        dietary_labels, ingredients, steps, region_id, updated_at
      ) VALUES (
        'cn', 'mapo-tofu', 'more', 0, 'Mapo tofu', 'Sichuan classic',
        'main', 4, 15, 20, 'medium', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        $1, NOW()
      )`,
      [regionId],
    );

    const country = await getCountryFromDb("cn");
    expect(country?.standaloneRecipes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "mapo-tofu",
          name: "Mapo tofu",
          regionId,
          regionName,
        }),
      ]),
    );

    const row = await getRecipeRow("cn", "mapo-tofu");
    expect(row?.recipe.regionName).toBe(regionName);

    const listed = await listCountriesFromDb();
    expect(listed.find((item) => item.code === "cn")?.standaloneRecipes?.[0]?.id).toBe(
      "mapo-tofu",
    );
  });
});
