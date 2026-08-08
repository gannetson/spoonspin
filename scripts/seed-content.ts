#!/usr/bin/env tsx
/**
 * Seed Postgres countries + recipes from the TypeScript content modules.
 *
 *   npm run db:seed-content
 */
import "dotenv/config";
import {
  getPublishedCountries,
  getSpecialtyShops,
} from "../src/content/countries/index.ts";
import { applyRecipeEnrichment } from "../src/content/recipes/enrichments.ts";
import {
  countContentRows,
  replaceCountryRecipes,
  upsertCountryRecord,
  type MenuSlot,
} from "../server/db/content.ts";
import { closeDb, ensureDb } from "../server/db/restaurants.ts";
import type { Recipe } from "../src/types/content.ts";

async function main() {
  await ensureDb();
  const countries = getPublishedCountries();
  let recipeCount = 0;

  for (const country of countries) {
    const withShops = {
      ...country,
      specialtyShops: getSpecialtyShops(country),
    };
    await upsertCountryRecord(withShops);

    if (!country.menu) continue;

    const entries: Array<{
      recipe: Recipe;
      menuSlot: MenuSlot;
      sortOrder: number;
    }> = [
      {
        recipe: applyRecipeEnrichment(country.code, country.menu.starter),
        menuSlot: "starter",
        sortOrder: 0,
      },
      {
        recipe: applyRecipeEnrichment(country.code, country.menu.main),
        menuSlot: "main",
        sortOrder: 0,
      },
      {
        recipe: applyRecipeEnrichment(country.code, country.menu.side),
        menuSlot: "side",
        sortOrder: 0,
      },
      {
        recipe: applyRecipeEnrichment(country.code, country.menu.dessert),
        menuSlot: "dessert",
        sortOrder: 0,
      },
      ...(country.menu.moreRecipes ?? []).map((recipe, index) => ({
        recipe: applyRecipeEnrichment(country.code, recipe),
        menuSlot: "more" as const,
        sortOrder: index,
      })),
    ];

    await replaceCountryRecipes(country.code, entries);
    recipeCount += entries.length;
  }

  const totals = await countContentRows();
  console.log(
    `Seeded ${countries.length} countries (${recipeCount} recipe rows this run)`,
  );
  console.log(
    `DB totals: ${totals.countries} countries · ${totals.recipes} recipes`,
  );
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
