import type { Country } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const plCountry: Country = {
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
  },
  status: "published",
};
