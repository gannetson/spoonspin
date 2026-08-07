import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const gbCountry: AuthoredCountry = {
  code: "gb",
  slug: "united-kingdom",
  name: "United Kingdom",
  flag: "🇬🇧",
  region: "Europe",
  introduction:
    "British cooking spans pub classics, coastal seafood, and regional baking. Expect hearty roasts, fried fish, and comforting puddings alongside modern market produce.",
  cuisineAliases: [
    "British restaurant",
    "Brits restaurant",
    "English restaurant",
  ],
  nationalDishId: "fish-and-chips",
  nationalDrink: drink(
    "Ale",
    "Bitter ale",
    "beer",
    true,
    "Traditional British beer style, often served with pub meals.",
  ),
  menu: {
    starter: r("scotch-egg", "Scotch Egg", "Scotch egg", "starter", [
      { name: "eggs", quantity: 4, unit: "piece" },
      { name: "sausage meat", quantity: 400, unit: "g" },
      { name: "breadcrumbs", quantity: 150, unit: "g" },
    ]),
    main: r(
      "fish-and-chips",
      "Fish and Chips",
      "Fish and chips",
      "main",
      [
        { name: "white fish fillets", quantity: 700, unit: "g" },
        { name: "flour", quantity: 200, unit: "g" },
        { name: "potatoes", quantity: 1, unit: "kg" },
        { name: "beer", quantity: 250, unit: "ml", note: "for batter" },
      ],
      "Crispy battered fish with thick-cut chips, a widely loved British takeaway classic.",
    ),
    side: r("mushy-peas", "Mushy Peas", "Mushy peas", "side", [
      { name: "dried marrowfat peas", quantity: 300, unit: "g" },
      { name: "butter", quantity: 30, unit: "g" },
      { name: "mint", quantity: 10, unit: "g" },
    ]),
    dessert: r("sticky-toffee-pudding", "Sticky Toffee Pudding", "Sticky toffee pudding", "dessert", [
      { name: "dates", quantity: 200, unit: "g" },
      { name: "flour", quantity: 175, unit: "g" },
      { name: "brown sugar", quantity: 150, unit: "g" },
      { name: "butter", quantity: 100, unit: "g" },
    ]),
    drink: drink(
      "Elderflower Cordial",
      "Elderflower cordial",
      "soft-drink",
      false,
      "Floral non-alcoholic cordial diluted with still or sparkling water.",
    ),
  },
  status: "published",
};
