/**
 * Backfill TheFork reservation links from stored ratings_json profile URLs.
 *
 *   npm run db:promote-thefork-links
 */
import "dotenv/config";
import { closeDb } from "../server/db/restaurants.ts";
import { promoteTheForkLinksFromRatings } from "../server/reservations/theForkFromRatings.ts";

async function main() {
  const result = await promoteTheForkLinksFromRatings();
  console.log(
    `TheFork links: scanned ${result.scanned} · attached ${result.attached} · skipped ${result.skipped}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
