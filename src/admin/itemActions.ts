import { useCallback, useState } from "react";
import type { Country, Drink, OrderOption, Recipe, SpecialtyShop } from "@/types/content";
import type { Restaurant } from "@/restaurants/types";
import {
  removeDinnerCourse,
  removeDinnerDrink,
  removeDrink,
  removeOrderOption as deleteOrderOption,
  removeRecipe,
  removeRestaurant,
  removeShop,
  replaceDrinkImage,
  replaceDrinkText,
  replaceRecipeImage,
  replaceRecipeText,
  replaceRestaurantImage,
  replaceRestaurantText,
  findRestaurantMenu,
  findRestaurantScores,
  replaceShopText,
  replaceOrderOptionImage,
  replaceOrderOptionText,
  selectDrinkForDinner,
  selectRecipeForDinner,
} from "@/admin/countryTools";
import type { OpenEditRecipeOptions } from "@/admin/EditRecipeContext";
import type { OpenEditRestaurantOptions } from "@/admin/EditRestaurantContext";
import type { OpenEditOrderOptionOptions } from "@/admin/EditOrderOptionContext";
import type { OpenSelectImageOptions } from "@/admin/SelectImageContext";
import type { AdminItemAction } from "@/components/AdminItemMenu";

function drinkAdminKey(drink: Drink): string {
  return drink.id?.trim() || drink.name.trim();
}

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
  openSelectImage?: (options: OpenSelectImageOptions) => void;
  openEditRecipe?: (options: OpenEditRecipeOptions) => void;
}): Promise<string> {
  const { action, country, recipe } = input;
  const community = input.communityRecipes ?? [];

  if (action === "edit-text") {
    if (!input.openEditRecipe) {
      throw new Error("Edit recipe is not available.");
    }
    input.openEditRecipe({
      country,
      recipe,
      onApplied: (result) => {
        if (result.country) input.onCountryUpdated(result.country);
        input.onCommunityRecipesChange?.(
          community.map((item) => (item.id === recipe.id ? result.recipe : item)),
        );
      },
    });
    return "";
  }

  if (action === "remove") {
    if (!window.confirm(`Remove “${recipe.name}”? This cannot be undone.`)) {
      return "";
    }
    const result = await removeRecipe(country.code, recipe.id);
    if (result.country) input.onCountryUpdated(result.country);
    input.onCommunityRecipesChange?.(community.filter((item) => item.id !== recipe.id));
    input.onRemoved?.();
    return "Removed";
  }
  if (action === "select-image") {
    if (!input.openSelectImage) {
      throw new Error("Select image is not available.");
    }
    input.openSelectImage({
      target: {
        kind: "recipe",
        countryCode: country.code,
        recipeId: recipe.id,
      },
      label: recipe.name,
      defaultQuery: `${recipe.name} dish ${country.name}`,
      onApplied: (result) => {
        if (result.country) input.onCountryUpdated(result.country);
        if (result.recipe) {
          input.onCommunityRecipesChange?.(
            community.map((item) => (item.id === recipe.id ? result.recipe! : item)),
          );
        }
      },
    });
    return "";
  }
  if (action === "replace-image") {
    const result = await replaceRecipeImage(country.code, recipe.id);
    if (result.country) input.onCountryUpdated(result.country);
    if (result.recipe) {
      input.onCommunityRecipesChange?.(
        community.map((item) => (item.id === recipe.id ? result.recipe! : item)),
      );
    }
    return "Image updated";
  }
  if (action === "select-for-dinner") {
    const result = await selectRecipeForDinner(country.code, recipe.id);
    if (result.country) input.onCountryUpdated(result.country);
    return `Dinner ${recipe.category} set · story updated`;
  }
  if (action === "replace-text") {
    const result = await replaceRecipeText(country.code, recipe.id);
    if (result.country) input.onCountryUpdated(result.country);
    if (result.recipe) {
      input.onCommunityRecipesChange?.(
        community.map((item) => (item.id === recipe.id ? result.recipe! : item)),
      );
    }
    return "Text updated";
  }
  throw new Error("Unsupported recipe action.");
}

export async function handleDrinkAdminAction(input: {
  action: AdminItemAction;
  country: Country;
  drink: Drink;
  onCountryUpdated: (country: Country) => void;
  openSelectImage?: (options: OpenSelectImageOptions) => void;
}): Promise<string> {
  const { action, country, drink } = input;
  const key = drinkAdminKey(drink);

  if (action === "remove") {
    if (!window.confirm(`Remove “${drink.name}”? This cannot be undone.`)) {
      return "";
    }
    const result = await removeDrink(country.code, key);
    if (result.country) input.onCountryUpdated(result.country);
    return "Removed";
  }
  if (action === "select-image") {
    if (!input.openSelectImage) {
      throw new Error("Select image is not available.");
    }
    input.openSelectImage({
      target: {
        kind: "drink",
        countryCode: country.code,
        drinkKey: key,
      },
      label: drink.name,
      defaultQuery: `${drink.name} drink ${country.name}`,
      onApplied: (result) => {
        if (result.country) input.onCountryUpdated(result.country);
      },
    });
    return "";
  }
  if (action === "replace-image") {
    const result = await replaceDrinkImage(country.code, key);
    if (result.country) input.onCountryUpdated(result.country);
    return "Image updated";
  }
  if (action === "replace-text") {
    const result = await replaceDrinkText(country.code, key);
    if (result.country) input.onCountryUpdated(result.country);
    return "Text updated";
  }
  if (action === "select-for-dinner") {
    const result = await selectDrinkForDinner(country.code, key);
    if (result.country) input.onCountryUpdated(result.country);
    return "Added to dinner drinks";
  }
  throw new Error("Unsupported drink action.");
}

export async function handleDinnerCourseAdminAction(input: {
  action: AdminItemAction;
  country: Country;
  recipe: Recipe;
  communityRecipes?: Recipe[];
  onCountryUpdated: (country: Country) => void;
  onCommunityRecipesChange?: (recipes: Recipe[]) => void;
  openSelectImage?: (options: OpenSelectImageOptions) => void;
  openEditRecipe?: (options: OpenEditRecipeOptions) => void;
}): Promise<string> {
  const { action, country, recipe } = input;
  const community = input.communityRecipes ?? [];

  if (action === "remove") {
    if (!window.confirm(`Remove “${recipe.name}” from tonight’s dinner?`)) {
      return "";
    }
    const result = await removeDinnerCourse(country.code, recipe.id);
    if (result.country) input.onCountryUpdated(result.country);
    return "Removed from dinner";
  }

  if (
    action === "replace-image" ||
    action === "select-image" ||
    action === "edit-text" ||
    action === "replace-text"
  ) {
    return handleRecipeAdminAction({
      action,
      country,
      recipe,
      communityRecipes: community,
      onCountryUpdated: input.onCountryUpdated,
      onCommunityRecipesChange: input.onCommunityRecipesChange,
      openSelectImage: input.openSelectImage,
      openEditRecipe: input.openEditRecipe,
    });
  }

  throw new Error("Unsupported dinner course action.");
}

export async function handleDinnerDrinkAdminAction(input: {
  action: AdminItemAction;
  country: Country;
  drink: Drink;
  onCountryUpdated: (country: Country) => void;
  openSelectImage?: (options: OpenSelectImageOptions) => void;
}): Promise<string> {
  const { action, country, drink } = input;

  if (action === "remove") {
    if (!window.confirm(`Remove “${drink.name}” from tonight’s dinner?`)) {
      return "";
    }
    const result = await removeDinnerDrink(country.code, drink.name);
    if (result.country) input.onCountryUpdated(result.country);
    return "Removed from dinner";
  }

  if (
    action === "replace-image" ||
    action === "select-image" ||
    action === "replace-text"
  ) {
    return handleDrinkAdminAction({
      action,
      country,
      drink,
      onCountryUpdated: input.onCountryUpdated,
      openSelectImage: input.openSelectImage,
    });
  }

  throw new Error("Unsupported dinner drink action.");
}

export async function handleShopAdminAction(input: {
  action: AdminItemAction;
  country: Country;
  shop: SpecialtyShop;
  onCountryUpdated: (country: Country) => void;
}): Promise<string> {
  const { action, country, shop } = input;
  if (action === "replace-image" || action === "select-image") {
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

export async function handleOrderOptionAdminAction(input: {
  action: AdminItemAction;
  country: Country;
  option: OrderOption;
  onCountryUpdated: (country: Country) => void;
  openSelectImage?: (options: OpenSelectImageOptions) => void;
  openEditOrderOption?: (options: OpenEditOrderOptionOptions) => void;
}): Promise<string> {
  const { action, country, option } = input;
  if (action === "edit-text") {
    if (!input.openEditOrderOption) {
      throw new Error("Edit order option is not available.");
    }
    input.openEditOrderOption({
      country,
      option,
      onApplied: (result) => {
        input.onCountryUpdated(result.country);
      },
    });
    return "";
  }
  if (action === "remove") {
    if (!window.confirm(`Remove “${option.name}” from order options?`)) {
      return "";
    }
    const result = await deleteOrderOption(country.code, option.id);
    if (result.country) input.onCountryUpdated(result.country);
    return "Removed";
  }
  if (action === "select-image") {
    if (!input.openSelectImage) {
      throw new Error("Select image is not available.");
    }
    input.openSelectImage({
      target: {
        kind: "orderOption",
        countryCode: country.code,
        optionId: option.id,
      },
      label: option.name,
      defaultQuery: option.signatureDish
        ? `${option.signatureDish} ${country.name} dish`
        : `${option.name} ${country.name} food`,
      onApplied: (result) => {
        if (result.country) input.onCountryUpdated(result.country);
      },
    });
    return "";
  }
  if (action === "replace-image") {
    const result = await replaceOrderOptionImage(country.code, option.id);
    if (result.country) input.onCountryUpdated(result.country);
    return "Image updated";
  }
  if (action === "replace-text") {
    const result = await replaceOrderOptionText(country.code, option.id);
    if (result.country) input.onCountryUpdated(result.country);
    return "Text updated";
  }
  throw new Error("Unsupported order option action.");
}

export async function handleRestaurantAdminAction(input: {
  action: AdminItemAction;
  countryName: string;
  countryCode?: string;
  restaurant: Restaurant;
  onUpdated: (restaurant: Restaurant) => void;
  onRemoved: (id: string) => void;
  openSelectImage?: (options: OpenSelectImageOptions) => void;
  openEditRestaurant?: (options: OpenEditRestaurantOptions) => void;
}): Promise<string> {
  const { action, countryName, countryCode, restaurant } = input;
  if (action === "edit-text") {
    if (!input.openEditRestaurant) {
      throw new Error("Edit restaurant is not available.");
    }
    input.openEditRestaurant({
      restaurant,
      onApplied: (result) => {
        input.onUpdated(result.restaurant);
      },
    });
    return "";
  }
  if (action === "remove") {
    if (!window.confirm(`Remove “${restaurant.name}”? This cannot be undone.`)) {
      return "";
    }
    await removeRestaurant(restaurant.id);
    input.onRemoved(restaurant.id);
    return "Removed";
  }
  if (action === "select-image") {
    if (!input.openSelectImage) {
      throw new Error("Select image is not available.");
    }
    input.openSelectImage({
      target: { kind: "restaurant", restaurantId: restaurant.id },
      label: restaurant.name,
      defaultQuery: `${restaurant.name} ${restaurant.city} restaurant`,
      onApplied: (result) => {
        if (result.restaurant) input.onUpdated(result.restaurant);
      },
    });
    return "";
  }
  if (action === "replace-image") {
    const result = await replaceRestaurantImage(restaurant.id, countryName);
    input.onUpdated(result.restaurant);
    return "Image updated";
  }
  if (action === "find-menu") {
    const result = await findRestaurantMenu(restaurant.id, countryName, countryCode);
    input.onUpdated(result.restaurant);
    return `Menu saved · ${result.itemCount} dishes`;
  }
  if (action === "find-scores") {
    const result = await findRestaurantScores(restaurant.id, countryName);
    input.onUpdated(result.restaurant);
    return "Scores & authenticity updated";
  }
  if (action === "replace-text") {
    const result = await replaceRestaurantText(restaurant.id, countryName, countryCode);
    input.onUpdated(result.restaurant);
    return "Text updated";
  }
  throw new Error("Unsupported restaurant action.");
}
