import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const jmCountry: AuthoredCountry = {
  code: "jm",
  slug: "jamaica",
  name: "Jamaica",
  flag: "🇯🇲",
  region: "Americas",
  introduction:
    "Jamaican cooking is bold with allspice, Scotch bonnet chile, tropical fruit, and smoke. Its food carries African, Indigenous, British, and South Asian influences in vibrant island combinations.",
  cuisineAliases: [
    "Jamaican restaurant",
    "Jamaicaans restaurant",
    "Caribbean restaurant",
  ],
  nationalDishId: "ackee-saltfish",
  nationalDrink: drink(
    "Jamaican Rum",
    "Jamaicaanse rum",
    "spirit",
    true,
    "Full-flavoured sugarcane rum, served neat or in a mixed drink.",
  ),
  menu: {
    starter: r("jamaican-patties", "Jamaican Patties", "Jamaican patties", "starter", [
      { name: "pastry", quantity: 400, unit: "g" },
      { name: "ground beef", quantity: 400, unit: "g" },
      { name: "allspice", quantity: 5, unit: "g" },
    ]),
    main: r(
      "ackee-saltfish",
      "Ackee and Saltfish",
      "Ackee and saltfish",
      "main",
      [
        { name: "salt cod", quantity: 500, unit: "g" },
        { name: "tinned ackee", quantity: 500, unit: "g" },
        { name: "tomatoes", quantity: 250, unit: "g" },
        { name: "Scotch bonnet", quantity: 1, unit: "piece" },
      ],
      "Jamaica's iconic breakfast of flaked salt cod and buttery ackee with peppers.",
    ),
    side: r("rice-and-peas", "Rice and Peas", "Rice and peas", "side", [
      { name: "rice", quantity: 350, unit: "g" },
      { name: "kidney beans", quantity: 400, unit: "g" },
      { name: "coconut milk", quantity: 400, unit: "ml" },
    ]),
    dessert: r("coconut-drops", "Coconut Drops", "Coconut drops", "dessert", [
      { name: "fresh coconut", quantity: 400, unit: "g" },
      { name: "brown sugar", quantity: 180, unit: "g" },
      { name: "ginger", quantity: 20, unit: "g" },
    ]),
    drink: drink(
      "Sorrel Drink",
      "Sorrel",
      "soft-drink",
      false,
      "Spiced hibiscus drink often made for celebrations.",
    ),
    moreRecipes: [
      r(
        "jerk-chicken",
        "Jerk Chicken",
        "Jerk chicken",
        "main",
        [
          { name: "chicken thighs", quantity: 1000, unit: "g" },
          { name: "jerk seasoning or paste", quantity: 60, unit: "g" },
          { name: "scotch bonnet", quantity: 1, unit: "piece" },
          { name: "lime", quantity: 2, unit: "pieces" },
        ],
        {
          description:
            "Chicken marinated in fiery allspice-scotch bonnet paste and grilled until lacquered.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Jerk_(cooking)",
        },
      ),
      r(
        "callaloo",
        "Callaloo Greens",
        "Callaloo",
        "side",
        [
          { name: "callaloo or spinach", quantity: 500, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "tomato", quantity: 1, unit: "piece" },
          { name: "thyme", quantity: 5, unit: "g" },
        ],
        {
          description:
            "Leafy greens simmered with onion, tomato, and thyme into a soft, savoury side.",
          dietaryLabels: ["vegetarian", "vegan"],
          sourceUrl: "https://en.wikipedia.org/wiki/Callaloo",
        },
      ),
      r(
        "rum-cake",
        "Jamaican Rum Cake",
        "Rum cake",
        "dessert",
        [
          { name: "mixed dried fruit", quantity: 300, unit: "g" },
          { name: "dark rum", quantity: 120, unit: "ml" },
          { name: "butter", quantity: 200, unit: "g" },
          { name: "brown sugar", quantity: 200, unit: "g" },
        ],
        {
          description:
            "Dense fruit-studded cake soaked with dark rum syrup for festive gatherings.",
          dietaryLabels: ["vegetarian"],
          sourceUrl: "https://en.wikipedia.org/wiki/Rum_cake",
        },
      ),
    ],
  },
  status: "published",
};
