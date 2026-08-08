import type { Recipe } from "@/types/content";

export type RecipeEnrichment = {
  imageUrl?: string;
  imageAttribution?: string;
  sourceUrl?: string;
  videoUrl?: string;
  fetchedAt?: string;
};

/** Enrichments now live on recipe rows in Postgres. */
export function recipeEnrichmentKey(countryCode: string, recipeId: string): string {
  return `${countryCode.toLowerCase()}:${recipeId}`;
}

export function getRecipeEnrichment(
  _countryCode: string,
  _recipeId: string,
): RecipeEnrichment | undefined {
  return undefined;
}

export function applyRecipeEnrichment(
  _countryCode: string,
  recipe: Recipe,
): Recipe {
  return recipe;
}

export function listRecipeEnrichments(): Record<string, RecipeEnrichment> {
  return {};
}
