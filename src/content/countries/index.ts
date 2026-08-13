import type { Country, Recipe } from "@/types/content";
import { countryCatalog, CATALOG_SIZE } from "./catalog";
import { authoredCountries, publishedCountries } from "./published";
import { allCountries, getCookReadyCountries } from "./buildCountries";
import { getCountryRecipes } from "./menuAccessors";
import {
  getRuntimeCountry,
  resolveCountry,
  setRuntimeCountries,
} from "./runtimeRegistry";

const catalogByCode = new Map(
  allCountries.map((country) => [country.code, country]),
);

/** Thin catalog stubs (no menus). Prefer API / setRuntimeCountries for full data. */
export function getPublishedCountries(): Country[] {
  return allCountries;
}

export function getCountryByCode(code: string): Country | undefined {
  return resolveCountry(code) ?? catalogByCode.get(code.toLowerCase());
}

export function getRecipeFromCountry(
  country: Country,
  recipeId: string,
): Recipe | undefined {
  return getCountryRecipes(country).find((recipe) => recipe.id === recipeId);
}

export function isPublishedCatalogConsistent(): boolean {
  return allCountries.length === countryCatalog.length;
}

export {
  countryCatalog,
  CATALOG_SIZE,
  allCountries,
  authoredCountries,
  publishedCountries,
  getCookReadyCountries,
  setRuntimeCountries,
  getRuntimeCountry,
  resolveCountry,
};
export {
  getCountryRecipes,
  getCountryDrinks,
  getSpecialtyShops,
  getOrderOptions,
  getDinnerSuggestion,
  dinnerRecipeIdSet,
  recipeMatchesDiet,
  recipeMatchesCategory,
  drinkMatchesAlcohol,
  groupDrinksIntoSections,
} from "./menuAccessors";
export type { DrinkSection, DrinkSectionId, RecipeDietFilter } from "./menuAccessors";
