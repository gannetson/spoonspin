import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const alCountry: AuthoredCountry = {
  code: "al",
  slug: "albania",
  name: "Albania",
  flag: "🇦🇱",
  region: "Europe",
  introduction:
    "Albanian cooking mixes Mediterranean olive oil and grilled fish with Balkan yogurt, peppers, and slow-baked meats. Tavë kosi, byrek, and fresh salads are everyday favourites.",
  cuisineAliases: [
    "Albanian restaurant",
    "Albanees restaurant",
    "Balkan restaurant",
  ],
  nationalDishId: "tave-kosi",
  nationalDrink: drink(
    "Raki",
    "Raki",
    "spirit",
    true,
    "Grape or fruit brandy that contains alcohol; often homemade and offered as a welcome drink.",
  ),
  menu: {
    starter: r(
      "byrek",
      "Spinach Byrek",
      "Byrek me spinaq",
      "starter",
      [
        { name: "filo pastry", quantity: 250, unit: "g" },
        { name: "spinach", quantity: 400, unit: "g" },
        { name: "feta or white cheese", quantity: 200, unit: "g" },
        { name: "egg", quantity: 2, unit: "pieces" },
        { name: "spring onion", quantity: 3, unit: "pieces" },
        { name: "olive oil or butter", quantity: 80, unit: "ml" },
      ],
      [
        "1. Wilt spinach, squeeze dry, and mix with crumbled cheese, eggs, chopped spring onion, salt, and pepper.",
        "2. Layer filo sheets in a greased tin, brushing each with oil, and spread filling in the middle layers.",
        "3. Finish with more oiled filo, score diamonds, and bake at 180°C until deep golden, about 35–40 minutes.",
        "4. Rest 10 minutes before cutting so the layers set.",
      ],
      {
        description:
          "Flaky filo pie filled with spinach and salted cheese — Albania’s everyday pastry starter.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 25,
        cookMinutes: 40,
        difficulty: "medium",
        substitutions: [
          "Frozen filo from Dutch shops works; ricotta plus feta approximates Balkan white cheese.",
        ],
      },
    ),
    main: r(
      "tave-kosi",
      "Lamb Baked with Yogurt",
      "Tavë kosi",
      "main",
      [
        { name: "lamb shoulder", quantity: 900, unit: "g" },
        { name: "plain yogurt", quantity: 600, unit: "g" },
        { name: "eggs", quantity: 3, unit: "pieces" },
        { name: "butter", quantity: 60, unit: "g" },
        { name: "plain flour", quantity: 40, unit: "g" },
        { name: "rice", quantity: 80, unit: "g" },
        { name: "garlic", quantity: 4, unit: "cloves" },
        { name: "oregano", quantity: 5, unit: "g" },
      ],
      [
        "1. Brown lamb pieces in butter with garlic and oregano; add a little water and simmer until nearly tender.",
        "2. Scatter rinsed rice around the meat in a baking dish.",
        "3. Whisk yogurt with eggs, melted butter, and flour; pour over the lamb and rice.",
        "4. Bake at 180°C until the yogurt topping is set and golden, about 40–45 minutes; rest briefly before serving.",
      ],
      {
        description:
          "Lamb and rice baked under a tangy yogurt custard — widely considered Albania’s national comfort dish.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 25,
        cookMinutes: 90,
        difficulty: "medium",
        substitutions: [
          "Chicken thighs are a lighter home variation; full-fat yogurt prevents splitting.",
        ],
      },
    ),
    side: r(
      "fergese",
      "Peppers with Cottage Cheese",
      "Fërgesë",
      "side",
      [
        { name: "red peppers", quantity: 4, unit: "pieces" },
        { name: "tomato", quantity: 3, unit: "pieces" },
        { name: "cottage cheese or gjizë", quantity: 250, unit: "g" },
        { name: "feta", quantity: 100, unit: "g" },
        { name: "butter", quantity: 40, unit: "g" },
        { name: "flour", quantity: 20, unit: "g" },
        { name: "chili flakes", quantity: 2, unit: "g", note: "optional" },
      ],
      [
        "1. Roast and peel the peppers; chop with tomato.",
        "2. Soften the vegetables in butter, stir in flour briefly, then fold in cottage cheese and crumbled feta.",
        "3. Bake or simmer until thick and bubbling; finish with chili if you like heat.",
      ],
      {
        description:
          "Soft roasted peppers bound with creamy cheese — a Tirana favourite side or light main.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 20,
        cookMinutes: 35,
        difficulty: "easy",
        substitutions: [
          "Dutch hüttenkäse or ricotta stands in for gjizë; skip flour for a looser gluten-free version.",
        ],
      },
    ),
    dessert: r(
      "trilece",
      "Trileçe",
      "Trileçe",
      "dessert",
      [
        { name: "eggs", quantity: 5, unit: "pieces" },
        { name: "sugar", quantity: 150, unit: "g" },
        { name: "plain flour", quantity: 120, unit: "g" },
        { name: "baking powder", quantity: 8, unit: "g" },
        { name: "milk", quantity: 250, unit: "ml" },
        { name: "evaporated milk", quantity: 200, unit: "ml" },
        { name: "cream", quantity: 200, unit: "ml" },
        { name: "caramel sauce", quantity: 100, unit: "g" },
      ],
      [
        "1. Whip eggs and sugar until thick; fold in flour and baking powder; bake in a greased tin at 180°C until springy.",
        "2. Cool slightly, poke holes all over, and soak with a mix of milk, evaporated milk, and cream.",
        "3. Chill until fully absorbed; top with whipped cream and a drizzle of caramel before serving.",
      ],
      {
        description:
          "Light sponge soaked in three milks and finished with caramel — a modern Balkan favourite in Albania.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 25,
        cookMinutes: 35,
        difficulty: "medium",
        substitutions: [
          "Evaporated milk is in most Dutch supermarkets; dulce de leche works as caramel topping.",
        ],
      },
    ),
    drink: drink(
      "Boza",
      "Boza",
      "soft-drink",
      false,
      "Mildly fermented corn or wheat drink that is traditionally non-alcoholic when lightly fermented and served chilled.",
    ),
    moreDrinks: [
      drink(
        "Albanian Red Wine",
        "Verë e kuqe",
        "wine",
        true,
        "Local red wine that contains alcohol; pairs naturally with tavë kosi and grilled meats.",
      ),
    ],
  },
  status: "published",
};
