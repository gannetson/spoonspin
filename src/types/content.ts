export type DrinkType =
  | "beer"
  | "wine"
  | "spirit"
  | "cocktail"
  | "soft-drink"
  | "tea"
  | "coffee";

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
  /** Dish photo URL (Wikimedia / curated). */
  imageUrl?: string;
  imageAttribution?: string;
  /** External recipe article or reference page. */
  sourceUrl?: string;
  /** Video page or search URL (e.g. YouTube). */
  videoUrl?: string;
};

export type SpecialtyShop = {
  id: string;
  name: string;
  city: string;
  address: string;
  specialty: string;
  website?: string;
  mapsUrl: string;
  notes?: string;
};

export type Menu = {
  starter: Recipe;
  main: Recipe;
  side: Recipe;
  dessert: Recipe;
  drink: Drink;
  /** Additional recipes beyond the core four-course set. */
  moreRecipes?: Recipe[];
  /** Additional drinks (beer, wine, soft drinks, etc.). */
  moreDrinks?: Drink[];
};

export type CountryStatus = "draft" | "published";

/** Wikipedia extract for "{Country} cuisine" (or closest page). */
export type WikipediaCuisine = {
  title: string;
  summary: string;
  url: string;
};

/** Hand-authored country module (full Cook menu). */
export type AuthoredCountry = {
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
  specialtyShops?: SpecialtyShop[];
  status: CountryStatus;
};

/** Spinable country — full catalog, with optional Cook menu. */
export type Country = {
  code: string;
  slug: string;
  name: string;
  flag: string;
  region: string;
  introduction: string;
  /** Main cuisine description from Wikipedia when available. */
  wikipedia?: WikipediaCuisine;
  cuisineAliases: string[];
  nationalDishId?: string;
  nationalDrink?: Drink;
  /** Present when Cook mode has a full hand-authored menu. */
  menu?: Menu;
  /**
   * Recipes from the DB when a full cook menu is not assembled yet
   * (e.g. admin-added dishes on a stub country).
   */
  standaloneRecipes?: Recipe[];
  /** Extra drinks when a full cook menu is not assembled yet. */
  moreDrinks?: Drink[];
  specialtyShops?: SpecialtyShop[];
  /** Cuisine banner plate (DB or curated). */
  imageUrl?: string;
  imageAttribution?: string;
  /** True when recipes are ready for Cook mode. */
  cookReady: boolean;
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
