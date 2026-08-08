import { useCallback, useState } from "react";
import type { Country, Recipe, SpecialtyShop } from "@/types/content";
import type { Restaurant } from "@/restaurants/types";
import {
  removeRecipe,
  removeRestaurant,
  removeShop,
  replaceRecipeImage,
  replaceRecipeText,
  replaceRestaurantImage,
  replaceRestaurantText,
  findRestaurantMenu,
  findRestaurantScores,
  replaceShopText,
} from "@/admin/countryTools";
import type { AdminItemAction } from "@/components/AdminItemMenu";

type BusyMap = Record<string, boolean>;
type MessageMap = Record<string, string | null>;

export function useAdminItemBusy() {
  const [busy, setBusy] = useState<BusyMap>({});
  const [status, setStatus] = useState<MessageMap>({});
  const [error, setError] = useState<MessageMap>({});

  const run = useCallback(async (key: string, action: () => Promise<string>) => {
    setBusy((prev) => ({ ...prev, [key]: true }));
    setError((prev) => ({ ...prev, [key]: null }));
    setStatus((prev) => ({ ...prev, [key]: null }));
    try {
      const message = await action();
      if (message) {
        setStatus((prev) => ({ ...prev, [key]: message }));
      }
    } catch (err) {
      setError((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : "Action failed.",
      }));
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  return { busy, status, error, run };
}

export async function handleRecipeAdminAction(input: {
  action: AdminItemAction;
  country: Country;
  recipe: Recipe;
  communityRecipes?: Recipe[];
  onCountryUpdated: (country: Country) => void;
  onCommunityRecipesChange?: (recipes: Recipe[]) => void;
  onRemoved?: () => void;
}): Promise<string> {
  const { action, country, recipe } = input;
  const community = input.communityRecipes ?? [];

  if (action === "remove") {
    if (!window.confirm(`Remove “${recipe.name}”? This cannot be undone.`)) {
      return "";
    }
    const result = await removeRecipe(country.code, recipe.id);
    if (result.country) input.onCountryUpdated(result.country);
    input.onCommunityRecipesChange?.(
      community.filter((item) => item.id !== recipe.id),
    );
    input.onRemoved?.();
    return "Removed";
  }
  if (action === "replace-image") {
    const result = await replaceRecipeImage(country.code, recipe.id);
    if (result.country) input.onCountryUpdated(result.country);
    if (result.recipe) {
      input.onCommunityRecipesChange?.(
        community.map((item) =>
          item.id === recipe.id ? result.recipe! : item,
        ),
      );
    }
    return "Image updated";
  }
  const result = await replaceRecipeText(country.code, recipe.id);
  if (result.country) input.onCountryUpdated(result.country);
  if (result.recipe) {
    input.onCommunityRecipesChange?.(
      community.map((item) => (item.id === recipe.id ? result.recipe! : item)),
    );
  }
  return "Text updated";
}

export async function handleShopAdminAction(input: {
  action: AdminItemAction;
  country: Country;
  shop: SpecialtyShop;
  onCountryUpdated: (country: Country) => void;
}): Promise<string> {
  const { action, country, shop } = input;
  if (action === "replace-image") {
    throw new Error("Shops do not have images.");
  }
  if (action === "remove") {
    if (!window.confirm(`Remove “${shop.name}”? This cannot be undone.`)) {
      return "";
    }
    const result = await removeShop(country.code, shop.id);
    if (result.country) input.onCountryUpdated(result.country);
    return "Removed";
  }
  const result = await replaceShopText(country.code, shop.id);
  if (result.country) input.onCountryUpdated(result.country);
  return "Text updated";
}

export async function handleRestaurantAdminAction(input: {
  action: AdminItemAction;
  countryName: string;
  countryCode?: string;
  restaurant: Restaurant;
  onUpdated: (restaurant: Restaurant) => void;
  onRemoved: (id: string) => void;
}): Promise<string> {
  const { action, countryName, countryCode, restaurant } = input;
  if (action === "remove") {
    if (
      !window.confirm(`Remove “${restaurant.name}”? This cannot be undone.`)
    ) {
      return "";
    }
    await removeRestaurant(restaurant.id);
    input.onRemoved(restaurant.id);
    return "Removed";
  }
  if (action === "replace-image") {
    const result = await replaceRestaurantImage(restaurant.id, countryName);
    input.onUpdated(result.restaurant);
    return "Image updated";
  }
  if (action === "find-menu") {
    const result = await findRestaurantMenu(
      restaurant.id,
      countryName,
      countryCode,
    );
    input.onUpdated(result.restaurant);
    return `Menu saved · ${result.itemCount} dishes`;
  }
  if (action === "find-scores") {
    const result = await findRestaurantScores(restaurant.id, countryName);
    input.onUpdated(result.restaurant);
    return "Scores & authenticity updated";
  }
  if (action === "replace-text") {
    const result = await replaceRestaurantText(
      restaurant.id,
      countryName,
      countryCode,
    );
    input.onUpdated(result.restaurant);
    return "Text updated";
  }
  throw new Error("Unsupported restaurant action.");
}
