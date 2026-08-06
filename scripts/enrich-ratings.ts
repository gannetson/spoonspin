#!/usr/bin/env tsx
/**
 * Enrich curated restaurants with guest ratings from:
 * - Google Places (GOOGLE_PLACES_API_KEY) — primary
 * - Tripadvisor Content API (TRIPADVISOR_API_KEY) — optional
 * - The Fork — no free public API; keep values already in curated.json
 *
 * Writes ratings back into curated.json and upserts SQLite.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  closeDb,
  getDb,
  upsertRestaurant,
} from "../server/db/restaurants.ts";
import {
  aggregateGuestRating,
  type RestaurantRatings,
  type SourceRating,
} from "../src/restaurants/ratings.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CURATED_PATH = path.join(
  rootDir,
  "src/content/restaurants/curated.json",
);

const sourceRatingSchema = z.object({
  score: z.number().min(0).max(10),
  count: z.number().int().min(0).optional(),
  scale: z.union([z.literal(5), z.literal(10)]).optional(),
  url: z.string().url().optional(),
  fetchedAt: z.string().optional(),
});

const curatedSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    city: z.string(),
    postcode: z.string().nullable().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    cuisineCodes: z.array(z.string()),
    cuisineTags: z.array(z.string()),
    website: z.string().url().nullable().optional(),
    authenticityRating: z.number(),
    authenticityNotes: z.string(),
    reviewSource: z.string(),
    userRating: z.number().optional(),
    reviewCount: z.number().optional(),
    ratings: z
      .object({
        google: sourceRatingSchema.optional(),
        theFork: sourceRatingSchema.optional(),
        tripadvisor: sourceRatingSchema.optional(),
      })
      .optional(),
  }),
);

type CuratedPlace = z.infer<typeof curatedSchema>[number];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function fetchGoogleRating(
  place: CuratedPlace,
  apiKey: string,
): Promise<SourceRating | null> {
  const textQuery = `${place.name} restaurant ${place.city} Netherlands`;
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.formattedAddress",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "en",
        regionCode: "NL",
        maxResultCount: 5,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Places ${response.status}: ${body.slice(0, 180)}`);
  }

  const data = (await response.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
      formattedAddress?: string;
    }>;
  };

  const match = (data.places ?? []).find((candidate) =>
    namesLikelyMatch(place.name, candidate.displayName?.text ?? ""),
  );
  if (!match?.rating) return null;

  return {
    score: match.rating,
    count: match.userRatingCount,
    scale: 5,
    url: match.googleMapsUri,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchTripadvisorRating(
  place: CuratedPlace,
  apiKey: string,
): Promise<SourceRating | null> {
  const url = new URL(
    "https://api.content.tripadvisor.com/api/v1/location/search",
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("searchQuery", `${place.name} ${place.city}`);
  url.searchParams.set("category", "restaurants");
  url.searchParams.set("language", "en");
  if (place.lat != null && place.lng != null) {
    url.searchParams.set("latLong", `${place.lat},${place.lng}`);
  }

  const searchResponse = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!searchResponse.ok) {
    const body = await searchResponse.text();
    throw new Error(
      `Tripadvisor search ${searchResponse.status}: ${body.slice(0, 180)}`,
    );
  }

  const searchData = (await searchResponse.json()) as {
    data?: Array<{ location_id?: string; name?: string }>;
  };
  const hit = (searchData.data ?? []).find((candidate) =>
    namesLikelyMatch(place.name, candidate.name ?? ""),
  );
  if (!hit?.location_id) return null;

  const detailsUrl = new URL(
    `https://api.content.tripadvisor.com/api/v1/location/${hit.location_id}/details`,
  );
  detailsUrl.searchParams.set("key", apiKey);
  detailsUrl.searchParams.set("language", "en");
  detailsUrl.searchParams.set("currency", "EUR");

  const detailsResponse = await fetch(detailsUrl, {
    headers: { Accept: "application/json" },
  });
  if (!detailsResponse.ok) {
    const body = await detailsResponse.text();
    throw new Error(
      `Tripadvisor details ${detailsResponse.status}: ${body.slice(0, 180)}`,
    );
  }

  const details = (await detailsResponse.json()) as {
    rating?: string | number;
    num_reviews?: string | number;
    web_url?: string;
  };

  const score = Number(details.rating);
  if (!Number.isFinite(score) || score <= 0) return null;

  return {
    score,
    count: Number(details.num_reviews) || undefined,
    scale: 5,
    url: details.web_url,
    fetchedAt: new Date().toISOString(),
  };
}

function mapsUrl(name: string, address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
}

async function main() {
  const googleKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const tripadvisorKey = process.env.TRIPADVISOR_API_KEY?.trim();

  if (!googleKey && !tripadvisorKey) {
    console.error(
      "Set GOOGLE_PLACES_API_KEY and/or TRIPADVISOR_API_KEY to enrich ratings.",
    );
    process.exit(1);
  }

  const curated = curatedSchema.parse(
    JSON.parse(fs.readFileSync(CURATED_PATH, "utf8")),
  );
  getDb();

  let googleHits = 0;
  let tripadvisorHits = 0;
  let failures = 0;

  for (const [index, place] of curated.entries()) {
    const ratings: RestaurantRatings = { ...(place.ratings ?? {}) };
    process.stdout.write(
      `[${index + 1}/${curated.length}] ${place.name} (${place.city})… `,
    );

    try {
      if (googleKey) {
        const google = await fetchGoogleRating(place, googleKey);
        if (google) {
          ratings.google = google;
          googleHits += 1;
          process.stdout.write(`Google ${google.score} `);
        } else {
          process.stdout.write("Google — ");
        }
        await sleep(250);
      }

      if (tripadvisorKey) {
        const tripadvisor = await fetchTripadvisorRating(place, tripadvisorKey);
        if (tripadvisor) {
          ratings.tripadvisor = tripadvisor;
          tripadvisorHits += 1;
          process.stdout.write(`TA ${tripadvisor.score} `);
        } else {
          process.stdout.write("TA — ");
        }
        await sleep(350);
      }
    } catch (error) {
      failures += 1;
      process.stdout.write(
        `error: ${error instanceof Error ? error.message : String(error)} `,
      );
    }

    const aggregated = aggregateGuestRating(ratings);
    place.ratings = ratings;
    if (aggregated.rating != null) place.userRating = aggregated.rating;
    if (aggregated.reviewCount != null) place.reviewCount = aggregated.reviewCount;

    upsertRestaurant({
      id: place.id,
      name: place.name,
      address: place.address,
      city: place.city,
      postcode: place.postcode ?? null,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
      cuisineCodes: place.cuisineCodes,
      cuisineTags: place.cuisineTags,
      website: place.website ?? null,
      source: "curated",
      osmId: place.id,
      mapsUrl: mapsUrl(place.name, place.address),
      reviewed: true,
      authenticityRating: place.authenticityRating,
      authenticityNotes: place.authenticityNotes,
      reviewSource: place.reviewSource,
      ratings,
      userRating: aggregated.rating ?? null,
      reviewCount: aggregated.reviewCount ?? null,
    });

    process.stdout.write("\n");
  }

  fs.writeFileSync(CURATED_PATH, `${JSON.stringify(curated, null, 2)}\n`);
  closeDb();

  console.log(
    `\nDone. Google hits: ${googleHits}, Tripadvisor hits: ${tripadvisorHits}, failures: ${failures}`,
  );
  console.log(
    "The Fork: keep/edit ratings.theFork in curated.json (no free public API).",
  );
  console.log(`Updated ${CURATED_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
