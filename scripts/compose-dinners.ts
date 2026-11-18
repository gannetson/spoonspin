#!/usr/bin/env tsx
/**
 * Compose Dinner-tab suggestions (3–5 courses + drinks) for countries.
 *
 * A dinner counts only when at least 3 of its courses still point at a recipe that
 * exists. Recipes get rewritten (ids change) by complete-menus, so older dinners can
 * silently point at nothing; those are pending too, and `--repair` fixes just them.
 *
 *   npm run agent:compose-dinners
 *   npm run agent:compose-dinners -- --code nl
 *   npm run agent:compose-dinners -- --batch 5
 *   npm run agent:compose-dinners -- --repair      # only dinners whose courses no longer resolve
 *   npm run agent:compose-dinners -- --force
 *   npm run agent:compose-dinners -- --status
 */
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCountriesFromDb } from "../server/db/content.ts";
import { closeDb, getDb } from "../server/db/restaurants.ts";
import {
  MIN_DINNER_COURSES,
  composeDinnerForCountry,
  needsDinner,
  resolvableDinnerCourses,
} from "../server/lib/dinners.ts";
import { getCountryRecipes } from "../src/content/countries/menuAccessors.ts";

function parseArgs(argv: string[]) {
  const status = argv.includes("--status");
  const force = argv.includes("--force");
  const repair = argv.includes("--repair");
  const codeIdx = argv.indexOf("--code");
  const code = codeIdx >= 0 ? argv[codeIdx + 1]?.toLowerCase() : undefined;
  const batchIdx = argv.indexOf("--batch");
  const batch = batchIdx >= 0 ? Math.max(1, Number(argv[batchIdx + 1] || 5)) : 5;
  return { status, force, repair, code, batch };
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
    if (args.force) return getCountryRecipes(country).length >= MIN_DINNER_COURSES;
    if (args.repair) {
      // Only dinners that exist but no longer resolve.
      return (country.dinner?.courses.length ?? 0) > 0 && needsDinner(country);
    }
    return needsDinner(country);
  });

  if (args.status) {
    const usable = countries.filter(
      (country) => resolvableDinnerCourses(country) >= MIN_DINNER_COURSES,
    ).length;
    const dangling = countries.filter(
      (country) => (country.dinner?.courses.length ?? 0) > 0 && needsDinner(country),
    ).length;
    console.log(
      `Dinner suggestions: ${usable} usable · ${dangling} with courses that no longer resolve · ${eligible.length} pending · ${countries.length} countries`,
    );
    console.log("Next:");
    for (const country of eligible.slice(0, 12)) {
      console.log(
        `  - ${country.code} ${country.name} (${getCountryRecipes(country).length} recipes, ${resolvableDinnerCourses(country)} resolvable courses)`,
      );
    }
    await closeDb();
    return;
  }

  const batch = eligible.slice(0, args.code || args.repair ? eligible.length : args.batch);
  console.log(
    `Compose dinner batch: ${batch.length} · ${Math.max(0, eligible.length - batch.length)} remaining after`,
  );

  let composed = 0;
  let failed = 0;
  for (const country of batch) {
    process.stdout.write(`${country.code} ${country.name}… `);
    try {
      const result = await composeDinnerForCountry(country);
      composed += 1;
      console.log(`✓ ${result.courses} courses · ${result.drinks} drinks`);
    } catch (error) {
      failed += 1;
      console.log("failed");
      console.warn(error);
    }
    await sleep(400);
  }

  await closeDb();
  console.log(`\nComposed ${composed} dinner suggestion(s)${failed ? ` · ${failed} failed` : ""}.`);
  if (failed > 0) process.exitCode = 1;
}

const isDirectRun =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch(async (error) => {
    console.error(error);
    await closeDb();
    process.exit(1);
  });
}
