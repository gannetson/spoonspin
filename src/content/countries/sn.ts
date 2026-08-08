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
    moreRecipes: [
      r(
        "yassa-poulet",
        "Chicken Yassa",
        "Yassa poulet",
        "main",
        [
          { name: "chicken pieces", quantity: 1000, unit: "g" },
          { name: "onions", quantity: 4, unit: "pieces" },
          { name: "lemons", quantity: 3, unit: "pieces" },
          { name: "Dijon mustard", quantity: 30, unit: "g" },
        ],
        {
          description:
            "Onion-lemon marinated chicken grilled then simmered in a tangy caramelised sauce.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Yassa_(food)",
        },
      ),
      r(
        "maafe",
        "Peanut Stew",
        "Mafé",
        "main",
        [
          { name: "beef or chicken", quantity: 700, unit: "g" },
          { name: "natural peanut butter", quantity: 150, unit: "g" },
          { name: "tomato paste", quantity: 60, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
        ],
        {
          description:
            "Rich peanut and tomato stew with tender meat or vegetables, served over rice.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Maafe",
        },
      ),
      r(
        "fataya",
        "Fish Pastries",
        "Fataya",
        "snack",
        [
          { name: "flour", quantity: 300, unit: "g" },
          { name: "cooked flaked fish", quantity: 250, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "parsley", quantity: 20, unit: "g" },
        ],
        {
          description:
            "Crisp half-moon pastries filled with seasoned fish, onion, and herbs.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Senegalese_cuisine",
        },
      ),
    ],
  },
  status: "published",
};
