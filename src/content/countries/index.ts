import type { Country, Recipe } from "@/types/content";
import { countryCatalog, CATALOG_SIZE } from "./catalog";
import { publishedCountries } from "./published";
import { getCountryRecipes } from "./menuAccessors";

const publishedByCode = new Map(
  publishedCountries.map((country) => [country.code, country]),
);

export function getPublishedCountries(): Country[] {
  return publishedCountries;
}

export function getCountryByCode(code: string): Country | undefined {
  return publishedByCode.get(code.toLowerCase());
}

export function getRecipeFromCountry(
  country: Country,
  recipeId: string,
): Recipe | undefined {
  return getCountryRecipes(country).find((recipe) => recipe.id === recipeId);
}

export function isPublishedCatalogConsistent(): boolean {
  return publishedCountries.every((country) => {
    const entry = countryCatalog.find((item) => item.code === country.code);
    return entry?.status === "published";
  });
}

export { countryCatalog, CATALOG_SIZE, publishedCountries };
export {
  getCountryRecipes,
  getCountryDrinks,
  getSpecialtyShops,
  recipeMatchesDiet,
  recipeMatchesCategory,
  drinkMatchesAlcohol,
} from "./menuAccessors";
