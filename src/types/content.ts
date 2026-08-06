export type DrinkType =
  "beer" | "wine" | "spirit" | "cocktail" | "soft-drink" | "tea" | "coffee";

export type Drink = {
  name: string;
  localName?: string;
  type: DrinkType;
  alcoholic: boolean;
  description: string;
};

export type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
  note?: string;
};

export type RecipeCategory = "starter" | "main" | "side" | "dessert" | "snack";
export type Difficulty = "easy" | "medium" | "challenging";

export type Recipe = {
  id: string;
  name: string;
  localName?: string;
  description: string;
  category: RecipeCategory;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: Difficulty;
  dietaryLabels: string[];
  ingredients: Ingredient[];
  steps: string[];
  substitutions?: string[];
  servingSuggestion?: string;
  drinkPairing?: string;
};

export type Menu = {
  starter: Recipe;
  main: Recipe;
  side: Recipe;
  dessert: Recipe;
  drink: Drink;
};

export type CountryStatus = "draft" | "published";

export type Country = {
  code: string;
  slug: string;
  name: string;
  flag: string;
  region: string;
  introduction: string;
  cuisineAliases: string[];
  nationalDishId: string;
  nationalDrink: Drink;
  menu: Menu;
  status: CountryStatus;
};

export type CountryCatalogEntry = {
  code: string;
  slug: string;
  name: string;
  flag: string;
  region: string;
  status: CountryStatus;
};
