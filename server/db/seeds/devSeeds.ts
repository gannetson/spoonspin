/**
 * Dev-only seed data (sample countries, Chinese regions/recipes).
 * Lives under server/db/seeds/ — not used in production.
 * Schema migrations always run; these inserts do not.
 */
export function shouldRunDevSeeds(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.SPOONSPIN_DISABLE_DEV_SEEDS === "1") return false;
  if (process.env.SPOONSPIN_DISABLE_DEV_SEEDS === "true") return false;
  return true;
}
