#!/usr/bin/env tsx
/**
 * Enrich reviewed restaurants with photos.
 *
 * Priority:
 * 1. Google Places photos (when GOOGLE_PLACES_API_KEY is set)
 * 2. Wikimedia Commons search fallback
 *
 * Writes photoUrl into curated.json (when listed) and Postgres.
 *
 * Usage:
 *   npm run agent:restaurant-photos
 *   npm run agent:restaurant-photos -- --batch 10
 *   npm run agent:restaurant-photos -- --status
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeDb,
  getDb,
  listRestaurants,
  upsertRestaurant,
  type StoredRestaurant,
} from "../server/db/restaurants.ts";
import { fetchGoogleRestaurantPhoto } from "../server/lib/googlePlacesPhoto.ts";
import { findCommonsImage } from "../server/lib/wikimedia.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CURATED_PATH = path.join(rootDir, "src/content/restaurants/curated.json");
const PROGRESS_PATH = path.join(
  rootDir,
  "data/restaurant-photo-progress.json",
);

type Progress = {
  completedIds: string[];
  lifetimeEnriched: number;
  runs: number;
  lastRunAt: string | null;
};

type CuratedPlace = {
  id: string;
  name: string;
  address: string;
  city: string;
  postcode?: string | null;
  lat?: number | null;
  lng?: number | null;
  cuisineCodes: string[];
  cuisineTags: string[];
  website?: string | null;
  authenticityRating: number;
  authenticityNotes: string;
  reviewSource: string;
  userRating?: number;
  reviewCount?: number;
  ratings?: unknown;
  photoUrl?: string;
  photoAttribution?: string;
};

type Target = {
  id: string;
  name: string;
  city: string;
  dbRow?: StoredRestaurant;
  curatedRow?: CuratedPlace;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]) {
  const args = { batch: 8, status: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--status") args.status = true;
    if (arg === "--batch") args.batch = Math.max(1, Number(argv[++i] ?? 8));
  }
  return args;
}

function loadJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function saveJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fetchCommonsPhoto(
  place: { name: string; city: string },
): Promise<{ url: string; attribution: string } | null> {
  return findCommonsImage(`${place.name} ${place.city} restaurant`);
}

function buildTargets(
  reviewed: StoredRestaurant[],
  curated: CuratedPlace[],
): Target[] {
  const byId = new Map<string, Target>();

  for (const row of reviewed) {
    byId.set(row.id, {
      id: row.id,
      name: row.name,
      city: row.city,
      dbRow: row,
    });
  }

  for (const row of curated) {
    const existing = byId.get(row.id);
    if (existing) {
      existing.curatedRow = row;
      continue;
    }
    byId.set(row.id, {
      id: row.id,
      name: row.name,
      city: row.city,
      curatedRow: row,
    });
  }

  return [...byId.values()];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const googleKey = process.env.GOOGLE_PLACES_API_KEY?.trim() ?? "";
  const progress = loadJson<Progress>(PROGRESS_PATH, {
    completedIds: [],
    lifetimeEnriched: 0,
    runs: 0,
    lastRunAt: null,
  });
  const completed = new Set(progress.completedIds);
  const curated = loadJson<CuratedPlace[]>(CURATED_PATH, []);
  const curatedById = new Map(curated.map((row) => [row.id, { ...row }]));

  await getDb();
  const reviewed = await listRestaurants({ reviewedOnly: true });

  const pending = buildTargets(reviewed, curated).filter((item) => {
    if (completed.has(item.id)) return false;
    if (item.dbRow?.photoUrl) return false;
    if (item.curatedRow?.photoUrl) return false;
    return true;
  });

  if (args.status) {
    console.log(
      `Restaurant photos: ${completed.size} skipped/done · ${pending.length} pending`,
    );
    console.log(
      `Google key: ${googleKey ? "set" : "empty (Wikimedia fallback only)"}`,
    );
    console.log(`Lifetime enriched: ${progress.lifetimeEnriched}`);
    console.log("Next:");
    for (const item of pending.slice(0, 8)) {
      console.log(`  - ${item.id} · ${item.name} (${item.city})`);
    }
    await closeDb();
    return;
  }

  const batch = pending.slice(0, args.batch);
  console.log(
    `Restaurant photo batch: ${batch.length} · ${Math.max(0, pending.length - batch.length)} remaining after`,
  );
  if (!googleKey) {
    console.log(
      "Note: GOOGLE_PLACES_API_KEY is empty — using Wikimedia Commons fallback.",
    );
  }

  let enriched = 0;
  for (const item of batch) {
    process.stdout.write(`Photo ${item.name}… `);
    try {
      let photo: { url: string; attribution: string } | null = null;
      if (googleKey) {
        photo = await fetchGoogleRestaurantPhoto({
          name: item.name,
          city: item.city,
        });
      }
      if (!photo) {
        photo = await fetchCommonsPhoto(item);
      }
      if (!photo) {
        console.log("no photo");
        completed.add(item.id);
        await sleep(200);
        continue;
      }

      if (item.dbRow) {
        await upsertRestaurant({
          ...item.dbRow,
          photoUrl: photo.url,
          photoAttribution: photo.attribution,
        });
      }

      const curatedRow = curatedById.get(item.id);
      if (curatedRow) {
        curatedRow.photoUrl = photo.url;
        curatedRow.photoAttribution = photo.attribution;
      }

      completed.add(item.id);
      enriched += 1;
      console.log("✓");
    } catch (error) {
      console.log("failed");
      console.warn(error);
    }
    await sleep(300);
  }

  saveJson(
    CURATED_PATH,
    curated.map((row) => curatedById.get(row.id) ?? row),
  );

  progress.completedIds = [...completed];
  progress.lifetimeEnriched += enriched;
  progress.runs += 1;
  progress.lastRunAt = new Date().toISOString();
  saveJson(PROGRESS_PATH, progress);
  await closeDb();

  console.log(
    `\nPhotos enriched this run: ${enriched} · lifetime ${progress.lifetimeEnriched}`,
  );
}

main().catch((error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
