#!/usr/bin/env tsx
import {
  closeDb,
  countByCuisineCode,
  ensureDb,
  rebuildCuisineCodes,
} from "../server/db/restaurants.ts";

async function main() {
  await ensureDb();
  const result = await rebuildCuisineCodes();
  console.log(
    `Rebuilt cuisine codes: updated=${result.updated}, deleted=${result.deleted}`,
  );
  console.log("Totals:", await countByCuisineCode());
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
