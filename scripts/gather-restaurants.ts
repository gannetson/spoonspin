#!/usr/bin/env tsx
/**
 * Incremental restaurant gather agent.
 *
 * Each run processes a small batch of (hub × cuisine) harvest jobs, then
 * promotes strong OSM specialty matches into the reviewed quality set.
 * Progress is saved under data/gather-progress.json so you can keep running
 * over days/weeks without repeating finished jobs.
 *
 * Examples:
 *   npm run agent:gather
 *   npm run agent:gather -- --batch 6
 *   npm run agent:gather -- --status
 *   npm run agent:gather -- --promote-only
 *   npm run agent:gather -- --hubs nl-major --radius-km 25
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
  upsertRestaurant,
  type StoredRestaurant,
} from "../server/db/restaurants.ts";
import { listCountriesFromDb } from "../server/db/content.ts";
import { mergeFillProgress } from "../server/db/fillProgress.ts";
import {
  scheduleRestaurantEnrichments,
  waitForRestaurantEnrichmentIdle,
} from "../server/lib/restaurantEnrichmentQueue.ts";
import {
  hasPrimaryCuisineMatch,
  osmTagsForCountry,
} from "../src/restaurants/osmCuisineMap.ts";
import { isOpenAiConfigured } from "../server/openai/adminDiscover.ts";
import { HUBS, harvestCountryAtHub, sleep, type Hub } from "./lib/overpassRestaurants.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROGRESS_PATH = path.join(rootDir, "data", "gather-progress.json");
const GATHERED_LOG_PATH = path.join(rootDir, "data", "gathered-promotions.jsonl");

type GatherJob = {
  id: string;
  hubId: string;
  countryCode: string;
};

type GatherProgress = {
  version: 1;
  hubsPreset: string;
  radiusKm: number;
  completedJobIds: string[];
  lastRunAt: string | null;
  totals: {
    harvested: number;
    promoted: number;
    runs: number;
  };
};

type CliOptions = {
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

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--hubs" && next) {
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
      options.radiusKm = Number(next);
      i += 1;
    } else if (arg === "--delay-ms" && next) {
      options.delayMs = Number(next);
      i += 1;
    } else if (arg === "--batch" && next) {
      options.batch = Math.max(1, Number(next));
      i += 1;
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
    await mergeFillProgress({
      lastRestaurantsRunAt: progress.lastRunAt,
      lastRunAt: progress.lastRunAt,
      gatherCompletedJobIds: progress.completedJobIds,
      totals: {
        restaurantsHarvested: progress.totals.harvested,
        restaurantsPromoted: progress.totals.promoted,
      },
    });
  } catch (error) {
    console.warn("Could not sync gather progress to content_fill_progress:", error);
  }
}

async function resolveCountryCodes(options: CliOptions): Promise<string[]> {
  if (options.countries && options.countries.length > 0) {
    return options.countries;
  }
  const countries = await listCountriesFromDb();
  return countries
    .filter((country) => country.status === "published")
    .map((country) => country.code);
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

async function printStatus(options: CliOptions, progress: GatherProgress) {
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
  await getDb();

  let progress = loadProgress(options);
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

  if (!options.promoteOnly) {
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
  const promoteResult = await promoteUnreviewed(120);
  promoted = promoteResult.promoted;
  console.log(`${promoted} promoted`);

  if (promoteResult.enrichmentJobs.length > 0 && isOpenAiConfigured()) {
    const scheduled = scheduleRestaurantEnrichments(promoteResult.enrichmentJobs);
    console.log(`Scheduled ${scheduled} restaurant enrichment job(s)`);
    console.log("Waiting for restaurant enrichment queue…");
    await waitForRestaurantEnrichmentIdle();
  } else if (promoteResult.enrichmentJobs.length > 0) {
    console.log(
      `Skipped enrichment for ${promoteResult.enrichmentJobs.length} promoted restaurant(s) — OPENAI_API_KEY not set.`,
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
