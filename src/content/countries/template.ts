import type { AuthoredCountry } from "@/types/content";

/**
 * TEMPLATE: add a country in its own `<code>.ts` file, export `<code>Country`,
 * complete all four menu recipes and both drinks, then add it to published.ts.
 * Keep this example out of `publishedCountries` until its content is complete.
 */
export const countryContentTemplate: AuthoredCountry = {
  code: "xx",
  slug: "example-country",
  name: "Example Country",
  flag: "🏳️",
  region: "Region",
  introduction:
    "Write a two- or three-sentence cuisine introduction. Describe real culinary character rather than claiming an official national dish.",
  cuisineAliases: ["Example restaurant", "Voorbeelds restaurant"],
  nationalDishId: "example-main",
  nationalDrink: {
    name: "Example spirit",
    type: "spirit",
    alcoholic: true,
    description: "Clearly state what it is and that it contains alcohol.",
  },
  menu: {
    starter: {
      id: "example-starter",
      name: "Example Starter",
      description: "Complete original recipe description.",
      category: "starter",
      servings: 4,
      prepMinutes: 15,
      cookMinutes: 10,
      difficulty: "easy",
      dietaryLabels: [],
      ingredients: [{ name: "ingredient", quantity: 200, unit: "g" }],
      steps: [
        "1. Prepare the ingredient.",
        "2. Cook or assemble it safely.",
        "3. Season and serve.",
      ],
    },
    main: {
      id: "example-main",
      name: "Example Main",
      description: "Complete original recipe description.",
      category: "main",
      servings: 4,
      prepMinutes: 20,
      cookMinutes: 30,
      difficulty: "medium",
      dietaryLabels: [],
      ingredients: [{ name: "ingredient", quantity: 500, unit: "g" }],
      steps: [
        "1. Prepare the ingredients.",
        "2. Cook until done.",
        "3. Rest or serve hot.",
      ],
    },
    side: {
      id: "example-side",
      name: "Example Side",
      description: "Complete original recipe description.",
      category: "side",
      servings: 4,
      prepMinutes: 10,
      cookMinutes: 15,
      difficulty: "easy",
      dietaryLabels: [],
      ingredients: [{ name: "ingredient", quantity: 300, unit: "g" }],
      steps: ["1. Trim the ingredient.", "2. Cook until tender.", "3. Dress and serve."],
    },
    dessert: {
      id: "example-dessert",
      name: "Example Dessert",
      description: "Complete original recipe description.",
      category: "dessert",
      servings: 4,
      prepMinutes: 20,
      cookMinutes: 25,
      difficulty: "medium",
      dietaryLabels: ["vegetarian"],
      ingredients: [{ name: "ingredient", quantity: 250, unit: "g" }],
      steps: ["1. Make the mixture.", "2. Cook or chill it.", "3. Portion and serve."],
    },
    drink: {
      name: "Example soft drink",
      type: "soft-drink",
      alcoholic: false,
      description: "Clearly state that it is non-alcoholic.",
    },
  },
  status: "draft",
};
