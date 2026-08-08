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
    starter: r(
      "zurek",
      "Żurek",
      "Żurek",
      "starter",
      [
        { name: "sour rye starter (żur)", quantity: 500, unit: "ml" },
        { name: "white sausage", quantity: 300, unit: "g" },
        { name: "hard-boiled eggs", quantity: 4, unit: "pieces" },
        { name: "smoked bacon", quantity: 100, unit: "g" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "marjoram", quantity: 5, unit: "g" },
      ],
      [
        "1. Simmer white sausage in water or light stock until cooked; slice and reserve the liquid.",
        "2. Fry bacon until crisp, then soften garlic in the fat.",
        "3. Add the sour rye starter and enough cooking liquid for a soup; simmer gently with marjoram (do not boil hard).",
        "4. Return sausage, season, and serve with halved eggs.",
      ],
      {
        description:
          "Tangy sour-rye soup with white sausage, bacon, and hard-boiled egg.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 20,
        cookMinutes: 35,
        difficulty: "medium",
        substitutions: [
          "Bottled żurek starter is sold in Polish shops across the Netherlands; sauerkraut brine plus stock is an emergency stand-in.",
        ],
      },
    ),
    main: r(
      "pierogi",
      "Pierogi",
      "Pierogi",
      "main",
      [
        { name: "plain flour", quantity: 400, unit: "g" },
        { name: "potato", quantity: 500, unit: "g" },
        { name: "farmer cheese or twaróg", quantity: 250, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "egg", quantity: 1, unit: "piece" },
        { name: "butter", quantity: 40, unit: "g" },
      ],
      [
        "1. Boil and mash potatoes; mix with crumbled cheese, salt, and pepper for the filling.",
        "2. Knead flour, egg, a pinch of salt, and warm water into a soft dough; rest 20 minutes.",
        "3. Roll thin, cut rounds, fill, and seal firmly into half-moons.",
        "4. Boil until they float plus 1–2 minutes; serve with butter-fried onions.",
      ],
      {
        description:
          "Filled dumplings that are widely considered Poland's most iconic comfort food.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 45,
        cookMinutes: 25,
        difficulty: "medium",
        substitutions: [
          "Quark or drained cottage cheese stands in for twaróg in Dutch shops.",
        ],
      },
    ),
    side: r(
      "sauerkraut",
      "Braised Sauerkraut",
      "Kapusta kiszona",
      "side",
      [
        { name: "sauerkraut", quantity: 500, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "caraway seeds", quantity: 5, unit: "g" },
        { name: "bay leaf", quantity: 1, unit: "piece" },
        { name: "apple", quantity: 1, unit: "piece", note: "optional" },
      ],
      [
        "1. Rinse the sauerkraut lightly if very sharp, then drain.",
        "2. Soften onion in oil or butter, add caraway and bay leaf.",
        "3. Stir in sauerkraut with a splash of water and grated apple; braise covered 30–40 minutes until tender.",
      ],
      {
        description:
          "Slow-braised sauerkraut softened with onion, caraway, and a touch of apple.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 10,
        cookMinutes: 40,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "paczki",
      "Pączki",
      "Pączki",
      "dessert",
      [
        { name: "plain flour", quantity: 400, unit: "g" },
        { name: "yeast", quantity: 10, unit: "g" },
        { name: "milk", quantity: 200, unit: "ml" },
        { name: "egg yolks", quantity: 4, unit: "pieces" },
        { name: "butter", quantity: 60, unit: "g" },
        { name: "rose jam or plum jam", quantity: 200, unit: "g" },
        { name: "oil", quantity: 1, unit: "litre", note: "for frying" },
      ],
      [
        "1. Make a rich yeast dough with flour, warm milk, yolks, sugar, and melted butter; rise until doubled.",
        "2. Roll, cut rounds, add a spoon of jam, seal, and rise again.",
        "3. Fry in oil at about 170°C until deep golden on both sides.",
        "4. Drain and dust with icing sugar.",
      ],
      {
        description:
          "Rich yeast doughnuts filled with rose or plum jam and dusted with sugar.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 40,
        cookMinutes: 25,
        difficulty: "challenging",
        substitutions: [
          "Rose petal jam is traditional; raspberry or plum jam from Dutch shops works well.",
        ],
      },
    ),
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
          { name: "dried mushrooms", quantity: 20, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
        ],
        [
          "1. Soak dried mushrooms; brown pork and sausage in a heavy pot.",
          "2. Soften onion, add shredded cabbage, sauerkraut, mushrooms, and a little of the soaking liquid.",
          "3. Simmer gently at least 1.5 hours (better overnight and reheated), stirring occasionally.",
          "4. Season with bay, allspice, and black pepper; serve with bread.",
        ],
        {
          description:
            "Long-simmered sauerkraut and fresh cabbage with assorted meats and sausage.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 30,
          cookMinutes: 120,
          difficulty: "medium",
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
          { name: "onion", quantity: 1, unit: "piece" },
        ],
        [
          "1. Blanch whole cabbage leaves until pliable; trim thick ribs.",
          "2. Mix mince with cooked rice, softened onion, and seasoning; roll into the leaves.",
          "3. Pack rolls in a dish, cover with passata thinned with a little stock, and bake at 180°C for about 1 hour.",
          "4. Serve with the tomato sauce spooned over.",
        ],
        {
          description:
            "Cabbage leaves filled with rice and meat, baked in tomato sauce.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 40,
          cookMinutes: 70,
          difficulty: "medium",
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
          { name: "vanilla", quantity: 5, unit: "ml" },
          { name: "digestive biscuits", quantity: 150, unit: "g", note: "for base" },
        ],
        [
          "1. Crush biscuits with melted butter and press into a tin; chill briefly.",
          "2. Beat cheese with sugar, eggs, melted butter, and vanilla until smooth.",
          "3. Pour over the base and bake at 160°C until just set with a slight wobble.",
          "4. Cool completely before slicing.",
        ],
        {
          description:
            "Baked cheesecake of twaróg-style cheese, often on a crumbly base.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 25,
          cookMinutes: 55,
          difficulty: "medium",
          substitutions: [
            "Polish twaróg is ideal; quark mixed with a little cream cheese is a close Dutch alternative.",
          ],
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Żywiec / Polish Lager",
        "Piwo",
        "beer",
        true,
        "Crisp lager that suits pierogi, bigos, and pub snacks.",
      ),
      drink(
        "Krupnik",
        "Krupnik",
        "spirit",
        true,
        "Honey-spiced vodka liqueur served warm or chilled.",
      ),
    ],
  },
  status: "published",
};
