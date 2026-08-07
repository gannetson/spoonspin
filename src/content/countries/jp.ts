import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const jpCountry: AuthoredCountry = {
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
    starter: r(
      "miso-soup",
      "Miso Soup",
      "味噌汁",
      "starter",
      [
        { name: "dashi stock", quantity: 800, unit: "ml" },
        { name: "miso", quantity: 70, unit: "g" },
        { name: "tofu", quantity: 200, unit: "g" },
      ],
      { dietaryLabels: ["vegetarian"] },
    ),
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
      {
        description:
          "A comforting, thick mild curry served over steamed rice.",
        dietaryLabels: ["contains-meat"],
      },
    ),
    side: r(
      "sunomono",
      "Cucumber Vinegar Salad",
      "酢の物",
      "side",
      [
        { name: "cucumber", quantity: 2, unit: "pieces" },
        { name: "rice vinegar", quantity: 60, unit: "ml" },
        { name: "sesame seeds", quantity: 15, unit: "g" },
      ],
      { dietaryLabels: ["vegetarian", "vegan"] },
    ),
    dessert: r(
      "mochi",
      "Mochi",
      "餅",
      "dessert",
      [
        { name: "glutinous rice flour", quantity: 250, unit: "g" },
        { name: "sugar", quantity: 100, unit: "g" },
        { name: "red bean paste", quantity: 250, unit: "g" },
      ],
      { dietaryLabels: ["vegetarian"] },
    ),
    drink: drink(
      "Green Tea",
      "緑茶",
      "tea",
      false,
      "Clean, grassy green tea served with or after food.",
    ),
    moreRecipes: [
      r(
        "okonomiyaki",
        "Okonomiyaki",
        "お好み焼き",
        "main",
        [
          { name: "cabbage", quantity: 400, unit: "g" },
          { name: "flour", quantity: 150, unit: "g" },
          { name: "eggs", quantity: 2, unit: "pieces" },
          { name: "pork belly", quantity: 200, unit: "g" },
        ],
        {
          description:
            "A savoury cabbage pancake finished with sauce, mayo, and katsuobushi.",
          dietaryLabels: ["contains-meat"],
        },
      ),
      r(
        "onigiri",
        "Onigiri Rice Balls",
        "おにぎり",
        "snack",
        [
          { name: "cooked Japanese rice", quantity: 500, unit: "g" },
          { name: "nori sheets", quantity: 4, unit: "pieces" },
          { name: "salted salmon", quantity: 120, unit: "g" },
        ],
        {
          description:
            "Hand-shaped rice snacks wrapped in nori with a savoury filling.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 15,
          cookMinutes: 0,
          difficulty: "easy",
        },
      ),
      r(
        "tamagoyaki",
        "Rolled Omelette",
        "卵焼き",
        "starter",
        [
          { name: "eggs", quantity: 4, unit: "pieces" },
          { name: "dashi", quantity: 40, unit: "ml" },
          { name: "soy sauce", quantity: 10, unit: "ml" },
        ],
        {
          description:
            "A gently sweet rolled omelette sliced into bite-size pieces.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 10,
          cookMinutes: 10,
          difficulty: "medium",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Asahi / Japanese Lager",
        "ビール",
        "beer",
        true,
        "Crisp lager that pairs well with fried and grilled dishes.",
      ),
      drink(
        "Umeshu",
        "梅酒",
        "spirit",
        true,
        "Sweet plum liqueur served over ice or with soda.",
      ),
      drink(
        "Ramune",
        "ラムネ",
        "soft-drink",
        false,
        "Fizzy lemon-lime soda with a playful marble-bottle seal.",
      ),
    ],
  },
  status: "published",
};
