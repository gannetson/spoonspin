/**
 * Dinner-tab suggestions: which countries need one, and composing it.
 * Shared by `agent:compose-dinners` and the one-pass cook pipeline.
 */
import { saveDinnerSuggestion } from "../db/content.ts";
import { composeDinnerSuggestion } from "../openai/adminDiscover.ts";
import {
  getCountryDrinks,
  getCountryRecipes,
} from "../../src/content/countries/menuAccessors.ts";
import type { Country } from "../../src/types/content.ts";

/** Minimum courses that must resolve to a real recipe for a dinner to count. */
export const MIN_DINNER_COURSES = 3;

export function resolvableDinnerCourses(country: Country): number {
  const dinner = country.dinner;
  if (!dinner) return 0;
  const ids = new Set(getCountryRecipes(country).map((recipe) => recipe.id));
  return dinner.courses.filter((course) => ids.has(course.recipeId)).length;
}

/** True when the country has what a dinner needs (recipes and a drink) but no usable one. */
export function needsDinner(country: Country): boolean {
  if (getCountryRecipes(country).length < MIN_DINNER_COURSES) return false;
  if (getCountryDrinks(country).length < 1) return false;
  return resolvableDinnerCourses(country) < MIN_DINNER_COURSES;
}

/** Ask the model for a dinner from the country's current recipes and drinks, and save it. */
export async function composeDinnerForCountry(
  country: Country,
): Promise<{ courses: number; drinks: number }> {
  const recipes = getCountryRecipes(country);
  const drinks = getCountryDrinks(country);
  // Photos first, national dishes first: the model reads the list in order.
  const ordered = [...recipes].sort(
    (a, b) =>
      Number(Boolean(b.isNational)) - Number(Boolean(a.isNational)) ||
      Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)),
  );
  const result = await composeDinnerSuggestion({
    countryCode: country.code,
    countryName: country.name,
    introduction: country.introduction,
    recipes: ordered.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      localName: recipe.localName,
      description: recipe.description,
      category: recipe.category,
      isNational: recipe.isNational ? true : undefined,
      hasImage: Boolean(recipe.imageUrl),
    })),
    drinks: drinks.map((drink) => ({
      name: drink.name,
      localName: drink.localName,
      type: drink.type,
      alcoholic: drink.alcoholic,
      description: drink.description,
    })),
  });
  await saveDinnerSuggestion(country.code, result.dinner);
  return { courses: result.dinner.courses.length, drinks: result.dinner.drinks.length };
}
