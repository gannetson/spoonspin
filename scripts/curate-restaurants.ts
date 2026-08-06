#!/usr/bin/env tsx
/**
 * Quality curation agent:
 * 1. Imports reviewed restaurants from curated.json with authenticity ratings
 * 2. Imports multi-source guest ratings when present
 * 3. Prints coverage gaps per published country
 *
 * Authenticity scale (1–5):
 * 5 = highly authentic specialty kitchen
 * 4 = strong specialty focus
 * 3 = solid specialty with adaptation
 * 2 = partial / thin specialty signal
 * 1 = weak
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  closeDb,
  countByCuisineCode,
  getDb,
  upsertRestaurant,
} from "../server/db/restaurants.ts";
import { publishedCountries } from "../src/content/countries/published.ts";
import { aggregateGuestRating } from "../src/restaurants/ratings.ts";

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
    id: z.string().min(1),
    name: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    postcode: z.string().nullable().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    cuisineCodes: z.array(z.string().length(2)).min(1),
    cuisineTags: z.array(z.string().min(1)).min(1),
    website: z.string().url().nullable().optional(),
    authenticityRating: z.number().min(1).max(5),
    authenticityNotes: z.string().min(20),
    reviewSource: z.string().min(1),
    userRating: z.number().min(1).max(5).optional(),
    reviewCount: z.number().int().min(0).optional(),
    ratings: z
      .object({
        google: sourceRatingSchema.optional(),
        theFork: sourceRatingSchema.optional(),
        tripadvisor: sourceRatingSchema.optional(),
      })
      .optional(),
  }),
);

function mapsUrl(name: string, address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
}

function main() {
  const raw = JSON.parse(fs.readFileSync(CURATED_PATH, "utf8"));
  const curated = curatedSchema.parse(raw);
  getDb();

  const now = new Date().toISOString();
  let imported = 0;

  for (const place of curated) {
    const aggregated = aggregateGuestRating(place.ratings);
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
      reviewedAt: now,
      reviewSource: place.reviewSource,
      ratings: place.ratings ?? null,
      userRating: aggregated.rating ?? place.userRating ?? null,
      reviewCount: aggregated.reviewCount ?? place.reviewCount ?? null,
    });
    imported += 1;
  }

  const totals = countByCuisineCode();
  const missing = publishedCountries
    .map((c) => c.code)
    .filter((code) => !totals[code]);

  console.log(`Curated import complete: ${imported} reviewed restaurants`);
  console.log("\nReviewed coverage by cuisine:");
  for (const country of publishedCountries) {
    const n = totals[country.code] ?? 0;
    const marker = n > 0 ? "✓" : "·";
    console.log(`  ${marker} ${country.code} ${country.name}: ${n}`);
  }

  if (missing.length > 0) {
    console.log(
      `\nCoverage gaps (add to curated.json): ${missing.join(", ")}`,
    );
  }

  console.log(
    "\nAuthenticity scale: 5 highly authentic · 4 strong specialty · 3 solid · 2 partial · 1 weak",
  );
  console.log(
    "Guest ratings: run `npm run agent:ratings` (Google / optional Tripadvisor).",
  );
  closeDb();
}

main();
