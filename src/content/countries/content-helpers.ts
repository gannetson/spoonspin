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
  sourceUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  imageAttribution?: string;
};

export const recipe = (
  id: string,
  name: string,
  localName: string,
  category: RecipeCategory,
  ingredients: Recipe["ingredients"],
  steps: string[],
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
    steps,
    substitutions: options.substitutions ?? [
      "Dutch supermarkets stock many staples; use a specialist grocer for regional ingredients and choose the closest listed fresh alternative.",
    ],
    servingSuggestion: options.servingSuggestion,
    drinkPairing: options.drinkPairing,
    sourceUrl: options.sourceUrl,
    videoUrl: options.videoUrl,
    imageUrl: options.imageUrl,
    imageAttribution: options.imageAttribution,
  };
};

export const drink = (
  name: string,
  localName: string,
  type: Drink["type"],
  alcoholic: boolean,
  description: string,
): Drink => ({ name, localName, type, alcoholic, description });
