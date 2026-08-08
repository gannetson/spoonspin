import type { Country } from "@/types/content";
import { getCountryRecipes } from "./menuAccessors";
import { allCountries } from "./buildCountries";

/** Countries loaded from the API for the current session (menus, drinks, shops). */
let runtimeByCode = new Map<string, Country>();

export function setRuntimeCountries(countries: Country[]): void {
  runtimeByCode = new Map(
    countries.map((country) => [country.code.toLowerCase(), country]),
  );
}

export function getRuntimeCountries(): Country[] {
  return [...runtimeByCode.values()];
}

export function getRuntimeCountry(code: string): Country | undefined {
  return runtimeByCode.get(code.toLowerCase());
}

/** Prefer API-loaded country; fall back to thin catalog stub. */
export function resolveCountry(code: string): Country | undefined {
  const key = code.toLowerCase();
  return (
    runtimeByCode.get(key) ??
    allCountries.find((country) => country.code === key)
  );
}

export function getRecipeFromResolvedCountry(
  country: Country,
  recipeId: string,
) {
  return getCountryRecipes(country).find((recipe) => recipe.id === recipeId);
}
