import type { Country } from "@/types/content";
import { getCountryRecipes } from "./menuAccessors";

export type CuisineImage = {
  imageUrl: string;
  imageAttribution?: string;
  source?: "national-dish" | "wikipedia" | "commons";
  fetchedAt?: string;
};

function isImageUrl(url: string | undefined): url is string {
  return Boolean(url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url));
}

function resolvedCuisineUrl(
  country: Pick<Country, "code" | "imageUrl">,
): string | undefined {
  if (isImageUrl(country.imageUrl)) return country.imageUrl;
  return undefined;
}

/** Country card / cuisine atmosphere — plate from DB `imageUrl` when available. */
export function cuisineBannerUrl(
  country: Pick<Country, "code" | "imageUrl">,
): string | null {
  return resolvedCuisineUrl(country) ?? null;
}

/**
 * Tonight's menu banner — prefer national-dish plate on the country payload, then country image.
 */
export function cookBannerUrl(country: Country): string | null {
  if (country.nationalDishId) {
    const dish = getCountryRecipes(country).find(
      (recipe) => recipe.id === country.nationalDishId,
    );
    if (isImageUrl(dish?.imageUrl)) return dish.imageUrl;
  }
  return resolvedCuisineUrl(country) ?? null;
}

/** Dine banner — country cuisine plate when available. */
export function dineBannerUrl(
  country: Pick<Country, "code" | "imageUrl">,
): string | null {
  return resolvedCuisineUrl(country) ?? null;
}
