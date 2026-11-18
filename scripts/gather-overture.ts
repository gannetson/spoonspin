#!/usr/bin/env tsx
/**
 * Harvest restaurants from Overture Maps (a second source next to OSM) for the
 * Netherlands, Belgium and western Germany, one 0.5° map tile at a time.
 *
 * Overture has real cuisine categories, so it finds restaurants OSM has no cuisine tag
 * for. A place OSM already has is not added twice: it is matched by name and distance,
 * and the stored row only gains cuisines and empty contact fields. New places arrive
 * unreviewed; `npm run agent:gather` (which the fill lane runs next) promotes and
 * enriches them like any other harvested place, and its cuisine check removes the ones
 * whose website contradicts the category.
 *
 * Needs the optional dependency @duckdb/node-api. Free: no key, no per-call cost.
 *
 *   npm run agent:overture -- --status
 *   npm run agent:overture                      # next 6 tiles
 *   npm run agent:overture -- --batch 20
 *   npm run agent:overture -- --regions be      # nl, be, de-west
 *   npm run agent:overture -- --dry-run --batch 1 --regions de-west   # fetch and count, no DB
 *   npm run agent:overture -- --min-confidence 0.8
 *   npm run agent:overture -- --refresh-days 30 # tiles older than N days are searched again (default 60, 0 = off)
 *   npm run agent:overture -- --release 2026-11-18.0
 */
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCountriesFromDb } from "../server/db/content.ts";
import { loadFillProgress, mergeFillProgress } from "../server/db/fillProgress.ts";
import { closeDb, getDb, mergeExternalHarvest } from "../server/db/restaurants.ts";
import { CITY_ANCHORS_LIST, coverageRegions } from "../src/restaurants/coverage.ts";
import { OVERTURE_CUISINE_CATEGORIES } from "../src/restaurants/overtureCuisineMap.ts";
import {
  DEFAULT_MIN_CONFIDENCE,
  OvertureSource,
  overtureRowToRestaurant,
} from "./lib/overtureRestaurants.ts";
import { fallbackPlaceName } from "./lib/overpassRestaurants.ts";
import {
  DEFAULT_TILE_DEG,
  buildCoverageTiles,
  dueTileJobs,
  orderTiles,
  tagSignature,
  type TileJob,
} from "./lib/overpassTiles.ts";

/** Separate progress row from the OSM gather, so the two never overwrite each other. */
const PROGRESS_ID = "overture";

type CliOptions = {
  batch: number;
  regions: string[];
  release?: string;
  minConfidence: number;
  refreshDays: number;
  dryRun: boolean;
  statusOnly: boolean;
  reset: boolean;
  delayMs: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    batch: 6,
    regions: [],
    minConfidence: DEFAULT_MIN_CONFIDENCE,
    refreshDays: 60,
    dryRun: false,
    statusOnly: false,
    reset: false,
    delayMs: 500,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--batch" && next) {
      options.batch = Math.max(1, Number(next));
      i += 1;
    } else if (arg === "--regions" && next) {
      options.regions = next
        .split(",")
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean);
      coverageRegions(options.regions); // fail fast on a typo
      i += 1;
    } else if (arg === "--release" && next) {
      options.release = next;
      i += 1;
    } else if (arg === "--min-confidence" && next) {
      options.minConfidence = Number(next);
      if (!(options.minConfidence >= 0 && options.minConfidence <= 1)) {
        throw new Error("--min-confidence must be between 0 and 1");
      }
      i += 1;
    } else if (arg === "--refresh-days" && next) {
      options.refreshDays = Math.max(0, Number(next));
      i += 1;
    } else if (arg === "--delay-ms" && next) {
      options.delayMs = Math.max(0, Number(next));
      i += 1;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--status") {
      options.statusOnly = true;
    } else if (arg === "--reset") {
      options.reset = true;
    }
  }
  return options;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const HUBS_FOR_TILE_ORDER = CITY_ANCHORS_LIST.map((city) => ({
  id: city.name,
  name: city.name,
  lat: city.lat,
  lng: city.lng,
}));

function buildJobs(options: CliOptions): TileJob[] {
  const tiles = orderTiles(
    buildCoverageTiles(options.regions, DEFAULT_TILE_DEG),
    HUBS_FOR_TILE_ORDER,
  );
  return tiles.map((tile) => ({ id: `overture:${DEFAULT_TILE_DEG}:${tile.id}`, tile }));
}

/** Tile progress as `dueTileJobs` wants it, from the shared progress row. */
function tileProgress(tiles: Record<string, { at: string; sig: string }>) {
  const ids = Object.keys(tiles);
  return {
    completedJobIds: ids,
    completedAt: Object.fromEntries(ids.map((id) => [id, tiles[id]!.at])),
    tileSignatures: Object.fromEntries(ids.map((id) => [id, tiles[id]!.sig])),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  // Categories are the "cuisine tag set" here: adding one makes finished tiles due again.
  const signature = tagSignature([...OVERTURE_CUISINE_CATEGORIES].sort());
  const jobs = buildJobs(options);

  if (!options.dryRun) await getDb();
  let tiles: Record<string, { at: string; sig: string }> = {};
  if (!options.dryRun && !options.reset)
    tiles = (await loadFillProgress(PROGRESS_ID)).gatherTiles;
  if (options.reset && !options.dryRun) {
    await mergeFillProgress({ gatherTiles: {} }, PROGRESS_ID);
    console.log("Overture progress reset.");
  }

  const { fresh, stale } = dueTileJobs(
    jobs,
    tileProgress(tiles),
    options.refreshDays,
    signature,
  );

  if (options.statusOnly) {
    console.log("Overture harvest progress");
    console.log(
      `  grid: ${DEFAULT_TILE_DEG}° tiles · ${jobs.length} tiles (${coverageRegions(
        options.regions,
      )
        .map((r) => r.id)
        .join(", ")}) · ${OVERTURE_CUISINE_CATEGORIES.length} cuisine categories`,
    );
    console.log(
      `  searched: ${jobs.length - fresh.length}/${jobs.length} · never searched: ${fresh.length} · due for refresh: ${stale.length}` +
        (options.refreshDays > 0
          ? ` (older than ${options.refreshDays} days)`
          : " (refresh off)"),
    );
    for (const job of [...fresh, ...stale].slice(0, 6))
      console.log(`  next: ${job.tile.id}`);
    if (!options.dryRun) await closeDb();
    return;
  }

  const batch = [...fresh, ...stale].slice(0, options.batch);
  if (batch.length === 0) {
    console.log(
      "All tiles are up to date. Use --refresh-days or --reset to search again.",
    );
    if (!options.dryRun) await closeDb();
    return;
  }

  let source: OvertureSource;
  try {
    source = await OvertureSource.open(options.release);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    if (!options.dryRun) await closeDb();
    process.exit(2);
  }
  console.log(
    `Overture ${source.release}: ${batch.length} tile(s) · ${fresh.length} never searched, ${stale.length} due for refresh · min confidence ${options.minConfidence}` +
      (options.dryRun ? " · DRY RUN (nothing is written)" : ""),
  );

  // Only cuisines of published countries are worth storing (the same rule as the OSM harvest).
  let wanted: Set<string> | null = null;
  if (!options.dryRun) {
    const countries = await listCountriesFromDb();
    wanted = new Set(
      countries.filter((c) => c.status === "published").map((c) => c.code),
    );
  }

  let inserted = 0;
  let merged = 0;
  let failedTiles = 0;
  for (const job of batch) {
    process.stdout.write(`Tile ${job.tile.id} … `);
    try {
      const rows = await source.fetchTile(job.tile, {
        minConfidence: options.minConfidence,
      });
      const places = rows
        .map((row) => overtureRowToRestaurant(row, fallbackPlaceName))
        .filter((place): place is NonNullable<typeof place> => place != null)
        .map((place) => ({
          ...place,
          cuisineCodes: wanted
            ? place.cuisineCodes.filter((c) => wanted!.has(c))
            : place.cuisineCodes,
        }))
        .filter((place) => place.cuisineCodes.length > 0);

      if (options.dryRun) {
        const byCode = new Map<string, number>();
        for (const place of places) {
          for (const code of place.cuisineCodes)
            byCode.set(code, (byCode.get(code) ?? 0) + 1);
        }
        const top = [...byCode.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
        console.log(
          `${rows.length} rows → ${places.length} specialty places · ${top.map(([c, n]) => `${c}:${n}`).join(" ")}`,
        );
        for (const place of places.slice(0, 5)) {
          console.log(
            `    ${place.name} · ${place.city} · ${place.cuisineCodes.join(",")}`,
          );
        }
        const unmapped = await source.unmappedCategories(job.tile, {
          minConfidence: options.minConfidence,
        });
        if (unmapped.length > 0) {
          console.log(
            `    restaurant categories not mapped (broad or new): ${unmapped
              .slice(0, 10)
              .map((u) => `${u.category}:${u.n}`)
              .join(" ")}`,
          );
        }
      } else {
        const stored = await mergeExternalHarvest(places, job.tile);
        inserted += stored.inserted;
        merged += stored.merged;
        console.log(
          `${rows.length} rows → ${places.length} specialty places: ${stored.inserted} new, ${stored.merged} matched an existing venue and added to it, ${stored.unchanged} unchanged`,
        );
        tiles[job.id] = { at: new Date().toISOString(), sig: signature };
        await mergeFillProgress(
          { gatherTiles: tiles, lastRunAt: tiles[job.id]!.at },
          PROGRESS_ID,
        );
      }
    } catch (error) {
      failedTiles += 1;
      console.log("failed");
      console.error(error instanceof Error ? error.message : error);
    }
    await sleep(options.delayMs);
  }

  source.close();
  if (options.dryRun) {
    console.log("\nDry run: nothing was written.");
    return;
  }
  console.log(
    `\nDone: ${inserted} new restaurants, ${merged} existing ones enriched.` +
      (inserted > 0
        ? "\nRun `npm run agent:gather -- --promote-only` (or the fill lane) to promote and enrich the new ones."
        : ""),
  );
  await closeDb();
  if (failedTiles > 0) process.exitCode = 1;
}

const isDirectRun =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch(async (error) => {
    console.error(error);
    try {
      await closeDb();
    } catch {
      // ignore
    }
    process.exit(1);
  });
}
