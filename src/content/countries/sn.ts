import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const snCountry: AuthoredCountry = {
  code: "sn",
  slug: "senegal",
  name: "Senegal",
  flag: "🇸🇳",
  region: "Africa",
  introduction:
    "Senegalese food brings Atlantic fish, rice, vegetables, peanuts, and chile together in generous one-pot dishes. Family cooking often begins with a flavourful onion-and-herb marinade.",
  cuisineAliases: [
    "Senegalese restaurant",
    "Senegalees restaurant",
    "West African restaurant",
  ],
  nationalDishId: "thieboudienne",
  nationalDrink: drink(
    "Bissap",
    "Bissap",
    "soft-drink",
    false,
    "A tart, ruby-red chilled hibiscus drink.",
  ),
  menu: {
    starter: r("accras", "Fish Fritters", "Accras", "starter", [
      { name: "white fish", quantity: 300, unit: "g" },
      { name: "flour", quantity: 120, unit: "g" },
      { name: "spring onions", quantity: 3, unit: "pieces" },
    ]),
    main: r(
      "thieboudienne",
      "Fish and Rice",
      "Ceebu jën",
      "main",
      [
        { name: "firm white fish", quantity: 700, unit: "g" },
        { name: "broken rice", quantity: 450, unit: "g" },
        { name: "tomatoes", quantity: 500, unit: "g" },
        { name: "cassava", quantity: 300, unit: "g" },
      ],
      "Senegal's best-known fish, tomato, vegetable, and rice platter.",
    ),
    side: r("peanut-salad", "Peanut Cabbage Salad", "Salade arachide", "side", [
      { name: "cabbage", quantity: 500, unit: "g" },
      { name: "peanuts", quantity: 100, unit: "g" },
      { name: "lime", quantity: 2, unit: "pieces" },
    ]),
    dessert: r("thiakry", "Millet Yogurt Dessert", "Thiakry", "dessert", [
      { name: "millet couscous", quantity: 250, unit: "g" },
      { name: "yogurt", quantity: 500, unit: "g" },
      { name: "raisins", quantity: 80, unit: "g" },
    ]),
    drink: drink(
      "Ginger Juice",
      "Gingembre",
      "soft-drink",
      false,
      "Fresh ginger, lemon, and sugar chilled over ice.",
    ),
  },
  status: "published",
};
