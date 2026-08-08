import type { Country, Recipe } from "@/types/content";
import { countryCatalog, CATALOG_SIZE } from "./catalog";
import { authoredCountries, publishedCountries } from "./published";
import { allCountries, getCookReadyCountries } from "./buildCountries";
import { getCountryRecipes } from "./menuAccessors";

const byCode = new Map(
  allCountries.map((country) => [country.code, country]),
);

/** All catalog countries (worldwide), ready to spin. */
export function getPublishedCountries(): Country[] {
  return allCountries;
}

export function getCountryByCode(code: string): Country | undefined {
  return byCode.get(code.toLowerCase());
}

export function getRecipeFromCountry(
  country: Country,
  recipeId: string,
): Recipe | undefined {
  return getCountryRecipes(country).find((recipe) => recipe.id === recipeId);
}

export function isPublishedCatalogConsistent(): boolean {
  return (
    allCountries.length === countryCatalog.length &&
    getCookReadyCountries().every((country) =>
      authoredCountries.some((item) => item.code === country.code),
    )
  );
}

export {
  countryCatalog,
  CATALOG_SIZE,
  allCountries,
  authoredCountries,
  publishedCountries,
  getCookReadyCountries,
};
export {
  getCountryRecipes,
  getCountryDrinks,
  getSpecialtyShops,
  recipeMatchesDiet,
  recipeMatchesCategory,
  drinkMatchesAlcohol,
} from "./menuAccessors";
