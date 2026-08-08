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
    starter: r(
      "pao-de-queijo",
      "Cheese Bread",
      "Pão de queijo",
      "starter",
      [
        { name: "tapioca flour (sour starch)", quantity: 300, unit: "g" },
        { name: "grated cheese", quantity: 180, unit: "g", note: "Parmesan or mature Gouda" },
        { name: "eggs", quantity: 2, unit: "pieces" },
        { name: "milk", quantity: 120, unit: "ml" },
        { name: "oil", quantity: 60, unit: "ml" },
      ],
      [
        "1. Warm milk and oil with a pinch of salt; pour over the tapioca flour and mix.",
        "2. Beat in eggs and cheese until a sticky dough forms.",
        "3. Roll into small balls and bake at 200°C until puffed and golden.",
        "4. Serve warm while the centres are still stretchy.",
      ],
      {
        description:
          "Chewy, gluten-free cheese rolls with a crisp shell and stretchy centre.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 25,
        difficulty: "easy",
        substitutions: [
          "Tapioca starch (manioc flour) is in Brazilian and health shops; mature Gouda mimics queijo minas.",
        ],
      },
    ),
    main: r(
      "feijoada",
      "Black Bean Stew",
      "Feijoada",
      "main",
      [
        { name: "dried black beans", quantity: 500, unit: "g" },
        { name: "pork shoulder", quantity: 600, unit: "g" },
        { name: "smoked sausage", quantity: 300, unit: "g" },
        { name: "bay leaves", quantity: 2, unit: "pieces" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "garlic", quantity: 4, unit: "cloves" },
        { name: "rice", quantity: 350, unit: "g" },
      ],
      [
        "1. Soak beans overnight; simmer with bay leaves until starting to soften.",
        "2. Brown pork and sausage, soften onion and garlic, then add to the beans.",
        "3. Simmer until the beans are creamy and the meat is tender (about 1.5–2 hours); mash a few beans for body.",
        "4. Serve with rice, orange slices, and farofa if you have it.",
      ],
      {
        description:
          "Brazil's best-known bean-and-pork stew, served with rice and bright accompaniments.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 30,
        cookMinutes: 150,
        difficulty: "medium",
        substitutions: [
          "Tinned black beans shorten cooking; smoked rookworst can stand in for Brazilian sausage.",
        ],
      },
    ),
    side: r(
      "farofa",
      "Toasted Cassava Crumbs",
      "Farofa",
      "side",
      [
        { name: "cassava flour (farinha)", quantity: 250, unit: "g" },
        { name: "butter", quantity: 50, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "garlic", quantity: 2, unit: "cloves" },
      ],
      [
        "1. Soften onion and garlic in butter until golden.",
        "2. Stir in cassava flour and toast over medium heat, stirring constantly.",
        "3. Cook until fragrant and slightly darker; season with salt.",
        "4. Serve dry as a crunchy sprinkle over stews.",
      ],
      {
        description:
          "Toasted cassava flour crumbs fried with onion for sprinkling over feijoada.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 15,
        difficulty: "easy",
        substitutions: [
          "Cassava / manioc flour is sold in Brazilian and Latin shops; do not substitute wheat flour.",
        ],
      },
    ),
    dessert: r(
      "brigadeiros",
      "Chocolate Truffles",
      "Brigadeiros",
      "dessert",
      [
        { name: "sweetened condensed milk", quantity: 400, unit: "g" },
        { name: "cocoa powder", quantity: 35, unit: "g" },
        { name: "butter", quantity: 25, unit: "g" },
        { name: "chocolate sprinkles", quantity: 80, unit: "g" },
      ],
      [
        "1. Cook condensed milk, cocoa, and butter over medium heat, stirring constantly.",
        "2. Continue until the mixture thickens and pulls away from the pan (about 10 minutes).",
        "3. Cool until handleable, then roll into small balls.",
        "4. Coat in chocolate sprinkles and chill briefly.",
      ],
      {
        description:
          "Fudgy condensed-milk chocolate truffles rolled in sprinkles.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 15,
        difficulty: "easy",
      },
    ),
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
          { name: "plain flour", quantity: 300, unit: "g" },
          { name: "chicken stock", quantity: 400, unit: "ml" },
          { name: "breadcrumbs", quantity: 150, unit: "g" },
          { name: "egg", quantity: 2, unit: "pieces" },
        ],
        [
          "1. Mix shredded chicken with cream cheese and seasoning for the filling.",
          "2. Cook flour into hot stock until a smooth dough forms; cool enough to handle.",
          "3. Wrap dough around filling into teardrop shapes, dip in egg, then breadcrumbs.",
          "4. Deep-fry until deep golden.",
        ],
        {
          description:
            "Teardrop croquettes of creamy shredded chicken wrapped in dough and fried crisp.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 40,
          cookMinutes: 25,
          difficulty: "challenging",
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
          { name: "tomatoes", quantity: 300, unit: "g" },
          { name: "dendê or palm oil", quantity: 30, unit: "ml" },
          { name: "lime", quantity: 2, unit: "pieces" },
          { name: "coriander", quantity: 20, unit: "g" },
        ],
        [
          "1. Season fish with lime and salt; layer with sliced peppers, onion, and tomato in a wide pot.",
          "2. Pour over coconut milk and dendê oil; bring to a gentle simmer.",
          "3. Cook without stirring hard until the fish flakes and the broth is rich.",
          "4. Finish with coriander and serve with rice.",
        ],
        {
          description:
            "Fish gently cooked with coconut milk, peppers, tomatoes, and dendê oil.",
          dietaryLabels: ["gluten-free"],
          prepMinutes: 20,
          cookMinutes: 30,
          difficulty: "medium",
          substitutions: [
            "Dendê oil is in African/Brazilian shops; a little smoked paprika in oil is a mild colour stand-in.",
          ],
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
        [
          "1. Melt sugar in a pan until amber caramel; coat a mould and swirl to cover.",
          "2. Blend condensed milk, milk, and eggs until smooth; pour into the mould.",
          "3. Bake in a water bath at 160°C until just set.",
          "4. Chill thoroughly, then invert onto a plate.",
        ],
        {
          description:
            "Silky condensed-milk flan with a dark caramel top, chilled until sliceable.",
          dietaryLabels: ["vegetarian", "gluten-free"],
          prepMinutes: 20,
          cookMinutes: 60,
          difficulty: "medium",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Cachaça",
        "Cachaça",
        "spirit",
        true,
        "Sugarcane spirit that is the base of the caipirinha.",
      ),
      drink(
        "Suco de Maracujá",
        "Suco de maracujá",
        "soft-drink",
        false,
        "Tart passion-fruit juice, often sweetened and served cold.",
      ),
    ],
  },
  status: "published",
};
