import { RECIPE_STORAGE_LANGUAGE, type RecipeSourcingStrategy } from "../types.ts";
import { XIAOHONGSHU_DOMAIN } from "./xiaohongshu.ts";

/** Recipe sourcing for China — authentic home-cook posts from Xiaohongshu (小红书). */
export const chinaRecipeSourcing: RecipeSourcingStrategy = {
  id: "china",
  priority: 10,
  sourceDomains: [XIAOHONGSHU_DOMAIN],
  matches: ({ countryCode }) => countryCode.toLowerCase() === "cn",
  discoverSystemExtra: () =>
    `For China: draw dish ideas from authentic home-cook recipes popular on xiaohongshu.com (小红书).
Put the Chinese dish name in localName (Chinese characters) and the ${RECIPE_STORAGE_LANGUAGE} name in name.
Include region in ${RECIPE_STORAGE_LANGUAGE} when the dish is provincial.`,
  discoverUserExtra: () =>
    `Store names and descriptions in ${RECIPE_STORAGE_LANGUAGE}; put Chinese characters in localName.`,
  expandSystemExtra: () =>
    `For China: base each recipe on authentic home-cook posts from xiaohongshu.com (小红书, Little Red Book).
Prefer realistic home-kitchen methods from xiaohongshu rather than restaurant-only techniques.
Original posts are in Chinese — translate all stored recipe text to ${RECIPE_STORAGE_LANGUAGE}:
name, description, ingredients (names and notes), steps, substitutions, servingSuggestion, drinkPairing.
Keep the original Chinese dish name in localName (Chinese characters).
Include sourceUrl when you can cite a representative xiaohongshu.com page (https://www.xiaohongshu.com/...).`,
  communityPreviewSystemExtra: () =>
    `For China: base the recipe on authentic home-cook posts from xiaohongshu.com (小红书) when possible.
Translate all stored recipe text to ${RECIPE_STORAGE_LANGUAGE}; keep the Chinese dish name in localName.
Include sourceUrl as a xiaohongshu.com link when you can (https://www.xiaohongshu.com/...).`,
};

export { isXiaohongshuUrl, XIAOHONGSHU_DOMAIN } from "./xiaohongshu.ts";
