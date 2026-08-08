import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const plCountry: AuthoredCountry = {
  code: "pl",
  slug: "poland",
  name: "Poland",
  flag: "🇵🇱",
  region: "Europe",
  introduction:
    "Polish cooking is comforting and seasonal, built on dumplings, cabbage, mushrooms, and slow-braised meats. Shared tables often feature sour, creamy, and herb-forward flavours.",
  cuisineAliases: [
    "Polish restaurant",
    "Pools restaurant",
    "Pierogi restaurant",
  ],
  nationalDishId: "pierogi",
  nationalDrink: drink(
    "Vodka",
    "Wódka",
    "spirit",
    true,
    "Clear distilled spirit traditionally sipped neat with festive Polish meals.",
  ),
  menu: {
    starter: r("zurek", "Żurek", "Żurek", "starter", [
      { name: "sour rye starter", quantity: 500, unit: "ml" },
      { name: "white sausage", quantity: 300, unit: "g" },
      { name: "hard-boiled eggs", quantity: 4, unit: "piece" },
    ]),
    main: r(
      "pierogi",
      "Pierogi",
      "Pierogi",
      "main",
      [
        { name: "flour", quantity: 400, unit: "g" },
        { name: "potato", quantity: 500, unit: "g" },
        { name: "farmer cheese", quantity: 250, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
      ],
      "Filled dumplings that are widely considered Poland's most iconic comfort food.",
    ),
    side: r("sauerkraut", "Braised Sauerkraut", "Kapusta kiszona", "side", [
      { name: "sauerkraut", quantity: 500, unit: "g" },
      { name: "onion", quantity: 1, unit: "piece" },
      { name: "caraway seeds", quantity: 5, unit: "g" },
    ]),
    dessert: r("paczki", "Pączki", "Pączki", "dessert", [
      { name: "flour", quantity: 400, unit: "g" },
      { name: "yeast", quantity: 10, unit: "g" },
      { name: "rose jam", quantity: 200, unit: "g" },
    ]),
    drink: drink(
      "Kompot",
      "Kompot",
      "soft-drink",
      false,
      "Lightly sweet stewed-fruit drink served warm or chilled.",
    ),
    moreRecipes: [
      r(
        "bigos",
        "Hunter's Stew",
        "Bigos",
        "main",
        [
          { name: "sauerkraut", quantity: 500, unit: "g" },
          { name: "fresh cabbage", quantity: 300, unit: "g" },
          { name: "smoked sausage", quantity: 250, unit: "g" },
          { name: "pork shoulder", quantity: 400, unit: "g" },
        ],
        {
          description:
            "Long-simmered sauerkraut and fresh cabbage with assorted meats and sausage.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Bigos",
        },
      ),
      r(
        "golabki",
        "Stuffed Cabbage Rolls",
        "Gołąbki",
        "main",
        [
          { name: "cabbage", quantity: 1, unit: "piece" },
          { name: "minced pork and beef", quantity: 500, unit: "g" },
          { name: "rice", quantity: 120, unit: "g" },
          { name: "tomato passata", quantity: 400, unit: "ml" },
        ],
        {
          description:
            "Cabbage leaves filled with rice and meat, baked in tomato sauce.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Gołąbki",
        },
      ),
      r(
        "sernik",
        "Polish Cheesecake",
        "Sernik",
        "dessert",
        [
          { name: "twaróg or farmer cheese", quantity: 500, unit: "g" },
          { name: "eggs", quantity: 3, unit: "pieces" },
          { name: "sugar", quantity: 150, unit: "g" },
          { name: "butter", quantity: 100, unit: "g" },
        ],
        {
          description:
            "Baked cheesecake of twaróg-style cheese, often on a crumbly base.",
          dietaryLabels: ["vegetarian"],
          sourceUrl: "https://en.wikipedia.org/wiki/Sernik",
        },
      ),
    ],
  },
  status: "published",
};
