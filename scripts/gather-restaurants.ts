#!/usr/bin/env tsx
/**
 * Incremental restaurant gather agent.
 *
 * Each run processes a small batch of (hub × cuisine) harvest jobs, then
 * promotes strong OSM specialty matches into the reviewed quality set.
 * Progress is saved under data/gather-progress.json so you can keep running
 * over days/weeks without repeating finished jobs.
 *
 * Two ways to search (--mode):
 *   tiles (default)  NL, Belgium and western Germany (--regions nl,be,de-west) are cut
 *                    into lat/lng tiles; one Overpass request per
 *                    tile asks for every specialty cuisine at once. Whole regions,
 *                    about 1/80 of the requests, tiles nearest big cities first. A
 *                    tile that times out is split in four. Finished tiles are searched
 *                    again after --refresh-days, so new and closed places show up.
 *                    Reviewed or enriched rows are never overwritten by a harvest.
 *   hubs             The older search: a circle around each hub, one request per
 *                    (hub x country). Kept for --hubs / --radius-km runs.
 *
 * Examples:
 *   npm run agent:gather                       # next batch of tiles, then promote and enrich
 *   npm run agent:gather -- --regions be       # only Belgium
 *   npm run agent:gather -- --batch 20         # more tiles in one run
 *   npm run agent:gather -- --status
 *   npm run agent:gather -- --dry-run --batch 1 --countries cn,th   # fetch only, no DB
 *   npm run agent:gather -- --refresh-days 14  # re-search tiles older than 14 days
 *   npm run agent:gather -- --promote-only
 *   npm run agent:gather -- --mode hubs --hubs nl-major --radius-km 25
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeDb,
  countByCuisineCode,
  getDb,
  listRestaurants,
  mergeOsmHarvest,
  upsertRestaurant,
  type StoredRestaurant,
} from "../server/db/restaurants.ts";
import { listCountriesFromDb } from "../server/db/content.ts";
import { loadFillProgress, mergeFillProgress } from "../server/db/fillProgress.ts";
import {
  scheduleRestaurantEnrichments,
  waitForRestaurantEnrichmentIdle,
} from "../server/lib/restaurantEnrichmentQueue.ts";
import {
  hasPrimaryCuisineMatch,
  osmTagsForCountry,
} from "../src/restaurants/osmCuisineMap.ts";
import { isOpenAiConfigured } from "../server/openai/adminDiscover.ts";
import { OSM_CUISINE_BY_COUNTRY } from "../src/restaurants/osmCuisineMap.ts";
import { HUBS, harvestCountryAtHub, sleep, type Hub } from "./lib/overpassRestaurants.ts";
import { CITY_ANCHORS_LIST, coverageRegions } from "../src/restaurants/coverage.ts";
import {
  DEFAULT_TILE_DEG,
  buildCoverageTiles,
  harvestTile,
  dueTileJobs,
  orderTiles,
  tagSignature,
  unionCuisineTags,
  type TileJob,
} from "./lib/overpassTiles.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROGRESS_PATH = path.join(rootDir, "data", "gather-progress.json");
const GATHERED_LOG_PATH = path.join(rootDir, "data", "gathered-promotions.jsonl");

type GatherJob = {
  id: string;
  hubId: string;
  countryCode: string;
};

type GatherMode = "tiles" | "hubs";

type GatherProgress = {
  version: 1;
  hubsPreset: string;
  radiusKm: number;
  completedJobIds: string[];
  /** When each job last finished (ISO). Jobs without an entry are never due for a refresh. */
  completedAt?: Record<string, string>;
  /** Cuisine-tag signature each tile was searched with. A different set means the tile is due again. */
  tileSignatures?: Record<string, string>;
  lastRunAt: string | null;
  totals: {
    harvested: number;
    promoted: number;
    runs: number;
  };
};

type CliOptions = {
  mode: GatherMode;
  tileDeg: number;
  /** Coverage regions to tile (nl, be, de-west). */
  regions: string[];
  /** Max restaurants promoted (and enriched) per run. */
  promoteLimit: number;
  /** Max earlier-promoted restaurants whose enrichment never finished, picked up per run. */
  finishLimit: number;
  /** Tiles finished longer ago than this are searched again; 0 = never. */
  refreshDays: number;
  /** Fetch and count only: no database, no progress file, no promotion. */
  dryRun: boolean;
  batchGiven: boolean;
  hubsPreset: string;
  hubs: Hub[];
  radiusKm: number;
  delayMs: number;
  batch: number;
  statusOnly: boolean;
  promoteOnly: boolean;
  reset: boolean;
  countries: string[] | null;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    mode: "tiles",
    tileDeg: DEFAULT_TILE_DEG,
    regions: [],
    promoteLimit: 400,
    finishLimit: 200,
    refreshDays: 30,
    dryRun: false,
    batchGiven: false,
    hubsPreset: "randstad",
    hubs: HUBS.randstad!,
    radiusKm: 25,
    delayMs: 4000,
    batch: 4,
    statusOnly: false,
    promoteOnly: false,
    reset: false,
    countries: null,
  };

  let modeGiven = false;
  let legacyFlag = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--hubs" && next) {
      legacyFlag = true;
      const preset = HUBS[next.toLowerCase()];
      if (!preset) {
        throw new Error(
          `Unknown hubs preset "${next}". Use: ${Object.keys(HUBS).join(", ")}`,
        );
      }
      options.hubsPreset = next.toLowerCase();
      options.hubs = preset;
      i += 1;
    } else if (arg === "--radius-km" && next) {
      legacyFlag = true;
      options.radiusKm = Number(next);
      i += 1;
    } else if (arg === "--delay-ms" && next) {
      options.delayMs = Number(next);
      i += 1;
    } else if (arg === "--batch" && next) {
      options.batch = Math.max(1, Number(next));
      options.batchGiven = true;
      i += 1;
    } else if (arg === "--mode" && next) {
      if (next !== "tiles" && next !== "hubs") {
        throw new Error(`--mode must be "tiles" or "hubs", got "${next}"`);
      }
      options.mode = next;
      modeGiven = true;
      i += 1;
    } else if (arg === "--tile-deg" && next) {
      options.tileDeg = Number(next);
      if (!(options.tileDeg >= 0.1 && options.tileDeg <= 2)) {
        throw new Error("--tile-deg must be between 0.1 and 2");
      }
      i += 1;
    } else if (arg === "--regions" && next) {
      options.regions = next
        .split(",")
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean);
      coverageRegions(options.regions); // fail fast on a typo
      i += 1;
    } else if (arg === "--finish-limit" && next) {
      options.finishLimit = Math.max(0, Number(next));
      i += 1;
    } else if (arg === "--promote-limit" && next) {
      options.promoteLimit = Math.max(0, Number(next));
      i += 1;
    } else if (arg === "--refresh-days" && next) {
      options.refreshDays = Math.max(0, Number(next));
      i += 1;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--countries" && next) {
      options.countries = next.split(",").map((c) => c.trim().toLowerCase());
      i += 1;
    } else if (arg === "--status") {
      options.statusOnly = true;
    } else if (arg === "--promote-only") {
      options.promoteOnly = true;
    } else if (arg === "--reset") {
      options.reset = true;
    }
  }
  // --hubs and --radius-km only mean something for the circle search: keep old command lines working.
  if (!modeGiven && legacyFlag) options.mode = "hubs";
  // A tile is one request, so a run can do more of them than hub x country jobs.
  if (options.mode === "tiles" && !options.batchGiven) options.batch = 8;
  return options;
}

function defaultProgress(options: CliOptions): GatherProgress {
  return {
    version: 1,
    hubsPreset: options.hubsPreset,
    radiusKm: options.radiusKm,
    completedJobIds: [],
    lastRunAt: null,
    totals: { harvested: 0, promoted: 0, runs: 0 },
  };
}

function loadProgress(options: CliOptions): GatherProgress {
  if (!fs.existsSync(PROGRESS_PATH)) return defaultProgress(options);
  try {
    const parsed = JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8")) as GatherProgress;
    if (parsed.version !== 1) return defaultProgress(options);
    return parsed;
  } catch {
    return defaultProgress(options);
  }
}

function saveProgress(progress: GatherProgress) {
  fs.mkdirSync(path.dirname(PROGRESS_PATH), { recursive: true });
  fs.writeFileSync(PROGRESS_PATH, `${JSON.stringify(progress, null, 2)}\n`);
}

async function syncFillProgress(progress: GatherProgress) {
  try {
    const gatherTiles: Record<string, { at: string; sig: string }> = {};
    for (const id of progress.completedJobIds) {
      const at = progress.completedAt?.[id];
      const sig = progress.tileSignatures?.[id];
      if (id.startsWith("tiles:") && at && sig) gatherTiles[id] = { at, sig };
    }
    await mergeFillProgress({
      lastRestaurantsRunAt: progress.lastRunAt,
      lastRunAt: progress.lastRunAt,
      gatherCompletedJobIds: progress.completedJobIds,
      gatherTiles,
      totals: {
        restaurantsHarvested: progress.totals.harvested,
        restaurantsPromoted: progress.totals.promoted,
      },
    });
  } catch (error) {
    console.warn("Could not sync gather progress to content_fill_progress:", error);
  }
}

/**
 * Local file plus the shared Postgres copy. The database is what cron on a content
 * machine and the API both see, so it must win when the local file is missing or older:
 * a tile counts as done if either side says so, with the newer timestamp.
 */
async function loadProgressMerged(options: CliOptions): Promise<GatherProgress> {
  const local = loadProgress(options);
  if (options.dryRun) return local;
  try {
    const remote = await loadFillProgress();
    const completed = new Set([...local.completedJobIds, ...remote.gatherCompletedJobIds]);
    const completedAt = { ...(local.completedAt ?? {}) };
    const tileSignatures = { ...(local.tileSignatures ?? {}) };
    for (const [id, entry] of Object.entries(remote.gatherTiles)) {
      const known = completedAt[id];
      if (!known || Date.parse(entry.at) > Date.parse(known)) {
        completedAt[id] = entry.at;
        tileSignatures[id] = entry.sig;
      }
      completed.add(id);
    }
    return {
      ...local,
      completedJobIds: [...completed],
      completedAt,
      tileSignatures,
      totals: {
        harvested: Math.max(local.totals.harvested, remote.totals.restaurantsHarvested),
        promoted: Math.max(local.totals.promoted, remote.totals.restaurantsPromoted),
        runs: local.totals.runs,
      },
    };
  } catch (error) {
    console.warn("Could not read gather progress from Postgres; using the local file:", error);
    return local;
  }
}

async function resolveCountryCodes(options: CliOptions): Promise<string[]> {
  if (options.countries && options.countries.length > 0) {
    return options.countries;
  }
  // A dry run touches no database: search every country the cuisine map knows.
  if (options.dryRun) return Object.keys(OSM_CUISINE_BY_COUNTRY);
  const countries = await listCountriesFromDb();
  return countries
    .filter((country) => country.status === "published")
    .map((country) => country.code);
}

const HUBS_FOR_TILE_ORDER: Hub[] = CITY_ANCHORS_LIST.map((city) => ({
  id: city.name,
  name: city.name,
  lat: city.lat,
  lng: city.lng,
}));

/**
 * The tile queue. Ids depend only on the grid, so publishing a country does not
 * throw away progress; instead each finished tile records the cuisine-tag set it was
 * searched with, and a tile whose set has since grown is due again (see dueTileJobs).
 */
function buildTileJobs(options: CliOptions): TileJob[] {
  const tiles = orderTiles(
    buildCoverageTiles(options.regions, options.tileDeg),
    HUBS_FOR_TILE_ORDER,
  );
  return tiles.map((tile) => ({ id: `tiles:${options.tileDeg}:${tile.id}`, tile }));
}

function currentTagSignature(countryCodes: string[]): string {
  return tagSignature(unionCuisineTags(countryCodes));
}

async function buildJobs(options: CliOptions): Promise<GatherJob[]> {
  const countryCodes = await resolveCountryCodes(options);
  const reviewed = await countByCuisineCode();
  const rankedCountries = [...countryCodes].sort((a, b) => {
    const gap = (reviewed[a] ?? 0) - (reviewed[b] ?? 0);
    if (gap !== 0) return gap;
    return a.localeCompare(b);
  });

  const jobs: GatherJob[] = [];
  for (const countryCode of rankedCountries) {
    if (osmTagsForCountry(countryCode).length === 0) continue;
    for (const hub of options.hubs) {
      jobs.push({
        id: `${options.hubsPreset}:${hub.id}:${countryCode}:r${options.radiusKm}`,
        hubId: hub.id,
        countryCode,
      });
    }
  }
  return jobs;
}

function scoreAuthenticity(
  restaurant: StoredRestaurant,
  countryCode: string,
): {
  rating: number;
  notes: string;
} {
  const tags = restaurant.cuisineTags.map((t) => t.toLowerCase());
  const primary = osmTagsForCountry(countryCode);
  const name = restaurant.name.toLowerCase();
  const nameHit = primary.some(
    (tag) => tag.length >= 4 && name.includes(tag.replace(/_/g, " ")),
  );

  if (nameHit && tags.some((t) => primary.includes(t))) {
    return {
      rating: 4,
      notes:
        "Promoted from OSM: specialty cuisine tag plus cuisine cue in the name. Pending editorial review.",
    };
  }
  return {
    rating: 3,
    notes:
      "Promoted from OSM specialty cuisine tags. Solid starting point; pending editorial authenticity review.",
  };
}

async function promoteUnreviewed(limit = 80): Promise<{
  promoted: number;
  enrichmentJobs: Array<{
    restaurantId: string;
    countryCode: string;
    countryName: string;
  }>;
}> {
  const rows = await listRestaurants({ reviewedOnly: false });
  const unreviewed = rows.filter((row) => !row.reviewed);
  const countries = await listCountriesFromDb();
  const nameByCode = new Map(countries.map((c) => [c.code, c.name]));

  let promoted = 0;
  const enrichmentJobs: Array<{
    restaurantId: string;
    countryCode: string;
    countryName: string;
  }> = [];
  const now = new Date().toISOString();

  for (const restaurant of unreviewed) {
    if (promoted >= limit) break;

    if (!restaurant.name || restaurant.lat == null || restaurant.lng == null) {
      continue;
    }

    const matchingCodes = restaurant.cuisineCodes.filter((code) =>
      hasPrimaryCuisineMatch(code, restaurant.cuisineTags),
    );
    if (matchingCodes.length === 0) continue;

    const countryCode = matchingCodes[0]!;
    const scored = scoreAuthenticity(restaurant, countryCode);

    await upsertRestaurant({
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      postcode: restaurant.postcode,
      lat: restaurant.lat,
      lng: restaurant.lng,
      cuisineCodes: restaurant.cuisineCodes,
      cuisineTags: restaurant.cuisineTags,
      website: restaurant.website,
      phone: restaurant.phone,
      source: restaurant.source,
      osmId: restaurant.osmId,
      mapsUrl: restaurant.mapsUrl,
      reviewed: true,
      authenticityRating: scored.rating,
      authenticityNotes: scored.notes,
      reviewedAt: now,
      reviewSource: "gather-agent",
    });

    fs.mkdirSync(path.dirname(GATHERED_LOG_PATH), { recursive: true });
    fs.appendFileSync(
      GATHERED_LOG_PATH,
      `${JSON.stringify({
        at: now,
        id: restaurant.id,
        name: restaurant.name,
        city: restaurant.city,
        cuisineCodes: restaurant.cuisineCodes,
        authenticityRating: scored.rating,
      })}\n`,
    );

    enrichmentJobs.push({
      restaurantId: restaurant.id,
      countryCode,
      countryName: nameByCode.get(countryCode) ?? countryCode.toUpperCase(),
    });
    promoted += 1;
  }

  return { promoted, enrichmentJobs };
}

/**
 * Restaurants this agent promoted earlier whose enrichment never completed (no OpenAI
 * key that day, a crash, or more promotions than one run could enrich). The promoted
 * placeholder note is replaced by the enrichment's text step, so a row that still has
 * it was never enriched. Curated and hand-reviewed rows are never picked.
 */
async function findUnenrichedPromoted(
  limit: number,
  skipIds: Set<string>,
): Promise<Array<{ restaurantId: string; countryCode: string; countryName: string }>> {
  if (limit <= 0) return [];
  const rows = await listRestaurants({ reviewedOnly: true });
  const countries = await listCountriesFromDb();
  const nameByCode = new Map(countries.map((c) => [c.code, c.name]));
  const jobs: Array<{ restaurantId: string; countryCode: string; countryName: string }> = [];
  for (const row of rows) {
    if (jobs.length >= limit) break;
    if (row.reviewSource !== "gather-agent") continue;
    if (!row.authenticityNotes?.startsWith("Promoted from OSM")) continue;
    if (skipIds.has(row.id)) continue;
    const countryCode = row.cuisineCodes[0];
    if (!countryCode) continue;
    jobs.push({
      restaurantId: row.id,
      countryCode,
      countryName: nameByCode.get(countryCode) ?? countryCode.toUpperCase(),
    });
  }
  return jobs;
}

async function printReviewedCoverage(options: CliOptions) {
  const reviewed = await countByCuisineCode();
  const countryCodes = await resolveCountryCodes(options);
  const countries = await listCountriesFromDb();
  const byCode = new Map(countries.map((c) => [c.code, c]));
  console.log("\nReviewed coverage:");
  for (const code of countryCodes) {
    const n = reviewed[code] ?? 0;
    const name = byCode.get(code)?.name ?? code;
    console.log(`  ${n > 0 ? "✓" : "·"} ${code} ${name}: ${n}`);
  }
}

async function printTileStatus(options: CliOptions, progress: GatherProgress) {
  const countryCodes = (await resolveCountryCodes(options)).filter(
    (code) => osmTagsForCountry(code).length > 0,
  );
  const jobs = buildTileJobs(options);
  const { fresh, stale } = dueTileJobs(
    jobs,
    progress,
    options.refreshDays,
    currentTagSignature(countryCodes),
  );
  const searched = jobs.length - fresh.length;

  console.log("Gather progress (tiles)");
  console.log(
    `  grid: ${options.tileDeg}° tiles · ${jobs.length} tiles (${coverageRegions(options.regions).map((r) => r.id).join(", ")}) · ${countryCodes.length} cuisines searched at once`,
  );
  console.log(
    `  searched: ${searched}/${jobs.length} · never searched: ${fresh.length} · due for refresh: ${stale.length}` +
      (options.refreshDays > 0 ? ` (older than ${options.refreshDays} days)` : " (refresh off)"),
  );
  console.log(
    `  lifetime: ${progress.totals.harvested} harvested · ${progress.totals.promoted} promoted · ${progress.totals.runs} runs`,
  );
  if (progress.lastRunAt) console.log(`  last run: ${progress.lastRunAt}`);
  await printReviewedCoverage(options);

  const next = [...fresh, ...stale].slice(0, 8);
  if (next.length > 0) {
    console.log("\nNext tiles:");
    for (const job of next) {
      const c = job.tile;
      console.log(`  - ${job.tile.id} (${c.south},${c.west} to ${c.north},${c.east})`);
    }
  } else {
    console.log("\nAll tiles are up to date.");
  }
}

async function printStatus(options: CliOptions, progress: GatherProgress) {
  if (options.mode === "tiles") {
    await printTileStatus(options, progress);
    return;
  }
  const jobs = await buildJobs(options);
  const completed = new Set(progress.completedJobIds);
  const remaining = jobs.filter((job) => !completed.has(job.id));
  const reviewed = await countByCuisineCode();
  const countryCodes = await resolveCountryCodes(options);
  const countries = await listCountriesFromDb();
  const byCode = new Map(countries.map((c) => [c.code, c]));

  console.log("Gather progress");
  console.log(`  preset: ${options.hubsPreset} · radius ${options.radiusKm} km`);
  console.log(
    `  jobs: ${completed.size}/${jobs.length} done · ${remaining.length} remaining`,
  );
  console.log(
    `  lifetime: ${progress.totals.harvested} harvested · ${progress.totals.promoted} promoted · ${progress.totals.runs} runs`,
  );
  if (progress.lastRunAt) console.log(`  last run: ${progress.lastRunAt}`);

  console.log("\nReviewed coverage:");
  for (const code of countryCodes) {
    const n = reviewed[code] ?? 0;
    const name = byCode.get(code)?.name ?? code;
    console.log(`  ${n > 0 ? "✓" : "·"} ${code} ${name}: ${n}`);
  }

  if (remaining.length > 0) {
    console.log("\nNext jobs:");
    for (const job of remaining.slice(0, 8)) {
      console.log(`  - ${job.id}`);
    }
  } else {
    console.log(
      "\nQueue complete for this preset/radius. Raise --radius-km or use --hubs nl-major, or --reset.",
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.dryRun) await getDb();

  let progress = await loadProgressMerged(options);
  if (options.reset) {
    progress = defaultProgress(options);
    saveProgress(progress);
    console.log("Progress reset.");
  }

  if (options.statusOnly) {
    await printStatus(options, progress);
    await closeDb();
    return;
  }

  let harvested = 0;
  let promoted = 0;

  if (!options.promoteOnly && options.mode === "tiles") {
    const countryCodes = (await resolveCountryCodes(options)).filter(
      (code) => osmTagsForCountry(code).length > 0,
    );
    const jobs = buildTileJobs(options);
    const signature = currentTagSignature(countryCodes);
    const { fresh, stale } = dueTileJobs(jobs, progress, options.refreshDays, signature);
    const batch = [...fresh, ...stale].slice(0, options.batch);
    if (batch.length === 0) {
      console.log("All tiles are up to date. Use --refresh-days or --reset to search again.");
    } else {
      console.log(
        `Gather batch: ${batch.length} tile(s) · ${fresh.length} never searched, ${stale.length} due for refresh` +
          (options.dryRun ? " · DRY RUN (nothing is written)" : ""),
      );
    }

    for (const job of batch) {
      process.stdout.write(`Harvest tile ${job.tile.id} … `);
      try {
        const result = await harvestTile(job.tile, countryCodes, {
          delayMs: options.delayMs,
          log: (message) => console.log(`\n  ${message}`),
        });
        const detail = `${result.elements} OSM places, ${result.requests} request(s)${result.splits ? `, ${result.splits} split(s)` : ""}`;
        if (options.dryRun) {
          console.log(`${result.places.length} specialty places (${detail})`);
          for (const place of result.places.slice(0, 5)) {
            console.log(`    ${place.name} · ${place.city} · ${place.cuisineCodes.join(",")}`);
          }
        } else {
          const stored = await mergeOsmHarvest(result.places);
          harvested += stored.inserted + stored.updated + stored.merged;
          console.log(
            `${result.places.length} specialty places: ${stored.inserted} new, ${stored.updated} updated, ` +
              `${stored.merged} merged into reviewed rows, ${stored.unchanged} unchanged (${detail})`,
          );
          if (result.failed.length === 0) {
            if (!progress.completedJobIds.includes(job.id)) progress.completedJobIds.push(job.id);
            progress.completedAt = { ...(progress.completedAt ?? {}), [job.id]: new Date().toISOString() };
            progress.tileSignatures = { ...(progress.tileSignatures ?? {}), [job.id]: signature };
            saveProgress(progress);
          } else {
            console.log(
              `  incomplete: ${result.failed.length} part(s) of this tile failed (${result.failed.join(", ")}); it stays due and is retried next run`,
            );
          }
        }
      } catch (error) {
        console.log("failed");
        console.error(error);
      }
      await sleep(options.delayMs);
    }
    if (options.dryRun) {
      console.log("\nDry run: nothing was written.");
      return;
    }
  }

  if (!options.promoteOnly && options.mode === "hubs") {
    const jobs = await buildJobs(options);
    const completed = new Set(progress.completedJobIds);
    const pending = jobs.filter((job) => !completed.has(job.id));
    const batch = pending.slice(0, options.batch);

    if (batch.length === 0) {
      console.log("No pending harvest jobs for this preset/radius.");
    } else {
      console.log(
        `Gather batch: ${batch.length} job(s) · ${pending.length} remaining after this run`,
      );
    }

    for (const job of batch) {
      const hub = options.hubs.find((h) => h.id === job.hubId);
      if (!hub) continue;
      process.stdout.write(`Harvest ${job.countryCode} @ ${hub.name}… `);
      try {
        const count = await harvestCountryAtHub({
          countryCode: job.countryCode,
          hub,
          radiusKm: options.radiusKm,
        });
        harvested += count;
        progress.completedJobIds.push(job.id);
        console.log(`${count} places`);
      } catch (error) {
        console.log("failed");
        console.error(error);
      }
      await sleep(options.delayMs);
    }
  }

  process.stdout.write("Promoting specialty OSM matches… ");
  const promoteResult = await promoteUnreviewed(options.promoteLimit);
  promoted = promoteResult.promoted;
  console.log(`${promoted} promoted`);

  const finishJobs = await findUnenrichedPromoted(
    options.finishLimit,
    new Set(promoteResult.enrichmentJobs.map((job) => job.restaurantId)),
  );
  if (finishJobs.length > 0) {
    console.log(`Also finishing ${finishJobs.length} earlier-promoted restaurant(s) never enriched`);
  }
  const enrichmentJobs = [...promoteResult.enrichmentJobs, ...finishJobs];

  if (enrichmentJobs.length > 0 && isOpenAiConfigured()) {
    const scheduled = scheduleRestaurantEnrichments(enrichmentJobs);
    console.log(`Scheduled ${scheduled} restaurant enrichment job(s)`);
    console.log("Waiting for restaurant enrichment queue…");
    await waitForRestaurantEnrichmentIdle();
  } else if (enrichmentJobs.length > 0) {
    console.log(
      `Skipped enrichment for ${enrichmentJobs.length} promoted restaurant(s) — OPENAI_API_KEY not set.`,
    );
  }

  progress.lastRunAt = new Date().toISOString();
  progress.totals.harvested += harvested;
  progress.totals.promoted += promoted;
  progress.totals.runs += 1;
  progress.hubsPreset = options.hubsPreset;
  progress.radiusKm = options.radiusKm;
  saveProgress(progress);
  await syncFillProgress(progress);

  console.log("");
  await printStatus(options, progress);
  console.log(
    "\nRun again anytime: npm run agent:gather\nOptional: npm run agent:ratings (needs Google key)",
  );
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
