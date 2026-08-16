/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, ensureDb, resetAllTables } from "./restaurants";
import { SEED_COUNTRIES, seedDevCountries } from "./seedCountries";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL?.trim() ||
  "postgresql://spoonspin:spoonspin@localhost:5435/spoonspin_test";

describe("seedDevCountries", () => {
  beforeEach(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    await ensureDb();
    await resetAllTables();
  });

  afterEach(async () => {
    await closeDb();
    delete process.env.DATABASE_URL;
  });

  it("inserts five starter countries including China", async () => {
    const db = await ensureDb();
    const inserted = await seedDevCountries(db);
    expect(inserted).toBe(5);

    const result = await db.query(
      `SELECT code, name FROM countries ORDER BY name ASC`,
    );
    expect(result.rows.map((row) => String(row.code))).toEqual([
      "cn",
      "it",
      "jp",
      "mx",
      "nl",
    ]);
    expect(SEED_COUNTRIES.some((country) => country.code === "cn")).toBe(true);
  });

  it("is idempotent when countries already exist", async () => {
    const db = await ensureDb();
    expect(await seedDevCountries(db)).toBe(5);
    expect(await seedDevCountries(db)).toBe(0);
  });
});
