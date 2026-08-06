import type { Country } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const idCountry: Country = {
  code: "id",
  slug: "indonesia",
  name: "Indonesia",
  flag: "🇮🇩",
  region: "Asia",
  introduction:
    "Indonesian cooking layers chile, aromatics, coconut, and fermented condiments across thousands of islands. Rice anchors meals that balance sweet, salty, tangy, and spicy flavours.",
  cuisineAliases: [
    "Indonesian restaurant",
    "Indonesisch restaurant",
    "Indische restaurant",
  ],
  nationalDishId: "rendang",
  nationalDrink: drink(
    "Teh Botol",
    "Teh botol",
    "tea",
    false,
    "Sweet jasmine tea served cold from a bottle.",
  ),
  menu: {
    starter: r(
      "gado-gado",
      "Vegetable Peanut Salad",
      "Gado-gado",
      "starter",
      [
        { name: "mixed vegetables", quantity: 600, unit: "g" },
        { name: "peanut sauce", quantity: 250, unit: "g" },
        { name: "tofu", quantity: 300, unit: "g" },
      ],
      { dietaryLabels: ["vegetarian"] },
    ),
    main: r(
      "rendang",
      "Beef Rendang",
      "Rendang",
      "main",
      [
        { name: "beef chuck", quantity: 900, unit: "g" },
        { name: "coconut milk", quantity: 800, unit: "ml" },
        { name: "lemongrass", quantity: 3, unit: "stalks" },
        { name: "chile paste", quantity: 40, unit: "g" },
      ],
      {
        description:
          "Slow-cooked beef reduced in coconut and spices until intensely savoury.",
        dietaryLabels: ["contains-meat"],
      },
    ),
    side: r(
      "nasi-kuning",
      "Turmeric Rice",
      "Nasi kuning",
      "side",
      [
        { name: "rice", quantity: 400, unit: "g" },
        { name: "coconut milk", quantity: 300, unit: "ml" },
        { name: "turmeric", quantity: 8, unit: "g" },
      ],
      { dietaryLabels: ["vegetarian", "vegan"] },
    ),
    dessert: r(
      "klepon",
      "Coconut Rice Cakes",
      "Klepon",
      "dessert",
      [
        { name: "glutinous rice flour", quantity: 250, unit: "g" },
        { name: "palm sugar", quantity: 150, unit: "g" },
        { name: "coconut", quantity: 150, unit: "g" },
      ],
      { dietaryLabels: ["vegetarian", "vegan"] },
    ),
    drink: drink(
      "Jamu Kunyit Asam",
      "Jamu",
      "soft-drink",
      false,
      "Turmeric and tamarind tonic, sweetened and served chilled.",
    ),
    moreRecipes: [
      r(
        "sate-ayam",
        "Chicken Satay",
        "Sate ayam",
        "main",
        [
          { name: "chicken thigh", quantity: 700, unit: "g" },
          { name: "ketjap manis", quantity: 60, unit: "ml" },
          { name: "peanut sauce", quantity: 250, unit: "g" },
        ],
        {
          description:
            "Grilled skewers glazed with sweet soy and served with peanut sauce.",
          dietaryLabels: ["contains-meat"],
        },
      ),
      r(
        "sambal-goreng-tempe",
        "Tempeh Sambal",
        "Sambal goreng tempe",
        "side",
        [
          { name: "tempeh", quantity: 400, unit: "g" },
          { name: "shallots", quantity: 100, unit: "g" },
          { name: "sambal", quantity: 40, unit: "g" },
        ],
        {
          description:
            "Crisp tempeh tossed in a fragrant chile relish for rice-table spreads.",
          dietaryLabels: ["vegetarian", "vegan"],
        },
      ),
      r(
        "pisang-goreng",
        "Fried Banana",
        "Pisang goreng",
        "dessert",
        [
          { name: "ripe bananas", quantity: 4, unit: "pieces" },
          { name: "flour", quantity: 150, unit: "g" },
          { name: "coconut milk", quantity: 120, unit: "ml" },
        ],
        {
          description:
            "Batter-fried bananas, crisp outside and soft within.",
          dietaryLabels: ["vegetarian", "vegan"],
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Bintang Beer",
        "Bir Bintang",
        "beer",
        true,
        "A light Indonesian lager popular with spicy dishes.",
      ),
      drink(
        "Es Cendol",
        "Es cendol",
        "soft-drink",
        false,
        "Iced coconut drink with green rice-flour jelly and palm sugar.",
      ),
      drink(
        "Arak Bali",
        "Arak",
        "spirit",
        true,
        "Traditional distilled spirit; often sipped carefully with food.",
      ),
    ],
  },
  status: "published",
};
