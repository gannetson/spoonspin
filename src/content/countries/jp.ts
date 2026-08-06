import type { Country } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const jpCountry: Country = {
  code: "jp",
  slug: "japan",
  name: "Japan",
  flag: "🇯🇵",
  region: "Asia",
  introduction:
    "Japanese cooking values seasonality, clarity, texture, and careful balance. Rice, dashi, soy, fermented foods, and precise knife work connect humble and celebratory dishes.",
  cuisineAliases: ["Japanese restaurant", "Japans restaurant", "sushi restaurant"],
  nationalDishId: "japanese-curry-rice",
  nationalDrink: drink(
    "Sake",
    "日本酒",
    "wine",
    true,
    "Fermented rice drink served chilled or gently warmed.",
  ),
  menu: {
    starter: r("miso-soup", "Miso Soup", "味噌汁", "starter", [
      { name: "dashi stock", quantity: 800, unit: "ml" },
      { name: "miso", quantity: 70, unit: "g" },
      { name: "tofu", quantity: 200, unit: "g" },
    ]),
    main: r(
      "japanese-curry-rice",
      "Japanese Curry Rice",
      "カレーライス",
      "main",
      [
        { name: "beef", quantity: 600, unit: "g" },
        { name: "Japanese curry roux", quantity: 180, unit: "g" },
        { name: "rice", quantity: 400, unit: "g" },
        { name: "potatoes", quantity: 400, unit: "g" },
      ],
      "A comforting, thick mild curry served over steamed rice.",
    ),
    side: r("sunomono", "Cucumber Vinegar Salad", "酢の物", "side", [
      { name: "cucumber", quantity: 2, unit: "pieces" },
      { name: "rice vinegar", quantity: 60, unit: "ml" },
      { name: "sesame seeds", quantity: 15, unit: "g" },
    ]),
    dessert: r("mochi", "Mochi", "餅", "dessert", [
      { name: "glutinous rice flour", quantity: 250, unit: "g" },
      { name: "sugar", quantity: 100, unit: "g" },
      { name: "red bean paste", quantity: 250, unit: "g" },
    ]),
    drink: drink(
      "Green Tea",
      "緑茶",
      "tea",
      false,
      "Clean, grassy green tea served with or after food.",
    ),
  },
  status: "published",
};
