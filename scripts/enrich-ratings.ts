#!/usr/bin/env tsx
/**
 * Enrich reviewed restaurants in Postgres with guest ratings from:
 * - Google Places (GOOGLE_PLACES_API_KEY) — primary
 * - Tripadvisor Content API (TRIPADVISOR_API_KEY) — optional
 * - The Fork — no free public API; keep values already in ratings_json
 *
 * Writes ratings to Postgres only (no curated.json).
 *
 * Usage:
 *   npm run agent:ratings
 */
import "dotenv/config";
import {
  closeDb,
  getDb,
  listRestaurants,
  upsertRestaurant,
} from "../server/db/restaurants.ts";
import {
  fetchGoogleRating,
  fetchTripadvisorRating,
} from "../server/lib/restaurantRatings.ts";
import {
  aggregateGuestRating,
  type RestaurantRatings,
} from "../src/restaurants/ratings.ts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  await getDb();
  const places = await listRestaurants({ reviewedOnly: true });

  let googleHits = 0;
  let tripadvisorHits = 0;
  let failures = 0;

  for (const [index, place] of places.entries()) {
    const ratings: RestaurantRatings = { ...(place.ratings ?? {}) };
    process.stdout.write(
      `[${index + 1}/${places.length}] ${place.name} (${place.city})… `,
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

    await upsertRestaurant({
      ...place,
      ratings,
      userRating: aggregated.rating ?? null,
      reviewCount: aggregated.reviewCount ?? null,
    });

    process.stdout.write("\n");
  }

  await closeDb();

  console.log(
    `\nDone. Google hits: ${googleHits}, Tripadvisor hits: ${tripadvisorHits}, failures: ${failures}`,
  );
  console.log(`Updated ${places.length} reviewed restaurants in Postgres.`);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
