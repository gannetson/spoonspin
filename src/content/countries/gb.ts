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
    moreRecipes: [
      r(
        "shepherd-pie",
        "Shepherd's Pie",
        "Shepherd's pie",
        "main",
        [
          { name: "minced lamb", quantity: 600, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "carrots", quantity: 2, unit: "pieces" },
          { name: "potatoes", quantity: 900, unit: "g" },
        ],
        {
          description:
            "Minced lamb in gravy under a golden mashed-potato crust.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Shepherd's_pie",
        },
      ),
      r(
        "sunday-roast",
        "Sunday Roast Chicken",
        "Sunday roast",
        "main",
        [
          { name: "whole chicken", quantity: 1500, unit: "g" },
          { name: "potatoes", quantity: 800, unit: "g" },
          { name: "carrots", quantity: 400, unit: "g" },
          { name: "chicken stock", quantity: 300, unit: "ml" },
        ],
        {
          description:
            "Roast chicken with gravy, roast potatoes, and seasonal vegetables.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Sunday_roast",
        },
      ),
      r(
        "scones",
        "Cream Scones",
        "Scones",
        "dessert",
        [
          { name: "flour", quantity: 350, unit: "g" },
          { name: "butter", quantity: 80, unit: "g" },
          { name: "milk", quantity: 150, unit: "ml" },
          { name: "baking powder", quantity: 15, unit: "g" },
        ],
        {
          description:
            "Light tea-time scones split and filled with jam and thick cream.",
          dietaryLabels: ["vegetarian"],
          sourceUrl: "https://en.wikipedia.org/wiki/Scone",
        },
      ),
    ],
  },
  status: "published",
};
