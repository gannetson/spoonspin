import type { Country } from "@/types/content";
import { getRecipeEnrichment } from "../recipes/enrichments";
import cuisineImagesJson from "./cuisineImages.json" with { type: "json" };

export type CuisineImage = {
  imageUrl: string;
  imageAttribution?: string;
  source?: "national-dish" | "wikipedia" | "commons";
  fetchedAt?: string;
};

const cuisineImages = cuisineImagesJson as Record<string, CuisineImage>;

export function getCuisineImage(countryCode: string): CuisineImage | undefined {
  return cuisineImages[countryCode.toLowerCase()];
}

function resolvedCuisineUrl(country: Pick<Country, "code" | "imageUrl">): string | undefined {
  if (country.imageUrl && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(country.imageUrl)) {
    return country.imageUrl;
  }
  return getCuisineImage(country.code)?.imageUrl;
}

/** Country card / cuisine atmosphere — plate of that country's food when available. */
export function cuisineBannerUrl(
  country: Pick<Country, "code" | "imageUrl">,
): string | null {
  return resolvedCuisineUrl(country) ?? null;
}

/**
 * Tonight's menu banner — prefer national-dish plate, then country cuisine image.
 */
export function cookBannerUrl(country: Country): string | null {
  if (country.nationalDishId) {
    const dish = getRecipeEnrichment(country.code, country.nationalDishId);
    if (dish?.imageUrl && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(dish.imageUrl)) {
      return dish.imageUrl;
    }
  }
  return resolvedCuisineUrl(country) ?? null;
}

/** Dine banner — country cuisine plate when available. */
export function dineBannerUrl(
  country: Pick<Country, "code" | "imageUrl">,
): string | null {
  return resolvedCuisineUrl(country) ?? null;
}

export function listCuisineImages(): Record<string, CuisineImage> {
  return cuisineImages;
}
