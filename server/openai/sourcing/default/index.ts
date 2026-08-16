import {
  RECIPE_STORAGE_LANGUAGE,
  type RecipeSourcingContext,
  type RecipeSourcingStrategy,
} from "../types.ts";

/** Fallback when no country/region-specific strategy matches. */
export const defaultRecipeSourcing: RecipeSourcingStrategy = {
  id: "default",
  priority: 0,
  matches: () => true,
};

export function defaultDiscoverSystemPrompt(context: RecipeSourcingContext): string {
  return `You are a cuisine editor for Spoon Spin. Reply with JSON only.
Propose authentic dishes for the given country that Dutch home cooks can make.
Avoid duplicates of existing dish names. Return dish candidates only (no full recipes).
When a dish is strongly tied to a specific region/province within the country, include its region in ${RECIPE_STORAGE_LANGUAGE}.`;
}

export function defaultExpandSystemPrompt(_context: RecipeSourcingContext): string {
  return `You write practical home-cook recipes for Spoon Spin. Reply with JSON only.
Use metric units. Keep steps concrete. description at least 40 characters.
Include region in ${RECIPE_STORAGE_LANGUAGE} when the dish belongs to a specific area of the country.
Store all recipe text in ${RECIPE_STORAGE_LANGUAGE}.`;
}

export function defaultCommunityPreviewSystemPrompt(
  _context: RecipeSourcingContext,
): string {
  return `You research authentic dishes for a food app. Reply with JSON only.
If the query is not a real dish (or not tied to the given cuisine), set found=false and recipe=null.
If found, return a practical home-cook recipe for Dutch kitchens.
confirmationNotes: 1-2 short sentences confirming what you found and why it fits.
Use metric units. Keep steps concrete. description at least 40 characters.
Store all recipe text in ${RECIPE_STORAGE_LANGUAGE}.`;
}
