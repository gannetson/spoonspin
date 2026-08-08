#!/usr/bin/env tsx
/**
 * Import a content dump into Postgres (countries + recipes + restaurants).
 *
 * Overwrites country rows and replaces recipes per country. Upserts restaurants.
 * Does not touch users/sessions/submissions.
 *
 *   npm run db:import-content
 *   npm run db:import-content -- --in data/content-dump.json
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  countContentRows,
  replaceCountryRecipes,
  upsertCountryRecord,
  type MenuSlot,
} from "../server/db/content.ts";
import {
  closeDb,
  getDb,
  upsertRestaurant,
} from "../server/db/restaurants.ts";
import type { Country, Recipe } from "../src/types/content.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseIn(argv: string[]): string {
  const idx = argv.indexOf("--in");
  if (idx >= 0 && argv[idx + 1]) {
    return path.resolve(rootDir, argv[idx + 1]!);
  }
  return path.join(rootDir, "data/content-dump.json");
}

const dumpSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  countries: z.array(z.unknown()),
  restaurants: z.array(z.unknown()),
});

function recipeEntries(country: Country): Array<{
  recipe: Recipe;
  menuSlot: MenuSlot;
  sortOrder: number;
}> {
  if (country.menu) {
    return [
      { recipe: country.menu.starter, menuSlot: "starter", sortOrder: 0 },
      { recipe: country.menu.main, menuSlot: "main", sortOrder: 0 },
      { recipe: country.menu.side, menuSlot: "side", sortOrder: 0 },
      { recipe: country.menu.dessert, menuSlot: "dessert", sortOrder: 0 },
      ...(country.menu.moreRecipes ?? []).map((recipe, index) => ({
        recipe,
        menuSlot: "more" as const,
        sortOrder: index,
      })),
    ];
  }

  return (country.standaloneRecipes ?? []).map((recipe, index) => ({
    recipe,
    menuSlot: "more" as const,
    sortOrder: index,
  }));
}

async function main() {
  const inPath = parseIn(process.argv.slice(2));
  if (!fs.existsSync(inPath)) {
    console.error(`Dump not found: ${inPath}`);
    console.error("Create one with: npm run db:export-content");
    process.exit(1);
  }

  const raw = dumpSchema.parse(JSON.parse(fs.readFileSync(inPath, "utf8")));
  await getDb();

  let recipeCount = 0;
  for (const item of raw.countries) {
    const country = item as Country;
    await upsertCountryRecord(country);
    const entries = recipeEntries(country);
    if (entries.length > 0) {
      await replaceCountryRecipes(country.code, entries);
      recipeCount += entries.length;
    }
  }

  let restaurantCount = 0;
  for (const item of raw.restaurants) {
    const row = item as Parameters<typeof upsertRestaurant>[0];
    await upsertRestaurant(row);
    restaurantCount += 1;
  }

  const totals = await countContentRows();
  await closeDb();

  console.log(
    `Imported ${raw.countries.length} countries (${recipeCount} recipe rows) · ${restaurantCount} restaurants from ${inPath}`,
  );
  console.log(
    `DB totals: ${totals.countries} countries · ${totals.recipes} recipes`,
  );
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
