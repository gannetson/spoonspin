import type { Recipe } from "@/types/content";
import enrichmentsJson from "./enrichments.json" with { type: "json" };

export type RecipeEnrichment = {
  imageUrl?: string;
  imageAttribution?: string;
  sourceUrl?: string;
  videoUrl?: string;
  fetchedAt?: string;
};

const enrichments = enrichmentsJson as Record<string, RecipeEnrichment>;

export function recipeEnrichmentKey(countryCode: string, recipeId: string): string {
  return `${countryCode.toLowerCase()}:${recipeId}`;
}

export function getRecipeEnrichment(
  countryCode: string,
  recipeId: string,
): RecipeEnrichment | undefined {
  return enrichments[recipeEnrichmentKey(countryCode, recipeId)];
}

export function applyRecipeEnrichment(
  countryCode: string,
  recipe: Recipe,
): Recipe {
  const extra = getRecipeEnrichment(countryCode, recipe.id);
  if (!extra) return recipe;
  return {
    ...recipe,
    imageUrl: extra.imageUrl ?? recipe.imageUrl,
    imageAttribution: extra.imageAttribution ?? recipe.imageAttribution,
    sourceUrl: extra.sourceUrl ?? recipe.sourceUrl,
    videoUrl: extra.videoUrl ?? recipe.videoUrl,
  };
}

export function listRecipeEnrichments(): Record<string, RecipeEnrichment> {
  return enrichments;
}
