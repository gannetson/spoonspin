#!/usr/bin/env tsx
import {
  closeDb,
  countByCuisineCode,
  getDb,
  rebuildCuisineCodes,
} from "../server/db/restaurants.ts";

getDb();
const result = rebuildCuisineCodes();
console.log(`Rebuilt cuisine codes: updated=${result.updated}, deleted=${result.deleted}`);
console.log("Totals:", countByCuisineCode());
closeDb();
