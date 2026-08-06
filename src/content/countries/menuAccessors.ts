import type {
  Country,
  Drink,
  Recipe,
  RecipeCategory,
  SpecialtyShop,
} from "@/types/content";
import { specialtyShopsFor } from "../shops/specialtyShops";

export function getCountryRecipes(country: Country): Recipe[] {
  return [
    country.menu.starter,
    country.menu.main,
    country.menu.side,
    country.menu.dessert,
    ...(country.menu.moreRecipes ?? []),
  ];
}

export function getCountryDrinks(country: Country): Drink[] {
  const drinks = [country.menu.drink, ...(country.menu.moreDrinks ?? [])];
  if (
    !drinks.some(
      (item) =>
        item.name.toLowerCase() === country.nationalDrink.name.toLowerCase(),
    )
  ) {
    drinks.unshift(country.nationalDrink);
  }
  return drinks;
}

export function getSpecialtyShops(country: Country): SpecialtyShop[] {
  const local = country.specialtyShops ?? [];
  const shared = specialtyShopsFor(country.code);
  const seen = new Set(local.map((shop) => shop.id));
  return [...local, ...shared.filter((shop) => !seen.has(shop.id))];
}

export function recipeMatchesDiet(
  recipe: Recipe,
  diet: "all" | "vegetarian" | "meat",
): boolean {
  if (diet === "all") return true;
  const labels = recipe.dietaryLabels.map((label) => label.toLowerCase());
  const vegetarian = labels.some((label) =>
    ["vegetarian", "vegan", "plant-based"].includes(label),
  );
  if (diet === "vegetarian") return vegetarian;
  return !vegetarian;
}

export function recipeMatchesCategory(
  recipe: Recipe,
  category: "all" | RecipeCategory,
): boolean {
  if (category === "all") return true;
  return recipe.category === category;
}

export function drinkMatchesAlcohol(
  drink: Drink,
  filter: "all" | "alcoholic" | "non-alcoholic",
): boolean {
  if (filter === "all") return true;
  if (filter === "alcoholic") return drink.alcoholic;
  return !drink.alcoholic;
}
