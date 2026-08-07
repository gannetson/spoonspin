#!/usr/bin/env tsx
/**
 * Enrich reviewed restaurants with photos.
 *
 * Priority:
 * 1. Google Places photos (when GOOGLE_PLACES_API_KEY is set)
 * 2. Wikimedia Commons search fallback
 *
 * Writes photoUrl into curated.json (when listed) and SQLite.
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
  upsertRestaurant,
  type StoredRestaurant,
} from "../server/db/restaurants.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CURATED_PATH = path.join(rootDir, "src/content/restaurants/curated.json");
const PROGRESS_PATH = path.join(
  rootDir,
  "data/restaurant-photo-progress.json",
);
const USER_AGENT =
  "SpoonSpin/0.1 (https://github.com/gannetson/spoonspin; restaurant photos)";

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

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesLikelyMatch(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const leftTokens = new Set(left.split(" ").filter((t) => t.length > 2));
  const rightTokens = right.split(" ").filter((t) => t.length > 2);
  if (rightTokens.length === 0) return false;
  const overlap = rightTokens.filter((t) => leftTokens.has(t)).length;
  return overlap / rightTokens.length >= 0.6;
}

function parseJsonArray(value: unknown): string[] {
  try {
    const parsed: unknown =
      typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function rowToStored(row: Record<string, unknown>): StoredRestaurant {
  return {
    id: String(row.id),
    name: String(row.name),
    address: String(row.address),
    city: String(row.city),
    postcode: row.postcode == null ? null : String(row.postcode),
    lat: typeof row.lat === "number" ? row.lat : null,
    lng: typeof row.lng === "number" ? row.lng : null,
    cuisineCodes: parseJsonArray(row.cuisine_codes),
    cuisineTags: parseJsonArray(row.cuisine_tags),
    website: row.website == null ? null : String(row.website),
    phone: row.phone == null ? null : String(row.phone),
    source: String(row.source),
    osmId: String(row.osm_id),
    mapsUrl: String(row.maps_url),
    updatedAt: String(row.updated_at),
    reviewed: Number(row.reviewed ?? 0) === 1,
    authenticityRating:
      typeof row.authenticity_rating === "number"
        ? row.authenticity_rating
        : null,
    authenticityNotes:
      row.authenticity_notes == null ? null : String(row.authenticity_notes),
    reviewedAt: row.reviewed_at == null ? null : String(row.reviewed_at),
    reviewSource: row.review_source == null ? null : String(row.review_source),
    userRating: typeof row.user_rating === "number" ? row.user_rating : null,
    reviewCount:
      typeof row.review_count === "number" ? row.review_count : null,
    ratings: null,
    photoUrl: row.photo_url == null ? null : String(row.photo_url),
    photoAttribution:
      row.photo_attribution == null ? null : String(row.photo_attribution),
  };
}

async function fetchGooglePhoto(
  place: { name: string; city: string },
  apiKey: string,
): Promise<{ url: string; attribution: string } | null> {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.photos,places.formattedAddress",
      },
      body: JSON.stringify({
        textQuery: `${place.name} restaurant ${place.city} Netherlands`,
        languageCode: "en",
        regionCode: "NL",
        maxResultCount: 5,
      }),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google search ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    places?: Array<{
      displayName?: { text?: string };
      photos?: Array<{
        name?: string;
        authorAttributions?: Array<{ displayName?: string }>;
      }>;
    }>;
  };

  const match = (data.places ?? []).find((candidate) =>
    namesLikelyMatch(place.name, candidate.displayName?.text ?? ""),
  );
  const photoName = match?.photos?.[0]?.name;
  if (!photoName) return null;

  const media = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&skipHttpRedirect=true`,
    { headers: { "X-Goog-Api-Key": apiKey } },
  );
  if (!media.ok) {
    const body = await media.text();
    throw new Error(`Google photo ${media.status}: ${body.slice(0, 200)}`);
  }
  const payload = (await media.json()) as { photoUri?: string };
  if (!payload.photoUri) return null;

  const credit =
    match?.photos?.[0]?.authorAttributions?.[0]?.displayName ?? "Google";
  return {
    url: payload.photoUri,
    attribution: `Photo: ${credit} via Google`,
  };
}

async function fetchCommonsPhoto(
  place: { name: string; city: string },
): Promise<{ url: string; attribution: string } | null> {
  const query = `${place.name} ${place.city} restaurant`;
  const searchUrl =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srnamespace: "6",
      srlimit: "5",
      format: "json",
      origin: "*",
    });
  const searchRes = await fetch(searchUrl, {
    headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT },
  });
  if (!searchRes.ok) return null;
  const search = (await searchRes.json()) as {
    query?: { search?: Array<{ title: string }> };
  };
  const hit = search.query?.search?.[0];
  if (!hit?.title) return null;

  const infoUrl =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      titles: hit.title,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      format: "json",
      origin: "*",
    });
  const infoRes = await fetch(infoUrl, {
    headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT },
  });
  if (!infoRes.ok) return null;
  const info = (await infoRes.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          imageinfo?: Array<{
            url?: string;
            extmetadata?: {
              Artist?: { value?: string };
              LicenseShortName?: { value?: string };
            };
          }>;
        }
      >;
    };
  };
  const page = Object.values(info.query?.pages ?? {})[0];
  const image = page?.imageinfo?.[0];
  if (!image?.url) return null;
  const license =
    image.extmetadata?.LicenseShortName?.value ?? "Wikimedia Commons";
  const artist = image.extmetadata?.Artist?.value
    ?.replace(/<[^>]+>/g, "")
    .trim();
  return {
    url: image.url,
    attribution: artist
      ? `${artist} / ${license}`
      : `Wikimedia Commons / ${license}`,
  };
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

  const db = getDb();
  const reviewed = (
    db.prepare(`SELECT * FROM restaurants WHERE reviewed = 1`).all() as Array<
      Record<string, unknown>
    >
  ).map(rowToStored);

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
    closeDb();
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
        photo = await fetchGooglePhoto(item, googleKey);
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
        upsertRestaurant({
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
  closeDb();

  console.log(
    `\nPhotos enriched this run: ${enriched} · lifetime ${progress.lifetimeEnriched}`,
  );
}

main().catch((error) => {
  console.error(error);
  closeDb();
  process.exit(1);
});
