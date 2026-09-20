/**
 * Import a curated "restaurants per country" spreadsheet.
 *
 *   npx tsx --tsconfig tsconfig.app.json scripts/import-restaurant-sheet.ts <file.xlsx> [options]
 *
 * Dry run by default; pass --write to apply.
 *
 * ## Running this against production
 *
 * The expensive, non-deterministic part is resolving each venue on Google
 * Places, so it is separated from the database write by a cache file:
 *
 *   1. Locally, once:  --ground --cache data/restaurant-sheet-cache.json
 *   2. Commit or copy that cache file.
 *   3. On production:  --write            (no --ground)
 *
 * Step 3 costs nothing, calls no external API, and writes exactly what step 1
 * resolved — so what you reviewed locally is what production gets. Re-running
 * is safe: venues are upserted by their Google place id, so a second run
 * updates rows instead of duplicating them.
 *
 * Options:
 *   --sheet <name>      worksheet to read (default: the first)
 *   --write             apply changes (default: dry run)
 *   --ground            resolve venues on Google Places, filling the cache
 *   --cache <path>      cache file (default: data/restaurant-sheet-cache.json)
 *   --match <levels>    comma list of country,regional,inspired (default: country,regional)
 *   --country <codes>   only import these cuisine codes, comma separated
 *   --reviewed          publish immediately (default: import unreviewed)
 *   --limit <n>         only process the first N venues
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { readWorkbook } from "../server/lib/xlsxReader.ts";
import {
  bestMatch,
  groupByVenue,
  parseRestaurantSheet,
  type SheetMatchLevel,
  type SheetVenue,
} from "../server/lib/restaurantSheet.ts";
import {
  isGooglePlacesConfigured,
  lookupGoogleRestaurant,
  officialWebsiteOrUndefined,
  type GooglePlaceMatch,
} from "../server/lib/googlePlacesLookup.ts";
import { closeDb, upsertRestaurant } from "../server/db/restaurants.ts";
import { listRegionsForCountry } from "../server/db/regions.ts";
import {
  buildRegionTermIndex,
  detectRegion,
  type RegionTermIndex,
} from "../server/lib/regionCuisine.ts";
import { osmTagsForCountry } from "../src/restaurants/osmCuisineMap.ts";
import { stableMapsUrl } from "../src/restaurants/utils.ts";

const DEFAULT_CACHE = "data/restaurant-sheet-cache.json";
const GROUNDING_CONCURRENCY = 4;

type CacheHit = GooglePlaceMatch & { resolvedAt: string };
type CacheMiss = { notFound: true; resolvedAt: string };
type CacheEntry = CacheHit | CacheMiss;
type Cache = { version: 1; entries: Record<string, CacheEntry> };

function isMiss(entry: CacheEntry | undefined): entry is CacheMiss {
  return Boolean(entry && "notFound" in entry);
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function option(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function loadCache(path: string): Cache {
  if (!existsSync(path)) return { version: 1, entries: {} };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Cache;
    return parsed.entries ? parsed : { version: 1, entries: {} };
  } catch (error) {
    console.warn(`Could not read cache at ${path}; starting a new one.`, error);
    return { version: 1, entries: {} };
  }
}

function saveCache(path: string, cache: Cache): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(cache, null, 2)}\n`);
}

/** Resolve venues on Places, in small batches, skipping anything already cached. */
async function groundVenues(venues: SheetVenue[], cache: Cache): Promise<void> {
  const pending = venues.filter((venue) => !cache.entries[venue.key]);
  if (pending.length === 0) {
    console.log("Every venue is already in the cache; no lookups needed.");
    return;
  }
  if (!isGooglePlacesConfigured()) {
    throw new Error("--ground needs GOOGLE_PLACES_API_KEY.");
  }
  console.log(`Resolving ${pending.length} venue(s) on Google Places…`);

  let done = 0;
  for (let i = 0; i < pending.length; i += GROUNDING_CONCURRENCY) {
    const batch = pending.slice(i, i + GROUNDING_CONCURRENCY);
    await Promise.all(
      batch.map(async (venue) => {
        try {
          const match = await lookupGoogleRestaurant({
            name: venue.name,
            city: venue.city,
          });
          cache.entries[venue.key] = match
            ? { ...match, resolvedAt: new Date().toISOString() }
            : { notFound: true, resolvedAt: new Date().toISOString() };
        } catch (error) {
          console.warn(`  lookup failed for ${venue.name}, ${venue.city}`, error);
        }
      }),
    );
    done += batch.length;
    if (done % 40 === 0 || done === pending.length) {
      console.log(`  ${done}/${pending.length}`);
    }
  }
}

function ratingFor(match: SheetMatchLevel): number {
  // Search hides anything below 3, so an imported row has to clear that bar to
  // be worth storing at all; a national match earns one point more.
  return match === "country" ? 4 : 3;
}

function notesFor(venue: SheetVenue, match: SheetMatchLevel, label: string): string {
  const lead =
    match === "country"
      ? `Curated sheet lists this as a specialist in ${label} cuisine.`
      : match === "regional"
        ? `Curated sheet lists this as a regional alternative for ${label} cuisine, not a specialist.`
        : `Curated sheet lists this as ${label}-inspired rather than a specialist.`;
  return [lead, ...venue.notes].join(" ").slice(0, 600);
}

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    console.error(
      "Usage: import-restaurant-sheet.ts <file.xlsx> [--write] [--ground] [--cache <path>]",
    );
    process.exitCode = 1;
    return;
  }

  const write = flag("write");
  const ground = flag("ground");
  const reviewed = flag("reviewed");
  const cachePath = option("cache", DEFAULT_CACHE)!;
  const limit = Number(option("limit", "0")) || 0;
  const allowed = new Set(
    (option("match", "country,regional") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean) as SheetMatchLevel[],
  );
  const onlyCountries = new Set(
    (option("country", "") ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  const workbook = readWorkbook(readFileSync(file));
  const sheetName = option("sheet");
  const parsed = parseRestaurantSheet(workbook.sheet(sheetName));

  console.log(
    `${parsed.listings.length} listing(s) across ` +
      `${new Set(parsed.listings.map((l) => l.countryCode)).size} cuisine(s).`,
  );
  if (parsed.unknownCountries.length > 0) {
    console.log(`Unrecognised countries: ${parsed.unknownCountries.join(", ")}`);
  }
  if (parsed.skipped.length > 0) {
    console.log(`${parsed.skipped.length} row(s) skipped:`);
    for (const skip of parsed.skipped.slice(0, 10)) {
      console.log(`  row ${skip.row}: ${skip.reason}`);
    }
  }

  const keep = parsed.listings.filter(
    (listing) =>
      allowed.has(listing.match) &&
      (onlyCountries.size === 0 || onlyCountries.has(listing.countryCode)),
  );
  let venues = groupByVenue(keep);
  if (limit > 0) venues = venues.slice(0, limit);
  console.log(
    `Importing match level(s) ${[...allowed].join(", ")}: ` +
      `${keep.length} listing(s) over ${venues.length} unique venue(s).`,
  );

  const cache = loadCache(cachePath);
  const cachedBefore = Object.keys(cache.entries).length;
  if (ground) {
    await groundVenues(venues, cache);
    saveCache(cachePath, cache);
    console.log(
      `Cache ${cachePath}: ${cachedBefore} -> ${Object.keys(cache.entries).length} entries.`,
    );
  } else {
    console.log(`Using cache ${cachePath} (${cachedBefore} entries); no lookups.`);
  }

  const regionIndexes = new Map<string, RegionTermIndex | null>();
  const regionIndexFor = async (code: string): Promise<RegionTermIndex | null> => {
    if (!regionIndexes.has(code)) {
      try {
        const regions = await listRegionsForCountry(code);
        regionIndexes.set(
          code,
          regions.length > 0 ? buildRegionTermIndex(code, regions) : null,
        );
      } catch {
        regionIndexes.set(code, null);
      }
    }
    return regionIndexes.get(code) ?? null;
  };

  let stored = 0;
  let ungrounded = 0;
  let regionTagged = 0;
  const perCountry = new Map<string, number>();

  for (const venue of venues) {
    const entry = cache.entries[venue.key];
    if (!entry || isMiss(entry)) {
      ungrounded += 1;
      continue;
    }

    const codes = venue.cuisines
      .filter((cuisine) => allowed.has(cuisine.match))
      .map((cuisine) => cuisine.countryCode);
    if (codes.length === 0) continue;

    const match = bestMatch(venue);
    const primaryCode = codes[0]!;
    const label = venue.cuisines[0]?.label || primaryCode.toUpperCase();
    const tags = [...new Set(codes.flatMap((code) => osmTagsForCountry(code)))];

    const index = await regionIndexFor(primaryCode);
    const region = index
      ? detectRegion({
          text: [venue.name, label, ...venue.notes].filter(Boolean).join(" \n "),
          index,
        })
      : undefined;
    if (region) regionTagged += 1;

    const key = createHash("sha1").update(venue.key).digest("hex").slice(0, 16);
    const mapsUrl = stableMapsUrl(entry.mapsUrl, {
      name: entry.name,
      address: entry.address,
      city: entry.city,
    });

    if (write) {
      await upsertRestaurant({
        id: `sheet-${key}`,
        osmId: `sheet:${key}`,
        googlePlaceId: entry.placeId,
        name: entry.name || venue.name,
        address: entry.address,
        city: entry.city || venue.city,
        postcode: entry.postcode ?? null,
        lat: entry.lat ?? null,
        lng: entry.lng ?? null,
        cuisineCodes: codes,
        cuisineTags: tags.length > 0 ? tags : codes,
        website: officialWebsiteOrUndefined(venue.url ?? entry.website) ?? null,
        phone: entry.phone ?? null,
        source: "sheet-import",
        mapsUrl,
        regionId: region?.regionId ?? null,
        reviewed,
        authenticityRating: ratingFor(match),
        authenticityNotes: notesFor(venue, match, label),
        reviewedAt: reviewed ? new Date().toISOString() : null,
        reviewSource: "sheet-import",
        userRating: entry.rating ?? null,
        reviewCount: entry.reviewCount ?? null,
        placesRefreshedAt: entry.resolvedAt,
      });
    }

    stored += 1;
    for (const code of codes) perCountry.set(code, (perCountry.get(code) ?? 0) + 1);
  }

  console.log(
    `\n${write ? "Stored" : "Would store"} ${stored} venue(s) across ` +
      `${perCountry.size} cuisine(s); ${regionTagged} got a regional cuisine.`,
  );
  if (ungrounded > 0) {
    console.log(
      `${ungrounded} venue(s) have no Places match yet and were skipped` +
        (ground ? " (not found on Places)." : " — run once with --ground."),
    );
  }
  if (!write) console.log("\nDry run — pass --write to apply.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
