/**
 * How rich a country's Cook library should be. One definition, shared by the agents
 * that build menus and by the admin fill status that reports gaps.
 *
 * Override with COOK_TARGET_RECIPES (e.g. 20 to go back to the old size).
 */
function readTarget(): number {
  const raw = Number(process.env.COOK_TARGET_RECIPES);
  return Number.isFinite(raw) && raw >= 8 ? Math.min(Math.floor(raw), 80) : 35;
}

/** Full recipes per country: the core four courses plus `moreRecipes`. */
export const TARGET_RECIPES = readTarget();

/** Full recipes linked to each administrative region when a region catalog exists. */
export const TARGET_RECIPES_PER_REGION = 4;
