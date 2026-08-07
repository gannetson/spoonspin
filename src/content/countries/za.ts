import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const zaCountry: AuthoredCountry = {
  code: "za",
  slug: "south-africa",
  name: "South Africa",
  flag: "🇿🇦",
  region: "Africa",
  introduction:
    "South African cooking reflects Indigenous, Dutch, Malay, Indian, and British influences. Fire-grilled food, fragrant curries, dried meats, and sweet baked puddings all belong at the table.",
  cuisineAliases: [
    "South African restaurant",
    "Zuid-Afrikaans restaurant",
    "braai restaurant",
  ],
  nationalDishId: "boboti",
  nationalDrink: drink(
    "Cape Wine",
    "Kaapse wijn",
    "wine",
    true,
    "South African wine, especially from the Cape, ranges from crisp Chenin Blanc to bold reds.",
  ),
  menu: {
    starter: r("biltong", "Biltong", "Biltong", "starter", [
      { name: "beef", quantity: 350, unit: "g" },
      { name: "coriander seeds", quantity: 10, unit: "g" },
      { name: "vinegar", quantity: 45, unit: "ml" },
    ]),
    main: r(
      "boboti",
      "Bobotie",
      "Bobotie",
      "main",
      [
        { name: "ground beef", quantity: 700, unit: "g" },
        { name: "bread", quantity: 2, unit: "slices" },
        { name: "curry powder", quantity: 15, unit: "g" },
        { name: "milk", quantity: 300, unit: "ml" },
      ],
      "A gently curried meat bake with fruit, egg custard, and Cape Malay character.",
    ),
    side: r("chakalaka", "Chakalaka", "Chakalaka", "side", [
      { name: "beans", quantity: 500, unit: "g" },
      { name: "red peppers", quantity: 2, unit: "pieces" },
      { name: "carrots", quantity: 300, unit: "g" },
    ]),
    dessert: r("malva-pudding", "Malva Pudding", "Malvapoeding", "dessert", [
      { name: "flour", quantity: 200, unit: "g" },
      { name: "apricot jam", quantity: 80, unit: "g" },
      { name: "cream", quantity: 250, unit: "ml" },
    ]),
    drink: drink(
      "Rooibos Tea",
      "Rooibos",
      "tea",
      false,
      "Naturally caffeine-free red bush tea, served plain or with milk.",
    ),
  },
  status: "published",
};
