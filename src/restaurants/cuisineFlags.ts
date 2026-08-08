import { getCountryByCode, getCountryRecipes } from "@/content/countries";
import type { RestaurantMenuItem } from "@/restaurants/types";

export type CuisineFlag = {
  code: string;
  name: string;
  flag: string;
};

export function cuisineFlagsFor(codes: string[] | undefined): CuisineFlag[] {
  if (!codes?.length) return [];
  const seen = new Set<string>();
  const flags: CuisineFlag[] = [];
  for (const raw of codes) {
    const code = raw.toLowerCase();
    if (seen.has(code)) continue;
    seen.add(code);
    const country = getCountryByCode(code);
    if (!country) continue;
    flags.push({
      code: country.code,
      name: country.name,
      flag: country.flag,
    });
  }
  return flags;
}

function normalizeDishName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < 4) return false;
  return longer.includes(shorter);
}

export type MenuItemNationalMatch = {
  code: string;
  name: string;
  flag: string;
  dishName: string;
  isNationalDish: boolean;
};

/**
 * Match a restaurant menu item against cook recipes for the cuisines it serves.
 * Prefer AI-assigned `item.cuisineCodes` (from Find menu); otherwise fall back to
 * restaurant-level codes with name matching.
 * Recipe matching uses API-loaded countries via setRuntimeCountries.
 */
export function matchMenuItemNationalDishes(
  item: RestaurantMenuItem,
  cuisineCodes: string[] | undefined,
): MenuItemNationalMatch[] {
  const explicitCodes = item.cuisineCodes?.filter(Boolean);
  if (explicitCodes && explicitCodes.length > 0) {
    return flagsFromCodes(item, explicitCodes);
  }

  const flags = cuisineFlagsFor(cuisineCodes);
  if (flags.length === 0) return [];

  const candidates = itemNameCandidates(item);
  if (candidates.length === 0) return [];

  const matches: MenuItemNationalMatch[] = [];

  for (const cuisine of flags) {
    const hit = findRecipeHit(cuisine.code, candidates);
    if (!hit) continue;
    matches.push({
      code: cuisine.code,
      name: cuisine.name,
      flag: cuisine.flag,
      dishName: hit.dishName,
      isNationalDish: hit.isNationalDish,
    });
  }

  return matches;
}

function itemNameCandidates(item: RestaurantMenuItem): string[] {
  return [item.name, item.localName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeDishName);
}

function findRecipeHit(
  code: string,
  candidates: string[],
): { dishName: string; isNationalDish: boolean } | null {
  const country = getCountryByCode(code);
  if (!country) return null;
  const recipes = getCountryRecipes(country);
  for (const recipe of recipes) {
    const recipeNames = [recipe.name, recipe.localName]
      .filter((value): value is string => Boolean(value?.trim()))
      .map(normalizeDishName);
    const hit = recipeNames.some((recipeName) =>
      candidates.some((candidate) => namesMatch(candidate, recipeName)),
    );
    if (!hit) continue;
    return {
      dishName: recipe.name,
      isNationalDish: recipe.id === country.nationalDishId,
    };
  }
  return null;
}

/** Show flags for AI-assigned cuisine codes; enrich with national-dish when names match. */
function flagsFromCodes(
  item: RestaurantMenuItem,
  codes: string[],
): MenuItemNationalMatch[] {
  const flags = cuisineFlagsFor(codes);
  if (flags.length === 0) return [];
  const candidates = itemNameCandidates(item);
  return flags.map((cuisine) => {
    const hit =
      candidates.length > 0 ? findRecipeHit(cuisine.code, candidates) : null;
    return {
      code: cuisine.code,
      name: cuisine.name,
      flag: cuisine.flag,
      dishName: hit?.dishName ?? item.name,
      isNationalDish: hit?.isNationalDish ?? false,
    };
  });
}
