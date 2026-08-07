import type { Country } from "@/types/content";
import { images } from "@/lib/images";
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

/** Country card / cuisine atmosphere — plate of that country's food when available. */
export function cuisineBannerUrl(
  country: Pick<Country, "code">,
  fallback = images.cuisine,
): string {
  return getCuisineImage(country.code)?.imageUrl ?? fallback;
}

/**
 * Tonight's menu banner — prefer national-dish plate, then country cuisine image.
 */
export function cookBannerUrl(country: Country, fallback = images.cook): string {
  if (country.nationalDishId) {
    const dish = getRecipeEnrichment(country.code, country.nationalDishId);
    if (dish?.imageUrl && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(dish.imageUrl)) {
      return dish.imageUrl;
    }
  }
  return getCuisineImage(country.code)?.imageUrl ?? fallback;
}

/** Dine banner — country cuisine plate when available, else restaurant interior. */
export function dineBannerUrl(
  country: Pick<Country, "code">,
  fallback = images.dine,
): string {
  return getCuisineImage(country.code)?.imageUrl ?? fallback;
}

export function listCuisineImages(): Record<string, CuisineImage> {
  return cuisineImages;
}
