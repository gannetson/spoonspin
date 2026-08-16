import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import {
  loadCountryCatalog,
  normalizeRegionName,
  regionIdFromIso,
} from "./catalog.ts";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "data");

export function listCountryCatalogCodes(): string[] {
  try {
    return readdirSync(dataDir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -".json".length))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Ensure ISO-based region ids exist and rewire legacy slug ids (e.g. cn:sichuan → cn:CN-SC).
 * Safe to run on every startup — no-ops when already migrated.
 */
export async function migrateRegionIdsToIso(db: Pool): Promise<void> {
  for (const countryCode of listCountryCatalogCodes()) {
    await migrateCountryRegionIdsToIso(db, countryCode);
  }
}

async function migrateCountryRegionIdsToIso(db: Pool, countryCode: string): Promise<void> {
  const catalog = loadCountryCatalog(countryCode);
  if (!catalog) return;

  const code = countryCode.toLowerCase();

  for (const entry of catalog.subdivisions) {
    const newId = regionIdFromIso(code, entry.isoCode);
    const normalized = normalizeRegionName(entry.name);

    const existing = await db.query<{ id: string }>(
      `SELECT id FROM regions
       WHERE country_code = $1 AND normalized_name = $2`,
      [code, normalized],
    );
    const legacyId = existing.rows[0]?.id;

    if (legacyId === newId) continue;

    await db.query("BEGIN");
    try {
      if (legacyId && legacyId !== newId) {
        // Free unique (country_code, normalized_name) and iso_code before inserting the ISO row.
        await db.query(
          `UPDATE regions
           SET normalized_name = $1, iso_code = NULL
           WHERE id = $2`,
          [`${normalized}__legacy_${legacyId}`, legacyId],
        );
      }

      await db.query(
        `INSERT INTO regions (id, country_code, name, normalized_name, iso_code)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           normalized_name = EXCLUDED.normalized_name,
           iso_code = EXCLUDED.iso_code`,
        [newId, code, entry.name, normalized, entry.isoCode],
      );

      if (legacyId && legacyId !== newId) {
        await db.query(`UPDATE recipes SET region_id = $1 WHERE region_id = $2`, [
          newId,
          legacyId,
        ]);
        await db.query(`UPDATE restaurants SET region_id = $1 WHERE region_id = $2`, [
          newId,
          legacyId,
        ]);
        await db.query(`DELETE FROM regions WHERE id = $1`, [legacyId]);
      }

      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  }
}
