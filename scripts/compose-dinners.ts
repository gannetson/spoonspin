#!/usr/bin/env tsx
/**
 * Compose Dinner-tab suggestions (3–5 courses + drinks) for countries.
 *
 *   npm run agent:compose-dinners
 *   npm run agent:compose-dinners -- --code nl
 *   npm run agent:compose-dinners -- --batch 5
 *   npm run agent:compose-dinners -- --force
 *   npm run agent:compose-dinners -- --status
 */
import "dotenv/config";
import { listCountriesFromDb, saveDinnerSuggestion } from "../server/db/content.ts";
import { closeDb, getDb } from "../server/db/restaurants.ts";
import { composeDinnerSuggestion } from "../server/openai/adminDiscover.ts";
import {
  getCountryDrinks,
  getCountryRecipes,
} from "../src/content/countries/menuAccessors.ts";

function parseArgs(argv: string[]) {
  const status = argv.includes("--status");
  const force = argv.includes("--force");
  const codeIdx = argv.indexOf("--code");
  const code = codeIdx >= 0 ? argv[codeIdx + 1]?.toLowerCase() : undefined;
  const batchIdx = argv.indexOf("--batch");
  const batch = batchIdx >= 0 ? Math.max(1, Number(argv[batchIdx + 1] || 5)) : 5;
  return { status, force, code, batch };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await getDb();
  const countries = await listCountriesFromDb();

  const eligible = countries.filter((country) => {
    if (args.code && country.code !== args.code) return false;
    const recipes = getCountryRecipes(country);
    const drinks = getCountryDrinks(country);
    if (recipes.length < 3 || drinks.length < 1) return false;
    if (!args.force && country.dinner && country.dinner.courses.length >= 3) {
      return false;
    }
    return true;
  });

  if (args.status) {
    const withDinner = countries.filter(
      (country) => (country.dinner?.courses.length ?? 0) >= 3,
    ).length;
    console.log(
      `Dinner suggestions: ${withDinner} saved · ${eligible.length} pending · ${countries.length} countries`,
    );
    console.log("Next:");
    for (const country of eligible.slice(0, 12)) {
      console.log(
        `  - ${country.code} ${country.name} (${getCountryRecipes(country).length} recipes)`,
      );
    }
    await closeDb();
    return;
  }

  const batch = eligible.slice(0, args.code ? eligible.length : args.batch);
  console.log(
    `Compose dinner batch: ${batch.length} · ${Math.max(0, eligible.length - batch.length)} remaining after`,
  );

  let composed = 0;
  for (const country of batch) {
    process.stdout.write(`${country.code} ${country.name}… `);
    try {
      const recipes = getCountryRecipes(country);
      const drinks = getCountryDrinks(country);
      const result = await composeDinnerSuggestion({
        countryCode: country.code,
        countryName: country.name,
        introduction: country.introduction,
        recipes: recipes.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          localName: recipe.localName,
          description: recipe.description,
          category: recipe.category,
        })),
        drinks: drinks.map((drink) => ({
          name: drink.name,
          localName: drink.localName,
          type: drink.type,
          alcoholic: drink.alcoholic,
          description: drink.description,
        })),
      });
      await saveDinnerSuggestion(country.code, result.dinner);
      composed += 1;
      console.log(
        `✓ ${result.dinner.courses.length} courses · ${result.dinner.drinks.length} drinks`,
      );
    } catch (error) {
      console.log("failed");
      console.warn(error);
    }
    await sleep(400);
  }

  await closeDb();
  console.log(`\nComposed ${composed} dinner suggestion(s).`);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
