import type { Drink, Recipe, RecipeCategory } from "@/types/content";

export const recipe = (
  id: string,
  name: string,
  localName: string,
  category: RecipeCategory,
  ingredients: Recipe["ingredients"],
  description = `A home-style ${name.toLowerCase()} prepared with traditional flavours.`,
): Recipe => ({
  id,
  name,
  localName,
  description,
  category,
  servings: 4,
  prepMinutes: 20,
  cookMinutes: 30,
  difficulty: "medium",
  dietaryLabels: [],
  ingredients,
  steps: [
    "1. Prepare and season the ingredients in the order listed.",
    "2. Cook gently until the central ingredients are tender and flavours are integrated.",
    "3. Taste, adjust seasoning, and serve while hot or at its intended temperature.",
  ],
  substitutions: [
    "Dutch supermarkets stock many staples; use a specialist grocer for regional ingredients and choose the closest listed fresh alternative.",
  ],
});
export const drink = (
  name: string,
  localName: string,
  type: Drink["type"],
  alcoholic: boolean,
  description: string,
): Drink => ({ name, localName, type, alcoholic, description });
