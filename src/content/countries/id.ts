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
    starter: r("gado-gado", "Vegetable Peanut Salad", "Gado-gado", "starter", [
      { name: "mixed vegetables", quantity: 600, unit: "g" },
      { name: "peanut sauce", quantity: 250, unit: "g" },
      { name: "tofu", quantity: 300, unit: "g" },
    ]),
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
      "Slow-cooked beef reduced in coconut and spices until intensely savoury.",
    ),
    side: r("nasi-kuning", "Turmeric Rice", "Nasi kuning", "side", [
      { name: "rice", quantity: 400, unit: "g" },
      { name: "coconut milk", quantity: 300, unit: "ml" },
      { name: "turmeric", quantity: 8, unit: "g" },
    ]),
    dessert: r("klepon", "Coconut Rice Cakes", "Klepon", "dessert", [
      { name: "glutinous rice flour", quantity: 250, unit: "g" },
      { name: "palm sugar", quantity: 150, unit: "g" },
      { name: "coconut", quantity: 150, unit: "g" },
    ]),
    drink: drink(
      "Jamu Kunyit Asam",
      "Jamu",
      "soft-drink",
      false,
      "Turmeric and tamarind tonic, sweetened and served chilled.",
    ),
  },
  status: "published",
};
