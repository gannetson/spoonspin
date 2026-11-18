#!/usr/bin/env tsx
/**
 * Finish countries for the Cook and Dinner tabs in one run: dish research, a 35-recipe
 * menu with national dishes flagged, a photo and links for every recipe, a dinner that
 * only points at recipes that exist, and the country image. See scripts/lib/cookPipeline.ts.
 *
 *   npm run agent:cook                   # next 3 countries that need anything
 *   npm run agent:cook -- --batch 10
 *   npm run agent:cook -- --code gb      # one country (all regions too)
 *   npm run agent:cook -- --code gb --force   # rebuild even if it looks complete
 *   npm run agent:cook -- --sweep 100    # then 100 photo-less recipes anywhere
 *   npm run agent:cook -- --status
 *
 * Needs DATABASE_URL, and OPENAI_API_KEY for the menu and dinner steps.
 */
import "dotenv/config";
import { closeDb, getDb } from "../server/db/restaurants.ts";
import { TARGET_RECIPES } from "../server/lib/cookTargets.ts";
import { needsDinner } from "../server/lib/dinners.ts";
import { getCountryRecipes } from "../src/content/countries/menuAccessors.ts";
import { fullRecipeCount, isIncomplete } from "./complete-cook-menus.ts";
import { pendingCookCountries, runCookPipeline } from "./lib/cookPipeline.ts";
import { listCountriesFromDb } from "../server/db/content.ts";

function parseArgs(argv: string[]) {
  const args = {
    batch: 3,
    code: undefined as string | undefined,
    force: false,
    status: false,
    sweep: 40,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--batch") args.batch = Math.max(1, Number(argv[++i] ?? 3));
    else if (arg === "--code") args.code = argv[++i]?.toLowerCase();
    else if (arg === "--force") args.force = true;
    else if (arg === "--status") args.status = true;
    else if (arg === "--sweep") args.sweep = Math.max(0, Number(argv[++i] ?? 40));
  }
  return args;
}

async function printStatus(code?: string) {
  const countries = (await listCountriesFromDb()).filter((c) => !code || c.code === code);
  const { pending } = await pendingCookCountries({ code });
  let underTarget = 0;
  let dinnerGaps = 0;
  let noImage = 0;
  let withoutPhotos = 0;
  let recipes = 0;
  for (const country of countries) {
    const list = getCountryRecipes(country);
    recipes += list.length;
    withoutPhotos += list.filter((r) => !r.imageUrl).length;
    if (!country.cookReady || fullRecipeCount(country) < TARGET_RECIPES) underTarget += 1;
    if (needsDinner(country)) dinnerGaps += 1;
    if (!country.imageUrl) noImage += 1;
  }
  console.log(
    `Cook: ${countries.length} countries · ${pending.length} need work · ${underTarget} under ${TARGET_RECIPES} recipes · ${dinnerGaps} without a usable dinner · ${noImage} without a country image`,
  );
  console.log(`Recipes: ${recipes} · ${withoutPhotos} without a photo`);
  console.log("Next:");
  for (const country of pending.slice(0, 12)) {
    console.log(
      `  - ${country.code} ${country.name} (${fullRecipeCount(country)}/${TARGET_RECIPES} recipes${(await isIncomplete(country)) ? "" : " · menu ok"}${needsDinner(country) ? " · dinner" : ""}${country.imageUrl ? "" : " · image"})`,
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await getDb();
  if (args.status) {
    await printStatus(args.code);
    await closeDb();
    return;
  }
  const { results, failed } = await runCookPipeline({
    batch: args.batch,
    code: args.code,
    force: args.force,
    photoSweep: args.sweep,
  });
  await closeDb();

  const recipes = results.reduce((sum, r) => sum + r.recipes, 0);
  const photos = results.reduce((sum, r) => sum + r.photosAdded, 0);
  console.log(
    `\nFinished ${results.length - failed.length}/${results.length} countries cleanly · ${recipes} recipes now · ${photos} new photos`,
  );
  if (failed.length > 0) {
    console.log(`Needs another look (retried next run, after the others): ${failed.join(", ")}`);
    for (const result of results.filter((r) => r.errors.length > 0)) {
      for (const error of result.errors) console.log(`  ${result.code} ${error}`);
    }
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
