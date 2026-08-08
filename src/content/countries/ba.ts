import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const baCountry: AuthoredCountry = {
  code: "ba",
  slug: "bosnia-and-herzegovina",
  name: "Bosnia and Herzegovina",
  flag: "🇧🇦",
  region: "Europe",
  introduction:
    "Bosnian cooking is generous and grill-forward: ćevapi in somun, slow soups, stuffed vegetables, and sweet baklava. Ottoman and Balkan influences meet around shared trays and strong coffee.",
  cuisineAliases: [
    "Bosnian restaurant",
    "Bosnisch restaurant",
    "Balkan restaurant",
  ],
  nationalDishId: "cevapi",
  nationalDrink: drink(
    "Bosnian Coffee",
    "Bosanska kahva",
    "coffee",
    false,
    "Finely ground coffee boiled in a džezva and served unfiltered with sugar cubes — non-alcoholic.",
  ),
  menu: {
    starter: r(
      "begova-corba",
      "Bey’s Soup",
      "Begova čorba",
      "starter",
      [
        { name: "chicken", quantity: 600, unit: "g" },
        { name: "okra", quantity: 200, unit: "g" },
        { name: "carrot", quantity: 2, unit: "pieces" },
        { name: "celery root", quantity: 100, unit: "g" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "egg yolks", quantity: 2, unit: "pieces" },
        { name: "butter", quantity: 30, unit: "g" },
        { name: "plain flour", quantity: 30, unit: "g" },
      ],
      [
        "1. Simmer chicken with diced carrot and celery until tender; shred the meat and strain the broth.",
        "2. Soften okra briefly in butter, stir in flour, then whisk in hot broth to make a light soup.",
        "3. Return chicken, simmer gently, then temper egg yolks with lemon juice and stir in off the heat for a silky finish.",
      ],
      {
        description:
          "Velvety chicken and okra soup finished with lemon and egg — a classic Bosnian starter.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 25,
        cookMinutes: 50,
        difficulty: "medium",
        substitutions: [
          "Frozen okra works; skip the egg liaison for a simpler broth if preferred.",
        ],
      },
    ),
    main: r(
      "cevapi",
      "Ćevapi",
      "Ćevapi",
      "main",
      [
        { name: "minced beef", quantity: 600, unit: "g" },
        { name: "minced lamb", quantity: 200, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "baking soda", quantity: 3, unit: "g" },
        { name: "somun or flatbread", quantity: 4, unit: "pieces" },
        { name: "kaymak or sour cream", quantity: 150, unit: "g" },
        { name: "chopped raw onion", quantity: 1, unit: "piece" },
      ],
      [
        "1. Mix minces with grated onion, garlic, salt, pepper, and baking soda; knead well and chill at least 1 hour.",
        "2. Shape into finger-length sausages; grill or pan-sear over high heat until browned and just cooked through.",
        "3. Warm somun, stuff with ćevapi, chopped onion, and kaymak; serve immediately.",
      ],
      {
        description:
          "Skinless grilled minced-meat sausages tucked into flatbread with onion — Bosnia’s most iconic street meal.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 25,
        cookMinutes: 20,
        difficulty: "medium",
        substitutions: [
          "All-beef works if lamb is hard to find; Turkish shops sell somun-style bread and kaymak alternatives.",
        ],
      },
    ),
    side: r(
      "ajvar",
      "Ajvar",
      "Ajvar",
      "side",
      [
        { name: "red peppers", quantity: 800, unit: "g" },
        { name: "aubergine", quantity: 1, unit: "piece" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "oil", quantity: 60, unit: "ml" },
        { name: "white wine vinegar", quantity: 15, unit: "ml" },
      ],
      [
        "1. Roast peppers and aubergine until charred and soft; peel and remove seeds.",
        "2. Chop or pulse with garlic to a coarse paste; cook gently in oil until thickened and spreadable.",
        "3. Season with salt, vinegar, and a pinch of sugar; cool before serving.",
      ],
      {
        description:
          "Smoky roasted pepper relish that belongs beside ćevapi, bread, and grilled meats.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 50,
        difficulty: "easy",
        substitutions: [
          "Jarred ajvar from Balkan shops is fine when roasting season is short.",
        ],
      },
    ),
    dessert: r(
      "tufahija",
      "Poached Stuffed Apples",
      "Tufahija",
      "dessert",
      [
        { name: "apples", quantity: 4, unit: "pieces" },
        { name: "sugar", quantity: 200, unit: "g" },
        { name: "water", quantity: 600, unit: "ml" },
        { name: "walnuts", quantity: 100, unit: "g" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "whipped cream", quantity: 150, unit: "ml" },
      ],
      [
        "1. Peel and core the apples; simmer gently in sugar syrup with lemon juice until just tender but still holding shape.",
        "2. Cool the apples in the syrup; chop walnuts and mix with a spoon of syrup for the filling.",
        "3. Stuff the apples, chill, and top each with whipped cream before serving.",
      ],
      {
        description:
          "Whole apples poached in syrup, stuffed with walnuts, and crowned with cream — a Bosnian classic sweet.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 30,
        difficulty: "easy",
      },
    ),
    drink: drink(
      "Jogurt Drink",
      "Jogurt",
      "soft-drink",
      false,
      "Plain yogurt thinned with cold water and a pinch of salt — a non-alcoholic partner to grilled meat.",
    ),
    moreDrinks: [
      drink(
        "Šljivovica",
        "Šljivovica",
        "spirit",
        true,
        "Plum brandy that contains alcohol; traditionally offered with meze or after a meal.",
      ),
    ],
  },
  status: "published",
};
