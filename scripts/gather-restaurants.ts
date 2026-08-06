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
  upsertRestaurant,
  type StoredRestaurant,
} from "../server/db/restaurants.ts";
import {
  hasPrimaryCuisineMatch,
  osmTagsForCountry,
} from "../src/restaurants/osmCuisineMap.ts";
import { publishedCountries } from "../src/content/countries/published.ts";
import {
  HUBS,
  harvestCountryAtHub,
  sleep,
  type Hub,
} from "./lib/overpassRestaurants.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROGRESS_PATH = path.join(rootDir, "data", "gather-progress.json");
const GATHERED_LOG_PATH = path.join(
  rootDir,
  "data",
  "gathered-promotions.jsonl",
);

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
  countries: string[];
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
    countries: publishedCountries.map((c) => c.code),
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
    const parsed = JSON.parse(
      fs.readFileSync(PROGRESS_PATH, "utf8"),
    ) as GatherProgress;
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

function buildJobs(options: CliOptions): GatherJob[] {
  const reviewed = countByCuisineCode();
  const rankedCountries = [...options.countries].sort((a, b) => {
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

function scoreAuthenticity(restaurant: StoredRestaurant, countryCode: string): {
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

function promoteUnreviewed(limit = 80): number {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM restaurants WHERE reviewed = 0`)
    .all() as Array<Record<string, unknown>>;

  let promoted = 0;
  const now = new Date().toISOString();

  for (const raw of rows) {
    if (promoted >= limit) break;

    const restaurant = {
      id: String(raw.id),
      name: String(raw.name),
      address: String(raw.address),
      city: String(raw.city),
      postcode: raw.postcode == null ? null : String(raw.postcode),
      lat: typeof raw.lat === "number" ? raw.lat : null,
      lng: typeof raw.lng === "number" ? raw.lng : null,
      cuisineCodes: JSON.parse(String(raw.cuisine_codes)) as string[],
      cuisineTags: JSON.parse(String(raw.cuisine_tags)) as string[],
      website: raw.website == null ? null : String(raw.website),
      phone: raw.phone == null ? null : String(raw.phone),
      source: String(raw.source),
      osmId: String(raw.osm_id),
      mapsUrl: String(raw.maps_url),
      updatedAt: String(raw.updated_at),
      reviewed: false,
      authenticityRating: null,
      authenticityNotes: null,
      reviewedAt: null,
      reviewSource: null,
      userRating: null,
      reviewCount: null,
      ratings: null,
    } satisfies StoredRestaurant;

    if (!restaurant.name || restaurant.lat == null || restaurant.lng == null) {
      continue;
    }

    const matchingCodes = restaurant.cuisineCodes.filter((code) =>
      hasPrimaryCuisineMatch(code, restaurant.cuisineTags),
    );
    if (matchingCodes.length === 0) continue;

    const countryCode = matchingCodes[0]!;
    const scored = scoreAuthenticity(restaurant, countryCode);

    upsertRestaurant({
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

    promoted += 1;
  }

  return promoted;
}

function printStatus(options: CliOptions, progress: GatherProgress) {
  const jobs = buildJobs(options);
  const completed = new Set(progress.completedJobIds);
  const remaining = jobs.filter((job) => !completed.has(job.id));
  const reviewed = countByCuisineCode();

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
  for (const country of publishedCountries) {
    if (!options.countries.includes(country.code)) continue;
    const n = reviewed[country.code] ?? 0;
    console.log(`  ${n > 0 ? "✓" : "·"} ${country.code} ${country.name}: ${n}`);
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
  getDb();

  let progress = loadProgress(options);
  if (options.reset) {
    progress = defaultProgress(options);
    saveProgress(progress);
    console.log("Progress reset.");
  }

  if (options.statusOnly) {
    printStatus(options, progress);
    closeDb();
    return;
  }

  let harvested = 0;
  let promoted = 0;

  if (!options.promoteOnly) {
    const jobs = buildJobs(options);
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
  promoted = promoteUnreviewed(120);
  console.log(`${promoted} promoted`);

  progress.lastRunAt = new Date().toISOString();
  progress.totals.harvested += harvested;
  progress.totals.promoted += promoted;
  progress.totals.runs += 1;
  progress.hubsPreset = options.hubsPreset;
  progress.radiusKm = options.radiusKm;
  saveProgress(progress);

  console.log("");
  printStatus(options, progress);
  console.log(
    "\nRun again anytime: npm run agent:gather\nOptional: npm run agent:ratings (needs Google key)",
  );
  closeDb();
}

main().catch((error) => {
  console.error(error);
  closeDb();
  process.exit(1);
});
