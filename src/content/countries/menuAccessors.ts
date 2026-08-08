import type {
  Country,
  Drink,
  Recipe,
  RecipeCategory,
  SpecialtyShop,
} from "@/types/content";
import { specialtyShopsFor } from "../shops/specialtyShops";
import { applyRecipeEnrichment } from "../recipes/enrichments";

export function getCountryRecipes(country: Country): Recipe[] {
  const enrich = (recipe: Recipe) =>
    applyRecipeEnrichment(country.code, recipe);

  if (country.menu) {
    return [
      country.menu.starter,
      country.menu.main,
      country.menu.side,
      country.menu.dessert,
      ...(country.menu.moreRecipes ?? []),
    ].map(enrich);
  }

  return (country.standaloneRecipes ?? []).map(enrich);
}

export function getCountryDrinks(country: Country): Drink[] {
  if (!country.menu) {
    const drinks = [
      ...(country.nationalDrink ? [country.nationalDrink] : []),
      ...(country.moreDrinks ?? []),
    ];
    const seen = new Set<string>();
    return drinks.filter((drink) => {
      const key = drink.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  const drinks = [country.menu.drink, ...(country.menu.moreDrinks ?? [])];
  if (
    country.nationalDrink &&
    !drinks.some(
      (item) =>
        item.name.toLowerCase() === country.nationalDrink!.name.toLowerCase(),
    )
  ) {
    drinks.unshift(country.nationalDrink);
  }
  return drinks;
}

export function getSpecialtyShops(country: Country): SpecialtyShop[] {
  if (country.specialtyShops != null) {
    return country.specialtyShops;
  }
  return specialtyShopsFor(country.code);
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
