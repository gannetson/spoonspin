#!/usr/bin/env tsx
/**
 * Give cook-ready recipes in Postgres a photo and reference links:
 * - Dish photo: Wikipedia → Commons → Wikidata → Openverse (→ TheMealDB with a key)
 * - Source link: Wikibooks Cookbook, Wikipedia, or a Google recipe search
 * - Video link: YouTube search
 *
 * Driven by the database, not a progress file: whatever still has no photo (and was not
 * tried in the last 14 days) is pending, so a run can be repeated safely. Photos that
 * exist, admin uploads included, are never replaced; a lookup that finds nothing writes
 * nothing.
 *
 * Usage:
 *   npm run agent:recipes
 *   npm run agent:recipes -- --batch 80
 *   npm run agent:recipes -- --code nl
 *   npm run agent:recipes -- --all
 *   npm run agent:recipes -- --fix-bad     # also replace image URLs that are not photo files
 *   npm run agent:recipes -- --links       # also fill missing source/video links
 *   npm run agent:recipes -- --status
 */
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listRecipesNeedingMedia } from "../server/db/content.ts";
import { closeDb, getDb } from "../server/db/restaurants.ts";
import { enrichRecipeMedia } from "../server/lib/recipeMedia.ts";

function parseArgs(argv: string[]) {
  const args = {
    batch: 40,
    all: false,
    status: false,
    fixBad: false,
    links: false,
    code: undefined as string | undefined,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--batch") args.batch = Math.max(1, Number(argv[++i] ?? 40));
    else if (arg === "--all") args.all = true;
    else if (arg === "--status") args.status = true;
    else if (arg === "--fix-bad" || arg === "--force-bad") args.fixBad = true;
    else if (arg === "--links" || arg === "--force-links") args.links = true;
    else if (arg === "--code") args.code = argv[++i]?.toLowerCase();
  }
  return args;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Enrich up to `limit` recipes still missing media. Returns how many got a photo. */
export async function enrichPendingRecipes(options: {
  countryCode?: string;
  limit: number;
  fixBad?: boolean;
  links?: boolean;
  log?: (line: string) => void;
}): Promise<{ tried: number; photos: number; failed: number }> {
  const log = options.log ?? ((line: string) => console.log(line));
  const pending = await listRecipesNeedingMedia({
    countryCode: options.countryCode,
    limit: options.limit,
    fixBad: options.fixBad,
    includeMissingLinks: options.links,
  });
  let photos = 0;
  let failed = 0;
  for (const item of pending) {
    try {
      const result = await enrichRecipeMedia({
        countryCode: item.countryCode,
        countryName: item.countryName,
        recipe: item.recipe,
        fixBad: options.fixBad,
      });
      if (result.image) photos += 1;
      log(
        `  ${item.countryCode}:${item.recipe.id} ${result.image ? `photo (${result.image.source})` : "no photo"}` +
          `${result.sourceAdded ? " +source" : ""}${result.videoAdded ? " +video" : ""}`,
      );
    } catch (error) {
      failed += 1;
      log(`  ${item.countryCode}:${item.recipe.id} failed: ${error instanceof Error ? error.message : error}`);
    }
    await sleep(200);
  }
  return { tried: pending.length, photos, failed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = await getDb();

  if (args.status) {
    const total = await db.query<{ n: number; without: number; tried: number }>(
      `SELECT COUNT(*)::int AS n,
              COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '')::int AS without,
              COUNT(*) FILTER (WHERE (image_url IS NULL OR image_url = '')
                                 AND image_attempted_at > NOW() - INTERVAL '14 days')::int AS tried
         FROM recipes
        WHERE ($1::text IS NULL OR country_code = $1)`,
      [args.code ?? null],
    );
    const row = total.rows[0]!;
    console.log(
      `Recipe photos: ${row.n - row.without}/${row.n} have a photo · ${row.without} without (${row.tried} tried in the last 14 days, waiting out their cooldown)`,
    );
    await closeDb();
    return;
  }

  const limit = args.all ? 100_000 : args.batch;
  console.log(`Recipe media: up to ${args.all ? "all" : limit} recipe(s)`);
  const result = await enrichPendingRecipes({
    countryCode: args.code,
    limit,
    fixBad: args.fixBad,
    links: args.links,
  });
  console.log(
    `\nTried ${result.tried} · ${result.photos} new photo(s) · ${result.tried - result.photos - result.failed} without a photo · ${result.failed} failed`,
  );
  await closeDb();
  if (result.failed > 0) process.exitCode = 1;
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
