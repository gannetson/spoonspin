/**
 * Photo and reference links for one recipe, straight against the database.
 * Used by `agent:recipes` and the one-pass cook pipeline.
 *
 * Existing values are never overwritten: a recipe that already has a photo (including
 * an admin upload) keeps it, and a lookup that finds nothing writes nothing.
 */
import {
  markRecipeImageAttempt,
  updateRecipeFields,
} from "../db/content.ts";
import type { Recipe } from "../../src/types/content.ts";
import { findDishImage, type DishImage } from "./dishImages.ts";
import { fetchJson } from "./wikimedia.ts";

type WikiSummary = {
  type?: string;
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
};

const FOOD_WORDS =
  /\b(dish|food|cuisine|recipe|cooked|ingredient|meal|dessert|soup|stew|salad|bread|cake|pie|curry|pasta|rice|meat|fish|cheese)\b/i;

const NATIONALITY_PREFIX =
  /^(Dutch|Italian|Japanese|Mexican|Thai|Indian|French|German|Spanish|Greek|Turkish|Korean|Chinese|British|Polish|Portuguese|Brazilian|Peruvian|Argentine|Ethiopian|Moroccan|Lebanese|Vietnamese|Indonesian|Jamaican|Nigerian|Egyptian|Filipino|Bulgarian|Georgian|South African|Senegalese)\s+/i;

async function findWikipediaPageUrl(titles: string[]): Promise<string | null> {
  for (const title of titles) {
    const page = await fetchJson<WikiSummary>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    ).catch(() => null);
    if (!page || page.type === "disambiguation") continue;
    if ((page.extract ?? "").length < 40) continue;
    if (!FOOD_WORDS.test(`${page.title ?? ""} ${page.extract ?? ""}`)) continue;
    return (
      page.content_urls?.desktop?.page ??
      (page.title
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`
        : null)
    );
  }
  return null;
}

async function findWikibooksCookbookUrl(titles: string[]): Promise<string | null> {
  const variants = new Set<string>();
  for (const title of titles) {
    const clean = title.replace(/^Cookbook:/i, "").trim();
    if (!clean) continue;
    variants.add(`Cookbook:${clean}`);
    const stripped = clean.replace(NATIONALITY_PREFIX, "");
    if (stripped !== clean) variants.add(`Cookbook:${stripped}`);
  }
  for (const cookbookTitle of variants) {
    const page = await fetchJson<WikiSummary>(
      `https://en.wikibooks.org/api/rest_v1/page/summary/${encodeURIComponent(cookbookTitle.replace(/ /g, "_"))}`,
    ).catch(() => null);
    if (!page || page.type === "disambiguation") continue;
    if (!page.title || !/^Cookbook:/i.test(page.title)) continue;
    return (
      page.content_urls?.desktop?.page ??
      `https://en.wikibooks.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`
    );
  }
  return null;
}

export function youtubeSearchUrl(recipeName: string, countryName: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${recipeName} ${countryName} recipe`)}`;
}

/** Google's recipe filter (udm=18) surfaces recipe cards with ingredients and steps. */
export function googleRecipeSearchUrl(recipeName: string, countryName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${recipeName} ${countryName} recipe`)}&udm=18`;
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?|$)/i;

/** An image URL that is not a real photo file and not an admin upload: safe to replace. */
function isBadImage(url: string | undefined): boolean {
  if (!url?.trim()) return true;
  if (url.startsWith("/uploads/")) return false;
  return !IMAGE_EXT.test(url);
}

export type RecipeMediaResult = {
  image: DishImage | null;
  sourceAdded: boolean;
  videoAdded: boolean;
};

export async function enrichRecipeMedia(input: {
  countryCode: string;
  countryName: string;
  recipe: Recipe;
  /** Also replace an image URL that is not a photo file. */
  fixBad?: boolean;
}): Promise<RecipeMediaResult> {
  const { countryCode, countryName, recipe } = input;
  const patch: Partial<Recipe> = {};
  const result: RecipeMediaResult = { image: null, sourceAdded: false, videoAdded: false };

  const wantsImage = !recipe.imageUrl?.trim() || (input.fixBad === true && isBadImage(recipe.imageUrl));
  if (wantsImage) {
    const image = await findDishImage(
      { name: recipe.name, localName: recipe.localName, countryName },
      { excludeUrls: recipe.imageUrl ? [recipe.imageUrl] : [] },
    );
    if (image) {
      patch.imageUrl = image.url;
      patch.imageAttribution = image.attribution;
      result.image = image;
    } else {
      await markRecipeImageAttempt(countryCode, recipe.id);
    }
  }

  if (!recipe.sourceUrl?.trim()) {
    const titles = [recipe.localName, recipe.name, `${recipe.name} (${countryName})`].filter(
      (t): t is string => Boolean(t),
    );
    const cookbook = await findWikibooksCookbookUrl([
      recipe.localName ?? "",
      recipe.name,
      recipe.name.replace(NATIONALITY_PREFIX, ""),
    ].filter(Boolean));
    const wiki = cookbook ? null : await findWikipediaPageUrl(titles);
    patch.sourceUrl = cookbook ?? wiki ?? googleRecipeSearchUrl(recipe.name, countryName);
    result.sourceAdded = true;
  }
  if (!recipe.videoUrl?.trim()) {
    patch.videoUrl = youtubeSearchUrl(recipe.name, countryName);
    result.videoAdded = true;
  }

  // Only the fields that were found: updateRecipeFields writes every key it is given,
  // so an undefined value would blank the column.
  if (Object.keys(patch).length > 0) {
    await updateRecipeFields(countryCode, recipe.id, patch);
  }
  return result;
}
