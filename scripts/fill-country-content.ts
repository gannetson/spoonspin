#!/usr/bin/env tsx
/**
 * Scheduled content-fill orchestrator for all published countries.
 *
 * Lanes (safe to run separately so OpenAI / Apify / OSM never pile on):
 *   cook         — wiki dishes → complete menus → dinners → recipe enrich
 *   restaurants  — OSM gather @ Randstad hubs (Amsterdam, Rotterdam, Den Haag,
 *                  Leiden, Utrecht) + promote unreviewed specialty matches
 *   orders       — Apify order options per country × city hub
 *   daily        — one small batch of each lane (default for cron)
 *
 * Examples:
 *   npm run agent:fill -- --status
 *   npm run agent:fill -- --lane daily
 *   npm run agent:fill -- --lane orders --batch 3
 *   npm run agent:fill -- --lane cook --batch 2
 *   npm run agent:fill -- --lane restaurants --batch 4
 *   npm run agent:fill -- --lane orders --code it --cities Leiden,Amsterdam
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendOrderOptions,
  listCountriesFromDb,
} from "../server/db/content.ts";
import { closeDb, getDb } from "../server/db/restaurants.ts";
import { isApifyConfigured } from "../server/lib/apifyOrderSearch.ts";
import {
  discoverCountryOrderOptions,
  isOpenAiConfigured,
} from "../server/openai/adminDiscover.ts";
import type { Country } from "../src/types/content.ts";
import { FILL_CITIES } from "./lib/fillCities.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROGRESS_PATH = path.join(rootDir, "data", "fill-content-progress.json");

export { FILL_CITIES };

type Lane = "cook" | "restaurants" | "orders" | "daily";

type OrderJob = {
  id: string;
  countryCode: string;
  city: string;
};

type FillProgress = {
  version: 1;
  orderCompletedIds: string[];
  orderFailedIds: string[];
  lastRunAt: string | null;
  totals: {
    runs: number;
    orderOptionsAdded: number;
    orderJobsDone: number;
  };
};

type CliOptions = {
  lane: Lane;
  batch: number;
  statusOnly: boolean;
  code?: string;
  cities: string[];
  delayMs: number;
  resetOrders: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    lane: "daily",
    batch: 3,
    statusOnly: false,
    cities: [...FILL_CITIES],
    delayMs: 8_000,
    resetOrders: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--lane" && next) {
      const lane = next.toLowerCase() as Lane;
      if (!["cook", "restaurants", "orders", "daily"].includes(lane)) {
        throw new Error(
          `Unknown lane "${next}". Use: cook, restaurants, orders, daily`,
        );
      }
      options.lane = lane;
      i += 1;
    } else if (arg === "--batch" && next) {
      options.batch = Math.max(1, Number(next));
      i += 1;
    } else if (arg === "--code" && next) {
      options.code = next.toLowerCase();
      i += 1;
    } else if (arg === "--cities" && next) {
      options.cities = next
        .split(",")
        .map((city) => city.trim())
        .filter(Boolean);
      i += 1;
    } else if (arg === "--delay-ms" && next) {
      options.delayMs = Math.max(0, Number(next));
      i += 1;
    } else if (arg === "--status") {
      options.statusOnly = true;
    } else if (arg === "--reset-orders") {
      options.resetOrders = true;
    }
  }
  return options;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultProgress(): FillProgress {
  return {
    version: 1,
    orderCompletedIds: [],
    orderFailedIds: [],
    lastRunAt: null,
    totals: { runs: 0, orderOptionsAdded: 0, orderJobsDone: 0 },
  };
}

function loadProgress(): FillProgress {
  if (!fs.existsSync(PROGRESS_PATH)) return defaultProgress();
  try {
    const parsed = JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8")) as FillProgress;
    if (parsed.version !== 1) return defaultProgress();
    return parsed;
  } catch {
    return defaultProgress();
  }
}

function saveProgress(progress: FillProgress) {
  fs.mkdirSync(path.dirname(PROGRESS_PATH), { recursive: true });
  fs.writeFileSync(PROGRESS_PATH, `${JSON.stringify(progress, null, 2)}\n`);
}

function runNpmScript(script: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", script, "--", ...args], {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function cityNeedle(city: string): string {
  return city.toLowerCase().replace(/^the\s+/, "").trim();
}

function countryHasCityOrders(country: Country, city: string): boolean {
  const needle = cityNeedle(city);
  return (country.orderOptions ?? []).some((option) => {
    const optionCity = (option.city ?? "").toLowerCase();
    if (!optionCity) return false;
    if (needle === "den haag") {
      return (
        optionCity.includes("den haag") ||
        optionCity.includes("the hague") ||
        optionCity.includes("'s-gravenhage")
      );
    }
    return optionCity.includes(needle);
  });
}

function buildOrderJobs(
  countries: Country[],
  cities: string[],
  codeFilter?: string,
): OrderJob[] {
  const jobs: OrderJob[] = [];
  for (const country of countries) {
    if (codeFilter && country.code !== codeFilter) continue;
    if (country.status !== "published" && !country.cookReady) continue;
    for (const city of cities) {
      jobs.push({
        id: `${country.code}:${cityNeedle(city).replace(/\s+/g, "-")}`,
        countryCode: country.code,
        city,
      });
    }
  }
  return jobs;
}

async function printStatus(options: CliOptions, progress: FillProgress) {
  const countries = await listCountriesFromDb();
  const published = countries.filter((c) => c.status === "published");
  const cookReady = published.filter((c) => c.cookReady);
  const incomplete = published.filter((c) => !c.cookReady);

  console.log("Content fill strategy status");
  console.log(`  cities: ${options.cities.join(", ")}`);
  console.log(
    `  countries: ${published.length} published · ${cookReady.length} cook-ready · ${incomplete.length} cook-incomplete`,
  );
  console.log(
    `  OpenAI: ${isOpenAiConfigured() ? "configured" : "missing OPENAI_API_KEY"}`,
  );
  console.log(
    `  Apify: ${isApifyConfigured() ? "configured" : "missing APIFY_TOKEN"}`,
  );

  const orderJobs = buildOrderJobs(published, options.cities, options.code);
  const done = new Set(progress.orderCompletedIds);
  const pending = orderJobs.filter((job) => !done.has(job.id));
  console.log(
    `\nOrder jobs: ${done.size}/${orderJobs.length} marked done · ${pending.length} remaining`,
  );
  console.log(
    `  lifetime options added: ${progress.totals.orderOptionsAdded} · runs: ${progress.totals.runs}`,
  );
  if (progress.lastRunAt) console.log(`  last run: ${progress.lastRunAt}`);

  const thinOrders = published
    .map((country) => {
      const missing = options.cities.filter(
        (city) => !countryHasCityOrders(country, city),
      );
      return { country, missing };
    })
    .filter((row) => row.missing.length > 0)
    .slice(0, 12);

  if (thinOrders.length > 0) {
    console.log("\nCountries missing order coverage (sample):");
    for (const row of thinOrders) {
      console.log(
        `  · ${row.country.code} ${row.country.name}: missing ${row.missing.join(", ")}`,
      );
    }
  }

  if (incomplete.length > 0) {
    console.log("\nCook-incomplete (sample):");
    for (const country of incomplete.slice(0, 12)) {
      console.log(`  · ${country.code} ${country.name}`);
    }
  }

  if (pending.length > 0) {
    console.log("\nNext order jobs:");
    for (const job of pending.slice(0, 10)) {
      console.log(`  - ${job.id}`);
    }
  }
}

async function runCookLane(batch: number) {
  console.log("\n=== Lane: cook ===");
  if (!isOpenAiConfigured()) {
    console.warn("Skipping cook lane — OPENAI_API_KEY not set.");
    return;
  }
  // Dishes research feeds complete-menus; small batch each run.
  let code = await runNpmScript("agent:dishes", ["--batch", String(batch)]);
  if (code !== 0) console.warn(`agent:dishes exited ${code}`);
  code = await runNpmScript("agent:complete-menus", ["--batch", String(batch)]);
  if (code !== 0) console.warn(`agent:complete-menus exited ${code}`);
  code = await runNpmScript("agent:compose-dinners", ["--batch", String(batch)]);
  if (code !== 0) console.warn(`agent:compose-dinners exited ${code}`);
  code = await runNpmScript("agent:recipes", [
    "--batch",
    String(Math.max(batch * 8, 20)),
  ]);
  if (code !== 0) console.warn(`agent:recipes exited ${code}`);
  code = await runNpmScript("agent:cuisine-images", [
    "--batch",
    String(Math.max(batch * 4, 10)),
  ]);
  if (code !== 0) console.warn(`agent:cuisine-images exited ${code}`);
}

async function runRestaurantsLane(batch: number, code?: string) {
  console.log("\n=== Lane: restaurants (Randstad hubs) ===");
  const countries = await listCountriesFromDb();
  const codes = countries
    .filter((c) => c.status === "published")
    .filter((c) => !code || c.code === code)
    .map((c) => c.code);
  if (codes.length === 0) {
    console.warn("No published countries to harvest.");
    return;
  }
  const args = [
    "--batch",
    String(batch),
    "--hubs",
    "randstad",
    "--radius-km",
    "25",
    "--countries",
    codes.join(","),
  ];
  const exit = await runNpmScript("agent:gather", args);
  if (exit !== 0) console.warn(`agent:gather exited ${exit}`);
}

async function runOrdersLane(
  options: CliOptions,
  progress: FillProgress,
): Promise<FillProgress> {
  console.log("\n=== Lane: order options ===");
  if (!isApifyConfigured()) {
    console.warn("Skipping orders lane — APIFY_TOKEN not set.");
    return progress;
  }

  const countries = await listCountriesFromDb();
  const byCode = new Map(countries.map((c) => [c.code, c]));
  const jobs = buildOrderJobs(countries, options.cities, options.code);
  const done = new Set(progress.orderCompletedIds);
  const pending = jobs.filter((job) => {
    if (done.has(job.id)) return false;
    const country = byCode.get(job.countryCode);
    if (!country) return false;
    // Skip if this city already has curated options (unless forcing via reset).
    if (countryHasCityOrders(country, job.city)) {
      progress.orderCompletedIds.push(job.id);
      done.add(job.id);
      return false;
    }
    return true;
  });
  saveProgress(progress);

  const batch = pending.slice(0, options.batch);
  if (batch.length === 0) {
    console.log("No pending order jobs for these cities.");
    return progress;
  }

  console.log(
    `Order batch: ${batch.length} job(s) · ${pending.length} remaining after selection`,
  );

  for (const job of batch) {
    const country = byCode.get(job.countryCode);
    if (!country) continue;
    process.stdout.write(`Orders ${job.countryCode} @ ${job.city}… `);
    try {
      const discovered = await discoverCountryOrderOptions({
        countryCode: country.code,
        countryName: country.name,
        city: job.city,
      });
      const before = country.orderOptions?.length ?? 0;
      const updated = await appendOrderOptions(country.code, discovered.options);
      const after = updated?.orderOptions?.length ?? before;
      const added = Math.max(0, after - before);
      progress.orderCompletedIds.push(job.id);
      progress.totals.orderOptionsAdded += added;
      progress.totals.orderJobsDone += 1;
      byCode.set(job.countryCode, updated ?? country);
      console.log(`${discovered.options.length} found · +${added} saved`);
      console.log(`  ${discovered.notes}`);
    } catch (error) {
      console.log("failed");
      console.error(error);
      if (!progress.orderFailedIds.includes(job.id)) {
        progress.orderFailedIds.push(job.id);
      }
    }
    saveProgress(progress);
    await sleep(options.delayMs);
  }

  return progress;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await getDb();

  let progress = loadProgress();
  if (options.resetOrders) {
    progress.orderCompletedIds = [];
    progress.orderFailedIds = [];
    saveProgress(progress);
    console.log("Order progress reset.");
  }

  if (options.statusOnly) {
    await printStatus(options, progress);
    await closeDb();
    return;
  }

  progress.totals.runs += 1;
  progress.lastRunAt = new Date().toISOString();
  saveProgress(progress);

  console.log(
    `Fill content · lane=${options.lane} · batch=${options.batch} · cities=${options.cities.join(",")}`,
  );

  try {
    if (options.lane === "cook" || options.lane === "daily") {
      await runCookLane(options.batch);
    }
    if (options.lane === "restaurants" || options.lane === "daily") {
      await runRestaurantsLane(options.batch, options.code);
    }
    if (options.lane === "orders" || options.lane === "daily") {
      progress = await runOrdersLane(options, progress);
    }
  } finally {
    saveProgress(progress);
    await closeDb();
  }

  console.log("\nDone.");
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