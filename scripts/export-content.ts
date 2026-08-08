#!/usr/bin/env tsx
/**
 * Export content tables (countries, recipes, restaurants) to a JSON dump.
 *
 *   npm run db:export-content
 *   npm run db:export-content -- --out data/content-dump.json
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCountriesFromDb } from "../server/db/content.ts";
import {
  closeDb,
  getDb,
  listRestaurants,
} from "../server/db/restaurants.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseOut(argv: string[]): string {
  const idx = argv.indexOf("--out");
  if (idx >= 0 && argv[idx + 1]) {
    return path.resolve(rootDir, argv[idx + 1]!);
  }
  return path.join(rootDir, "data/content-dump.json");
}

async function main() {
  const outPath = parseOut(process.argv.slice(2));
  await getDb();
  const countries = await listCountriesFromDb();
  const restaurants = await listRestaurants();

  const dump = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    countries,
    restaurants,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(dump, null, 2)}\n`, "utf8");
  await closeDb();

  console.log(
    `Exported ${countries.length} countries · ${restaurants.length} restaurants → ${outPath}`,
  );
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
