import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const brCountry: AuthoredCountry = {
  code: "br",
  slug: "brazil",
  name: "Brazil",
  flag: "🇧🇷",
  region: "Americas",
  introduction:
    "Brazilian food combines Indigenous staples, African influence, Portuguese techniques, and huge regional variety. Beans, cassava, tropical fruit, grilled meat, and rice create satisfying everyday plates.",
  cuisineAliases: ["Brazilian restaurant", "Braziliaans restaurant", "churrascaria"],
  nationalDishId: "feijoada",
  nationalDrink: drink(
    "Caipirinha",
    "Caipirinha",
    "cocktail",
    true,
    "Cachaça muddled with lime and sugar over ice.",
  ),
  menu: {
    starter: r("pao-de-queijo", "Cheese Bread", "Pão de queijo", "starter", [
      { name: "tapioca flour", quantity: 300, unit: "g" },
      { name: "cheese", quantity: 180, unit: "g" },
      { name: "eggs", quantity: 2, unit: "pieces" },
    ]),
    main: r(
      "feijoada",
      "Black Bean Stew",
      "Feijoada",
      "main",
      [
        { name: "black beans", quantity: 500, unit: "g" },
        { name: "pork shoulder", quantity: 600, unit: "g" },
        { name: "smoked sausage", quantity: 300, unit: "g" },
        { name: "rice", quantity: 350, unit: "g" },
      ],
      "Brazil's best-known bean-and-pork stew, served with rice and bright accompaniments.",
    ),
    side: r("farofa", "Toasted Cassava Crumbs", "Farofa", "side", [
      { name: "cassava flour", quantity: 250, unit: "g" },
      { name: "butter", quantity: 50, unit: "g" },
      { name: "onion", quantity: 1, unit: "piece" },
    ]),
    dessert: r("brigadeiros", "Chocolate Truffles", "Brigadeiros", "dessert", [
      { name: "condensed milk", quantity: 400, unit: "g" },
      { name: "cocoa powder", quantity: 35, unit: "g" },
      { name: "butter", quantity: 25, unit: "g" },
    ]),
    drink: drink(
      "Guaraná",
      "Guaraná",
      "soft-drink",
      false,
      "Sweet, lightly fruity Brazilian soda made from guaraná.",
    ),
    moreRecipes: [
      r(
        "coxinha",
        "Chicken Coxinha",
        "Coxinha",
        "starter",
        [
          { name: "cooked chicken", quantity: 400, unit: "g" },
          { name: "cream cheese", quantity: 100, unit: "g" },
          { name: "flour", quantity: 300, unit: "g" },
          { name: "chicken stock", quantity: 400, unit: "ml" },
        ],
        {
          description:
            "Teardrop croquettes of creamy shredded chicken wrapped in dough and fried crisp.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Coxinha",
        },
      ),
      r(
        "moqueca",
        "Bahian Fish Stew",
        "Moqueca",
        "main",
        [
          { name: "firm white fish", quantity: 700, unit: "g" },
          { name: "coconut milk", quantity: 400, unit: "ml" },
          { name: "red pepper", quantity: 2, unit: "pieces" },
          { name: "dendê or palm oil", quantity: 30, unit: "ml" },
        ],
        {
          description:
            "Fish gently cooked with coconut milk, peppers, tomatoes, and dendê oil.",
          dietaryLabels: ["gluten-free"],
          sourceUrl: "https://en.wikipedia.org/wiki/Moqueca",
        },
      ),
      r(
        "pudim",
        "Brazilian Milk Pudding",
        "Pudim de leite",
        "dessert",
        [
          { name: "sweetened condensed milk", quantity: 395, unit: "g" },
          { name: "whole milk", quantity: 400, unit: "ml" },
          { name: "eggs", quantity: 3, unit: "pieces" },
          { name: "sugar", quantity: 150, unit: "g" },
        ],
        {
          description:
            "Silky condensed-milk flan with a dark caramel top, chilled until sliceable.",
          dietaryLabels: ["vegetarian", "gluten-free"],
          sourceUrl: "https://en.wikipedia.org/wiki/Crème_caramel",
        },
      ),
    ],
  },
  status: "published",
};
