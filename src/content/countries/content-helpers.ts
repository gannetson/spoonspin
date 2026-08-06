import type { Drink, Recipe, RecipeCategory } from "@/types/content";

type RecipeOptions = {
  description?: string;
  dietaryLabels?: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  difficulty?: Recipe["difficulty"];
  substitutions?: string[];
  servingSuggestion?: string;
  drinkPairing?: string;
};

export const recipe = (
  id: string,
  name: string,
  localName: string,
  category: RecipeCategory,
  ingredients: Recipe["ingredients"],
  descriptionOrOptions?: string | RecipeOptions,
): Recipe => {
  const options: RecipeOptions =
    typeof descriptionOrOptions === "string" || descriptionOrOptions == null
      ? {
          description:
            descriptionOrOptions ??
            `A home-style ${name.toLowerCase()} prepared with traditional flavours.`,
        }
      : descriptionOrOptions;

  return {
    id,
    name,
    localName,
    description:
      options.description ??
      `A home-style ${name.toLowerCase()} prepared with traditional flavours.`,
    category,
    servings: 4,
    prepMinutes: options.prepMinutes ?? 20,
    cookMinutes: options.cookMinutes ?? 30,
    difficulty: options.difficulty ?? "medium",
    dietaryLabels: options.dietaryLabels ?? [],
    ingredients,
    steps: [
      "1. Prepare and season the ingredients in the order listed.",
      "2. Cook gently until the central ingredients are tender and flavours are integrated.",
      "3. Taste, adjust seasoning, and serve while hot or at its intended temperature.",
    ],
    substitutions: options.substitutions ?? [
      "Dutch supermarkets stock many staples; use a specialist grocer for regional ingredients and choose the closest listed fresh alternative.",
    ],
    servingSuggestion: options.servingSuggestion,
    drinkPairing: options.drinkPairing,
  };
};

export const drink = (
  name: string,
  localName: string,
  type: Drink["type"],
  alcoholic: boolean,
  description: string,
): Drink => ({ name, localName, type, alcoholic, description });
