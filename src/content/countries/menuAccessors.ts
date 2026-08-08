import type {
  Country,
  DinnerSuggestion,
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

export type RecipeDietFilter = "all" | "vegan" | "vegetarian" | "meat";

export function recipeMatchesDiet(
  recipe: Recipe,
  diet: RecipeDietFilter,
): boolean {
  if (diet === "all") return true;
  const labels = recipe.dietaryLabels.map((label) => label.toLowerCase());
  const vegan = labels.some((label) =>
    ["vegan", "plant-based"].includes(label),
  );
  const vegetarian =
    vegan ||
    labels.some((label) => label === "vegetarian" || label === "veggie");
  if (diet === "vegan") return vegan;
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

export type DrinkAlcoholFilter =
  | "all"
  | "other-alcoholic"
  | "non-alcoholic"
  | "beer"
  | "wine";

export function drinkMatchesAlcohol(
  drink: Drink,
  filter: DrinkAlcoholFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "beer") return drink.type === "beer";
  if (filter === "wine") return drink.type === "wine";
  if (filter === "other-alcoholic") {
    return drink.alcoholic && drink.type !== "beer" && drink.type !== "wine";
  }
  return !drink.alcoholic;
}

export type DrinkSectionId =
  | "beers"
  | "wines"
  | "alcoholicOther"
  | "nonAlcoholic";

export type DrinkSection = {
  id: DrinkSectionId;
  drinks: Drink[];
};

/** Group drinks into beers, wines, other alcoholic, and non-alcoholic. */
export function groupDrinksIntoSections(drinks: Drink[]): DrinkSection[] {
  const beers: Drink[] = [];
  const wines: Drink[] = [];
  const alcoholicOther: Drink[] = [];
  const nonAlcoholic: Drink[] = [];

  for (const item of drinks) {
    if (!item.alcoholic) {
      nonAlcoholic.push(item);
      continue;
    }
    if (item.type === "beer") {
      beers.push(item);
      continue;
    }
    if (item.type === "wine") {
      wines.push(item);
      continue;
    }
    alcoholicOther.push(item);
  }

  return [
    { id: "nonAlcoholic", drinks: nonAlcoholic },
    { id: "beers", drinks: beers },
    { id: "wines", drinks: wines },
    { id: "alcoholicOther", drinks: alcoholicOther },
  ];
}

/**
 * Prefer stored dinner_json; otherwise derive a simple dinner from the cook menu slots.
 */
export function getDinnerSuggestion(
  country: Country,
): DinnerSuggestion | undefined {
  if (country.dinner && country.dinner.courses.length > 0) {
    return country.dinner;
  }
  if (!country.menu) return undefined;
  return {
    title: `A taste of ${country.name}`,
    description: country.introduction,
    courses: [
      { recipeId: country.menu.starter.id, role: "starter" },
      { recipeId: country.menu.main.id, role: "main" },
      { recipeId: country.menu.side.id, role: "side" },
      { recipeId: country.menu.dessert.id, role: "dessert" },
    ],
    drinks: [{ drinkName: country.menu.drink.name }],
  };
}

export function dinnerRecipeIdSet(country: Country): Set<string> {
  const dinner = getDinnerSuggestion(country);
  return new Set(dinner?.courses.map((course) => course.recipeId) ?? []);
}
