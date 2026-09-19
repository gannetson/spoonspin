/**
 * Backfill Google Place IDs onto curated restaurants that lack them.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.app.json scripts/reconcile-restaurant-places.ts
 *   npx tsx --tsconfig tsconfig.app.json scripts/reconcile-restaurant-places.ts --limit=20
 *   npx tsx --tsconfig tsconfig.app.json scripts/reconcile-restaurant-places.ts --force
 *
 * Requires GOOGLE_PLACES_API_KEY. Skips rows that already have a fresh place id
 * unless --force is set.
 */

import "dotenv/config";
import { listRestaurants, closeDb } from "../server/db/restaurants.ts";
import { isGooglePlacesConfigured } from "../server/lib/googlePlacesPhoto.ts";
import { reconcileRestaurantWithGooglePlaces } from "../server/lib/reconcileRestaurantPlaces.ts";
import { attachProviderLinksToRestaurant } from "../server/reservations/catalogIngest.ts";

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 50;
  const force = process.argv.includes("--force");

  if (!isGooglePlacesConfigured()) {
    console.error("GOOGLE_PLACES_API_KEY is not set.");
    process.exitCode = 1;
    return;
  }

  const all = await listRestaurants({ reviewedOnly: true });
  const candidates = all
    .filter((row) => force || !row.googlePlaceId)
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 50);

  console.log(
    `Reconciling ${candidates.length} restaurant(s) (force=${force}, total reviewed=${all.length})`,
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const restaurant of candidates) {
    const result = await reconcileRestaurantWithGooglePlaces(restaurant, {
      forceRefresh: force,
    });
    if (result.ok) {
      ok += 1;
      const attached = await attachProviderLinksToRestaurant(result.restaurant);
      console.log(
        `✓ ${restaurant.name} → ${result.restaurant.googlePlaceId}${
          attached ? " · TheFork linked" : ""
        }`,
      );
    } else if (result.status === "not_found") {
      skipped += 1;
      console.log(`· ${restaurant.name}: ${result.message}`);
    } else {
      failed += 1;
      console.warn(`✗ ${restaurant.name}: ${result.message}`);
    }
  }

  console.log(`Done. ok=${ok} skipped=${skipped} failed=${failed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
