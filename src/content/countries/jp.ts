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
        { name: "silken tofu", quantity: 200, unit: "g" },
        { name: "spring onions", quantity: 2, unit: "pieces" },
        { name: "wakame seaweed", quantity: 5, unit: "g", note: "dried" },
      ],
      [
        "1. Soak wakame in cold water until soft, then drain.",
        "2. Bring dashi to a gentle simmer; cube tofu and warm it through without boiling hard.",
        "3. Ladle a little hot stock into a bowl, whisk in miso until smooth, then stir back into the pot off the heat.",
        "4. Add wakame and sliced spring onions; serve immediately so the miso stays fragrant.",
      ],
      {
        description:
          "A light everyday soup of dashi and miso with soft tofu and wakame.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 10,
        cookMinutes: 10,
        difficulty: "easy",
        substitutions: [
          "Instant dashi powder works if you cannot find liquid dashi; white or red miso from Asian grocers is fine.",
        ],
      },
    ),
    main: r(
      "japanese-curry-rice",
      "Japanese Curry Rice",
      "カレーライス",
      "main",
      [
        { name: "beef stewing meat", quantity: 600, unit: "g" },
        { name: "Japanese curry roux", quantity: 180, unit: "g" },
        { name: "Japanese short-grain rice", quantity: 400, unit: "g" },
        { name: "potatoes", quantity: 400, unit: "g" },
        { name: "carrots", quantity: 250, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
      ],
      [
        "1. Cook the rinsed rice and keep warm.",
        "2. Brown the cubed beef in a little oil, then soften sliced onion in the same pot.",
        "3. Add carrot and potato chunks with water to cover; simmer until the vegetables are tender.",
        "4. Turn off the heat, dissolve curry roux blocks into the stew, then simmer gently 5 minutes until thick and glossy.",
        "5. Spoon the curry beside or over rice and serve hot.",
      ],
      {
        description:
          "A thick, mild-sweet Japanese curry of beef and vegetables over steamed rice.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 20,
        cookMinutes: 45,
        difficulty: "easy",
        substitutions: [
          "Japanese curry blocks (e.g. Golden Curry) are sold in many Dutch Asian shops; chicken or minced beef also works.",
        ],
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
        { name: "sugar", quantity: 20, unit: "g" },
        { name: "soy sauce", quantity: 10, unit: "ml" },
        { name: "sesame seeds", quantity: 15, unit: "g" },
      ],
      [
        "1. Thinly slice the cucumbers, toss with a pinch of salt, rest 10 minutes, then squeeze out liquid.",
        "2. Stir rice vinegar with sugar and soy until dissolved.",
        "3. Dress the cucumber, chill briefly, and finish with toasted sesame seeds.",
      ],
      {
        description:
          "Cool, lightly sweet cucumber ribbons dressed in rice vinegar and sesame.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "mochi",
      "Mochi",
      "餅",
      "dessert",
      [
        { name: "glutinous rice flour (mochiko)", quantity: 250, unit: "g" },
        { name: "sugar", quantity: 100, unit: "g" },
        { name: "water", quantity: 240, unit: "ml" },
        { name: "red bean paste (anko)", quantity: 250, unit: "g" },
        { name: "potato starch or cornflour", quantity: 50, unit: "g", note: "for dusting" },
      ],
      [
        "1. Whisk glutinous rice flour, sugar, and water in a microwave-safe bowl until smooth.",
        "2. Cover loosely and microwave in 1-minute bursts, stirring between, until the dough turns translucent and sticky (about 3–4 minutes).",
        "3. Dust a board with starch, tip out the hot dough, and flatten gently while still warm.",
        "4. Cut into squares, wrap each around a spoonful of red bean paste, and roll in starch so they do not stick.",
      ],
      {
        description:
          "Chewy homemade rice cakes filled with sweet red bean paste.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 20,
        cookMinutes: 10,
        difficulty: "medium",
        substitutions: [
          "Mochiko and anko are sold in Asian grocers; cornflour can dust if potato starch is unavailable.",
        ],
      },
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
          { name: "plain flour", quantity: 150, unit: "g" },
          { name: "eggs", quantity: 2, unit: "pieces" },
          { name: "dashi or water", quantity: 120, unit: "ml" },
          { name: "pork belly slices", quantity: 200, unit: "g" },
          { name: "okonomiyaki sauce", quantity: 60, unit: "ml" },
          { name: "mayonnaise", quantity: 40, unit: "ml" },
        ],
        [
          "1. Shred cabbage finely and mix with flour, eggs, and dashi into a loose batter.",
          "2. Oil a frying pan, pour in a thick round of batter, and lay pork belly on top.",
          "3. Cook until the underside is golden, flip carefully, and cook through.",
          "4. Brush with okonomiyaki sauce, zigzag mayonnaise, and serve hot.",
        ],
        {
          description:
            "A savoury cabbage pancake finished with sauce, mayo, and optional katsuobushi.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 20,
          cookMinutes: 20,
          difficulty: "medium",
          substitutions: [
            "Mix ketchup, Worcestershire, and a little soy if you lack okonomiyaki sauce.",
          ],
        },
      ),
      r(
        "onigiri",
        "Onigiri Rice Balls",
        "おにぎり",
        "snack",
        [
          { name: "cooked Japanese rice", quantity: 500, unit: "g", note: "warm" },
          { name: "nori sheets", quantity: 4, unit: "pieces" },
          { name: "salted salmon", quantity: 120, unit: "g", note: "flaked" },
          { name: "salt", quantity: 5, unit: "g" },
        ],
        [
          "1. Wet your hands, rub with a little salt, and scoop a handful of warm rice.",
          "2. Press a dent in the centre, add flaked salmon, and close the rice around it.",
          "3. Shape into a firm triangle or ball, then wrap a strip of nori around the base.",
          "4. Serve the same day while the rice is still soft.",
        ],
        {
          description:
            "Hand-shaped rice snacks wrapped in nori with a savoury filling.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 15,
          cookMinutes: 0,
          difficulty: "easy",
          substitutions: [
            "Tuna mayo, pickled plum (umeboshi), or seasoned seaweed make easy fillings.",
          ],
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
          { name: "sugar", quantity: 10, unit: "g" },
          { name: "neutral oil", quantity: 15, unit: "ml" },
        ],
        [
          "1. Beat eggs with dashi, soy, and sugar until just combined.",
          "2. Heat a lightly oiled pan (rectangular if you have one) over medium heat.",
          "3. Pour a thin layer of egg, roll it to one side when set, then pour more egg under and around the roll.",
          "4. Repeat until the eggs are used; rest briefly, then slice into bite-size pieces.",
        ],
        {
          description:
            "A gently sweet rolled omelette sliced into neat bite-size pieces.",
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
