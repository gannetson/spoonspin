import type { Pool } from "pg";
import {
  loadCountryCatalog,
  normalizeRegionName,
  regionIdFromIso,
} from "./catalog.ts";

/** Rewire legacy slug ids (e.g. cn:sichuan) to ISO ids (cn:CN-SC). */
export async function migrateRegionIdsToIso(db: Pool): Promise<void> {
  const catalog = loadCountryCatalog("cn");
  if (!catalog) return;

  for (const entry of catalog.subdivisions) {
    const countryCode = "cn";
    const newId = regionIdFromIso(countryCode, entry.isoCode);
    const normalized = normalizeRegionName(entry.name);

    const existing = await db.query<{ id: string }>(
      `SELECT id FROM regions
       WHERE country_code = $1 AND normalized_name = $2`,
      [countryCode, normalized],
    );
    const oldId = existing.rows[0]?.id;
    if (!oldId || oldId === newId) continue;

    await db.query(`UPDATE recipes SET region_id = $1 WHERE region_id = $2`, [newId, oldId]);
    await db.query(`UPDATE restaurants SET region_id = $1 WHERE region_id = $2`, [
      newId,
      oldId,
    ]);

    await db.query(
      `INSERT INTO regions (id, country_code, name, normalized_name, iso_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         normalized_name = EXCLUDED.normalized_name,
         iso_code = EXCLUDED.iso_code`,
      [newId, countryCode, entry.name, normalized, entry.isoCode],
    );

    await db.query(`DELETE FROM regions WHERE id = $1`, [oldId]);
  }
}
