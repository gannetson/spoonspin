import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const amCountry: AuthoredCountry = {
  code: "am",
  slug: "armenia",
  name: "Armenia",
  flag: "🇦🇲",
  region: "Asia",
  introduction:
    "Armenian cooking celebrates lavash, grilled meats, fresh herbs, yogurt, and stuffed vegetables. Tables often hold khorovats, bright salads, and sweets such as gata for gatherings.",
  cuisineAliases: [
    "Armenian restaurant",
    "Armeens restaurant",
    "Caucasus restaurant",
  ],
  nationalDishId: "khorovats",
  nationalDrink: drink(
    "Armenian Brandy",
    "Կոնյակ",
    "spirit",
    true,
    "Oak-aged grape brandy that contains alcohol; traditionally sipped neat after meals.",
  ),
  menu: {
    starter: r(
      "spas",
      "Yogurt Soup",
      "Սպաս",
      "starter",
      [
        { name: "plain yogurt", quantity: 500, unit: "g" },
        { name: "egg", quantity: 1, unit: "piece" },
        { name: "wheat berries or pearl barley", quantity: 80, unit: "g", note: "cooked" },
        { name: "fresh coriander", quantity: 20, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "butter", quantity: 20, unit: "g" },
        { name: "flour", quantity: 15, unit: "g" },
      ],
      [
        "1. Whisk yogurt with egg and flour until smooth; warm gently with a little water, stirring so it does not split.",
        "2. Soften onion in butter; add cooked wheat berries and the warm yogurt base.",
        "3. Simmer briefly, season with salt, and finish with lots of chopped coriander; serve warm or chilled.",
      ],
      {
        description:
          "Tangy yogurt soup with wheat berries and herbs — a restorative Armenian starter.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 15,
        cookMinutes: 25,
        difficulty: "easy",
        substitutions: [
          "Pearl barley from Dutch shops stands in for wheat berries; keep heat low to avoid curdling.",
        ],
      },
    ),
    main: r(
      "khorovats",
      "Armenian Barbecue",
      "Խորոված",
      "main",
      [
        { name: "pork or lamb shoulder", quantity: 1000, unit: "g" },
        { name: "onion", quantity: 3, unit: "pieces" },
        { name: "tomato", quantity: 4, unit: "pieces" },
        { name: "aubergine", quantity: 2, unit: "pieces" },
        { name: "bell pepper", quantity: 2, unit: "pieces" },
        { name: "garlic", quantity: 4, unit: "cloves" },
        { name: "coriander seeds", quantity: 5, unit: "g" },
        { name: "oil", quantity: 40, unit: "ml" },
      ],
      [
        "1. Cube the meat, toss with grated onion, garlic, oil, crushed coriander, salt, and pepper; marinate at least 2 hours.",
        "2. Thread meat onto skewers; grill over charcoal or a hot grill, turning until browned and just cooked.",
        "3. Grill whole vegetables alongside until blistered; peel lightly and dress with salt and oil.",
        "4. Serve meat and vegetables together with lavash and fresh herbs.",
      ],
      {
        description:
          "Charcoal-grilled skewered meat with blistered vegetables — Armenia’s iconic shared barbecue feast.",
        dietaryLabels: ["contains-meat", "gluten-free", "dairy-free"],
        prepMinutes: 25,
        cookMinutes: 35,
        difficulty: "medium",
        substitutions: [
          "Chicken thighs also work; a kettle barbecue or oven grill can replace charcoal.",
        ],
      },
    ),
    side: r(
      "eech",
      "Armenian Bulgur Salad",
      "Էչ",
      "side",
      [
        { name: "fine bulgur", quantity: 200, unit: "g" },
        { name: "tomato", quantity: 3, unit: "pieces" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "tomato paste", quantity: 30, unit: "g" },
        { name: "parsley", quantity: 30, unit: "g" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "olive oil", quantity: 45, unit: "ml" },
      ],
      [
        "1. Soften onion in oil, stir in tomato paste and chopped tomato until saucy.",
        "2. Pour over bulgur with hot water just to cover; cover and steam off heat until tender.",
        "3. Fluff with lemon juice, salt, and chopped parsley; serve warm or at room temperature.",
      ],
      {
        description:
          "Tomato-rich bulgur salad that acts as a bright, hearty side to grilled meats.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 15,
        cookMinutes: 20,
        difficulty: "easy",
        substitutions: [
          "Fine bulgur is in Turkish shops; couscous is not traditional but works in a pinch.",
        ],
      },
    ),
    dessert: r(
      "gata",
      "Gata",
      "Գաթա",
      "dessert",
      [
        { name: "plain flour", quantity: 400, unit: "g" },
        { name: "butter", quantity: 200, unit: "g" },
        { name: "sour cream or yogurt", quantity: 150, unit: "g" },
        { name: "sugar", quantity: 150, unit: "g" },
        { name: "egg", quantity: 1, unit: "piece" },
        { name: "vanilla", quantity: 5, unit: "ml" },
        { name: "baking powder", quantity: 5, unit: "g" },
      ],
      [
        "1. Rub cold butter into flour with baking powder; mix in sour cream to a soft dough and chill briefly.",
        "2. Make a filling of soft butter, sugar, a spoon of flour, and vanilla until crumbly-sweet.",
        "3. Roll dough, spread filling, roll up or fold into a round, score the top, and brush with egg.",
        "4. Bake at 180°C until golden, about 30–35 minutes; cool before slicing.",
      ],
      {
        description:
          "Buttery sweet bread with a sugar filling — Armenia’s best-known celebratory pastry.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 30,
        cookMinutes: 35,
        difficulty: "medium",
      },
    ),
    drink: drink(
      "Tan",
      "Թան",
      "soft-drink",
      false,
      "Salted yogurt drink diluted with cold water — non-alcoholic and cooling with khorovats.",
    ),
    moreDrinks: [
      drink(
        "Armenian Pomegranate Wine",
        "Նռան գինի",
        "wine",
        true,
        "Fruit wine made from pomegranates that contains alcohol; sweet-tart and best chilled.",
      ),
    ],
  },
  status: "published",
};
