/**
 * Backfill `restaurants.region_id` from each venue's own text.
 *
 * The column has been filtered on by `searchLocalRestaurants` since the regions
 * feature landed, but nothing ever wrote it — so choosing a region (Sichuan,
 * Punjabi, Sicilian) returned zero restaurants no matter what was stored. New
 * discoveries now tag themselves; this pass catches everything already saved.
 *
 *   npx tsx --tsconfig tsconfig.app.json scripts/backfill-restaurant-regions.ts [--write]
 *
 * Runs as a dry run unless `--write` is passed.
 */

import "dotenv/config";
import { closeDb, ensureDb } from "../server/db/restaurants.ts";
import { listRegionsForCountry } from "../server/db/regions.ts";
import {
  buildRegionTermIndex,
  detectRegion,
  type RegionTermIndex,
} from "../server/lib/regionCuisine.ts";

const write = process.argv.includes("--write");

async function main() {
  const db = await ensureDb();
  const { rows } = await db.query(
    `SELECT id, name, cuisine_codes, cuisine_tags, authenticity_notes, menu_json, region_id
       FROM restaurants
      ORDER BY id`,
  );
  console.log(`${rows.length} restaurant(s) to inspect${write ? "" : " (dry run)"}.`);

  const indexCache = new Map<string, RegionTermIndex | null>();
  const perCountry = new Map<string, number>();
  let tagged = 0;
  let alreadyTagged = 0;

  for (const row of rows) {
    if (row.region_id) {
      alreadyTagged += 1;
      continue;
    }

    const codes: string[] = Array.isArray(row.cuisine_codes) ? row.cuisine_codes : [];
    // Only the venue's own words — its name, its notes, and its menu.
    const menu = row.menu_json ? JSON.stringify(row.menu_json) : "";
    const haystack = [row.name, row.authenticity_notes, menu]
      .filter(Boolean)
      .join(" \n ");

    for (const code of codes) {
      if (!indexCache.has(code)) {
        const regions = await listRegionsForCountry(code);
        indexCache.set(
          code,
          regions.length > 0 ? buildRegionTermIndex(code, regions) : null,
        );
      }
      const index = indexCache.get(code);
      if (!index) continue;

      const hit = detectRegion({ text: haystack, index });
      if (!hit) continue;

      console.log(`  ${row.name} -> ${hit.regionId} (“${hit.matchedTerm}”)`);
      if (write) {
        await db.query(`UPDATE restaurants SET region_id = $1 WHERE id = $2`, [
          hit.regionId,
          row.id,
        ]);
      }
      tagged += 1;
      perCountry.set(code, (perCountry.get(code) ?? 0) + 1);
      break;
    }
  }

  console.log(
    `\n${tagged} tagged, ${alreadyTagged} already had a region, ` +
      `${rows.length - tagged - alreadyTagged} left untagged.`,
  );
  for (const [code, count] of [...perCountry].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code}: ${count}`);
  }
  if (!write) console.log("\nDry run — pass --write to apply.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
