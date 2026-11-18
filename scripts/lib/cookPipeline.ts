/**
 * One pass per country: everything the Cook and Dinner tabs need, in order, in one process.
 *
 *   1. dish research     Wikipedia dish names (feeds the menu)
 *   2. menu              35-recipe national menu + regional recipes, national dishes flagged
 *   3. recipe photos     every recipe of the country, plus source and video links
 *   4. dinner            composed from recipes that have photos, anchored on a national dish
 *   5. country image     cuisine background, from the national dish photo when there is one
 *
 * Each step is fail-soft: a failure is recorded and the next step still runs on whatever
 * exists, and the country is retried on the next run (after the ones that did not fail).
 */
import {
  getCountryFromDb,
  listCountriesFromDb,
  updateCountryImage,
} from "../../server/db/content.ts";
import { loadFillProgress, mergeFillProgress } from "../../server/db/fillProgress.ts";
import { needsDinner, composeDinnerForCountry } from "../../server/lib/dinners.ts";
import { TARGET_RECIPES } from "../../server/lib/cookTargets.ts";
import { isOpenAiConfigured } from "../../server/openai/adminDiscover.ts";
import { getCountryRecipes } from "../../src/content/countries/menuAccessors.ts";
import type { Country } from "../../src/types/content.ts";
import {
  DISHES_PATH,
  completeCountry,
  fullRecipeCount,
  isIncomplete,
  loadJson,
  type WikiCountryDishes,
} from "../complete-cook-menus.ts";
import { discoverForCountry, saveJson } from "../discover-wikipedia-dishes.ts";
import { enrichCountry } from "../enrich-cuisine-images.ts";
import { enrichPendingRecipes } from "../enrich-recipes.ts";
import { loadNationalDishes } from "./nationalDishes.ts";

export type StepStatus = "ok" | "skipped" | "failed";

export type CountryCookResult = {
  code: string;
  name: string;
  steps: {
    dishes: StepStatus;
    menu: StepStatus;
    photos: StepStatus;
    dinner: StepStatus;
    countryImage: StepStatus;
  };
  recipes: number;
  photosAdded: number;
  errors: string[];
};

export type CookRunOptions = {
  /** Countries to finish this run. */
  batch: number;
  code?: string;
  /** Rebuild the menu and dinner even when the country looks complete. */
  force?: boolean;
  /** After the batch, give this many photo-less recipes anywhere a photo attempt. */
  photoSweep?: number;
  log?: (line: string) => void;
};

/** Does this country still need any of the five steps? */
export async function countryNeedsCook(country: Country): Promise<boolean> {
  return (
    (await isIncomplete(country)) || needsDinner(country) || !country.imageUrl?.trim()
  );
}

async function step<T>(
  result: CountryCookResult,
  key: keyof CountryCookResult["steps"],
  log: (line: string) => void,
  run: () => Promise<T>,
): Promise<T | undefined> {
  try {
    const value = await run();
    result.steps[key] = "ok";
    return value;
  } catch (error) {
    result.steps[key] = "failed";
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`${key}: ${message}`);
    log(`  ${key} failed: ${message}`);
    return undefined;
  }
}

export async function finishCountryCook(
  code: string,
  context: {
    nationalDishes: Record<string, string[]>;
    force?: boolean;
    log?: (line: string) => void;
  },
): Promise<CountryCookResult> {
  const log = context.log ?? ((line: string) => console.log(line));
  const first = await getCountryFromDb(code);
  const result: CountryCookResult = {
    code,
    name: first?.name ?? code,
    steps: {
      dishes: "skipped",
      menu: "skipped",
      photos: "skipped",
      dinner: "skipped",
      countryImage: "skipped",
    },
    recipes: 0,
    photosAdded: 0,
    errors: [],
  };
  if (!first) {
    result.errors.push("country not found in the database");
    return result;
  }
  const openAi = isOpenAiConfigured();

  // 1. Dish research (Wikipedia, no LLM).
  const dishesByCountry = loadJson<Record<string, WikiCountryDishes>>(DISHES_PATH, {});
  if (!dishesByCountry[code]) {
    await step(result, "dishes", log, async () => {
      const found = await discoverForCountry({ code, name: first.name });
      dishesByCountry[code] = found;
      saveJson(DISHES_PATH, dishesByCountry);
    });
  } else {
    result.steps.dishes = "ok";
  }

  // 2. Menu: national menu, regional recipes, national dishes.
  if (!openAi) {
    log("  menu skipped: OPENAI_API_KEY not set");
  } else if (context.force || (await isIncomplete(first))) {
    await step(result, "menu", log, async () => {
      const done = await completeCountry(first, dishesByCountry, {
        fillAllRegions: Boolean(context.force),
        nationalDishes: context.nationalDishes,
      });
      log(
        `  menu: ${done.recipeCount} recipes · ${done.drinkCount} drinks` +
          (done.regionRecipes ? ` · +${done.regionRecipes} regional` : ""),
      );
    });
  } else {
    result.steps.menu = "ok";
  }

  // 3. Photos and links for every recipe of this country.
  await step(result, "photos", log, async () => {
    const done = await enrichPendingRecipes({
      countryCode: code,
      limit: 200,
      links: true,
      log: () => {},
    });
    result.photosAdded = done.photos;
    if (done.failed > 0) throw new Error(`${done.failed} recipe(s) failed`);
    log(`  photos: ${done.photos} new of ${done.tried} tried`);
  });

  // 4. Dinner, from the recipes as they are now (ids, photos).
  const afterMenu = (await getCountryFromDb(code)) ?? first;
  if (!openAi) {
    log("  dinner skipped: OPENAI_API_KEY not set");
  } else if (context.force || needsDinner(afterMenu)) {
    await step(result, "dinner", log, async () => {
      const dinner = await composeDinnerForCountry(afterMenu);
      log(`  dinner: ${dinner.courses} courses · ${dinner.drinks} drinks`);
    });
  } else {
    result.steps.dinner = "ok";
  }

  // 5. Country image (prefers the national dish photo, so it runs after the photos).
  const latest = (await getCountryFromDb(code)) ?? afterMenu;
  if (!latest.imageUrl?.trim() || context.force) {
    await step(result, "countryImage", log, async () => {
      const image = await enrichCountry(code, latest.name);
      if (image) {
        await updateCountryImage(code, image.imageUrl, image.imageAttribution ?? null);
        log(`  country image: ${image.source}`);
      } else {
        throw new Error("no country image found");
      }
    });
  } else {
    result.steps.countryImage = "ok";
  }

  result.recipes = getCountryRecipes((await getCountryFromDb(code)) ?? latest).length;
  return result;
}

/** Countries that need work, the ones that failed last time at the back. */
export async function pendingCookCountries(options: {
  code?: string;
  force?: boolean;
}): Promise<{ pending: Country[]; total: number }> {
  const countries = await listCountriesFromDb();
  const progress = await loadFillProgress();
  const failed = new Set(progress.cookFailedCodes);
  const pending: Country[] = [];
  for (const country of countries) {
    if (options.code && country.code !== options.code) continue;
    if (options.force || (await countryNeedsCook(country))) pending.push(country);
  }
  pending.sort((a, b) => Number(failed.has(a.code)) - Number(failed.has(b.code)));
  return { pending, total: countries.length };
}

export async function runCookPipeline(
  options: CookRunOptions,
): Promise<{ results: CountryCookResult[]; failed: string[] }> {
  const log = options.log ?? ((line: string) => console.log(line));
  const { pending } = await pendingCookCountries({ code: options.code, force: options.force });
  const batch = pending.slice(0, options.code ? pending.length : options.batch);
  log(
    `Cook batch: ${batch.length} countr${batch.length === 1 ? "y" : "ies"} · ${Math.max(0, pending.length - batch.length)} more pending (target ${TARGET_RECIPES} recipes each)`,
  );

  const nationalDishes = await loadNationalDishes();
  const results: CountryCookResult[] = [];
  const progress = await loadFillProgress();
  const failedCodes = new Set(progress.cookFailedCodes);
  const completedCodes = new Set(progress.cookCompletedCodes);

  for (const country of batch) {
    log(`\n${country.code} ${country.name}`);
    const result = await finishCountryCook(country.code, {
      nationalDishes,
      force: options.force,
      log,
    });
    results.push(result);
    const failedSteps = Object.entries(result.steps).filter(([, s]) => s === "failed");
    if (failedSteps.length > 0) {
      failedCodes.add(country.code);
      completedCodes.delete(country.code);
    } else {
      failedCodes.delete(country.code);
      completedCodes.add(country.code);
    }
    await mergeFillProgress({
      lastCookRunAt: new Date().toISOString(),
      lastRunAt: new Date().toISOString(),
      cookFailedCodes: [...failedCodes],
      cookCompletedCodes: [...completedCodes],
    }).catch((error) => console.warn("Could not save cook progress:", error));
  }

  // Photo backlog for countries that are otherwise complete.
  if ((options.photoSweep ?? 0) > 0) {
    log(`\nPhoto sweep: up to ${options.photoSweep} recipe(s) anywhere`);
    const sweep = await enrichPendingRecipes({
      limit: options.photoSweep!,
      links: true,
      log: () => {},
    });
    log(`  ${sweep.photos} new photo(s) of ${sweep.tried} tried`);
  }

  const failed = results.filter((r) => r.errors.length > 0).map((r) => r.code);
  return { results, failed };
}

export { fullRecipeCount };
