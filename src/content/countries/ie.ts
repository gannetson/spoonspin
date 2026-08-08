import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const ieCountry: AuthoredCountry = {
  code: "ie",
  slug: "ireland",
  name: "Ireland",
  flag: "🇮🇪",
  region: "Europe",
  introduction:
    "Irish cooking is hearty and seasonal: slow stews, soda bread, potatoes in every form, and excellent dairy. Coastal chowders and a pint of stout sit beside simple farmhouse sweets.",
  cuisineAliases: [
    "Irish restaurant",
    "Iers restaurant",
    "Irish pub food",
  ],
  nationalDishId: "irish-stew",
  nationalDrink: drink(
    "Irish Stout",
    "Stout",
    "beer",
    true,
    "Dark creamy stout such as Guinness that contains alcohol; pour slowly and let the head settle.",
  ),
  menu: {
    starter: r(
      "seafood-chowder",
      "Seafood Chowder",
      "Seafood Chowder",
      "starter",
      [
        { name: "mixed fish and shellfish", quantity: 500, unit: "g" },
        { name: "potato", quantity: 300, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "celery", quantity: 2, unit: "stalks" },
        { name: "smoked fish", quantity: 100, unit: "g", note: "optional" },
        { name: "milk", quantity: 400, unit: "ml" },
        { name: "cream", quantity: 150, unit: "ml" },
        { name: "butter", quantity: 40, unit: "g" },
        { name: "bay leaf", quantity: 1, unit: "piece" },
      ],
      [
        "1. Soften onion and celery in butter; add diced potato, bay leaf, and enough water or light stock to cover; simmer until tender.",
        "2. Add milk and chunks of white fish; cook gently until just opaque.",
        "3. Stir in shellfish and smoked fish for the last few minutes; finish with cream, salt, pepper, and parsley.",
        "4. Serve with soda bread for dipping.",
      ],
      {
        description:
          "Creamy coastal soup of fish, shellfish, and potato — a pub and harbour classic across Ireland.",
        dietaryLabels: ["contains-seafood"],
        prepMinutes: 20,
        cookMinutes: 35,
        difficulty: "easy",
        substitutions: [
          "Use frozen mixed seafood and a piece of smoked mackerel from Dutch fish counters.",
        ],
      },
    ),
    main: r(
      "irish-stew",
      "Irish Stew",
      "Stobhach Gaelach",
      "main",
      [
        { name: "lamb shoulder or neck", quantity: 900, unit: "g" },
        { name: "potato", quantity: 800, unit: "g" },
        { name: "onion", quantity: 3, unit: "pieces" },
        { name: "carrot", quantity: 3, unit: "pieces" },
        { name: "fresh thyme", quantity: 5, unit: "g" },
        { name: "parsley", quantity: 20, unit: "g" },
        { name: "lamb or chicken stock", quantity: 800, unit: "ml" },
      ],
      [
        "1. Brown lamb pieces lightly if you like a deeper flavour (optional for a pale traditional stew).",
        "2. Layer meat with sliced onion, carrot, and half the potatoes in a heavy pot; add thyme and stock to cover.",
        "3. Simmer covered 1½–2 hours until the lamb is tender; add remaining potato chunks for the last 30 minutes.",
        "4. Season well and finish with chopped parsley; the stew should be brothy, not flour-thickened.",
      ],
      {
        description:
          "Simple lamb, potato, and onion stew — Ireland’s best-known home-cooked national comfort dish.",
        dietaryLabels: ["contains-meat", "gluten-free", "dairy-free"],
        prepMinutes: 20,
        cookMinutes: 120,
        difficulty: "easy",
        substitutions: [
          "Stewing beef works when lamb is pricey; keep the potato-heavy, lightly seasoned character.",
        ],
      },
    ),
    side: r(
      "colcannon",
      "Colcannon",
      "Cál Ceannann",
      "side",
      [
        { name: "floury potatoes", quantity: 900, unit: "g" },
        { name: "cabbage or kale", quantity: 300, unit: "g" },
        { name: "butter", quantity: 80, unit: "g" },
        { name: "milk or cream", quantity: 100, unit: "ml" },
        { name: "spring onions", quantity: 4, unit: "pieces" },
      ],
      [
        "1. Boil potatoes until soft; mash with warm milk and most of the butter.",
        "2. Wilt shredded cabbage or kale in a little butter with chopped spring onion.",
        "3. Fold greens into the mash, season generously, and make a well for a knob of melting butter.",
      ],
      {
        description:
          "Buttery mashed potato folded with cabbage or kale — the iconic Irish side.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 30,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "apple-cake",
      "Irish Apple Cake",
      "Irish Apple Cake",
      "dessert",
      [
        { name: "plain flour", quantity: 300, unit: "g" },
        { name: "butter", quantity: 150, unit: "g" },
        { name: "sugar", quantity: 120, unit: "g" },
        { name: "eggs", quantity: 2, unit: "pieces" },
        { name: "baking powder", quantity: 10, unit: "g" },
        { name: "cooking apples", quantity: 400, unit: "g" },
        { name: "milk", quantity: 60, unit: "ml" },
        { name: "cinnamon", quantity: 3, unit: "g" },
      ],
      [
        "1. Rub butter into flour and baking powder; mix in sugar, then beaten eggs and milk to a soft dough.",
        "2. Spread half in a greased tin, cover with sliced apples tossed in cinnamon and a little sugar.",
        "3. Top with remaining dough (rustic clumps are fine) and bake at 180°C until golden, about 40–45 minutes.",
        "4. Serve warm with custard or softly whipped cream.",
      ],
      {
        description:
          "Rustic farmhouse cake packed with tart apples — a classic Irish teatime dessert.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 25,
        cookMinutes: 45,
        difficulty: "easy",
        substitutions: [
          "Elstar or Jonagold apples from Dutch shops work well; serve with vanillevla if custard is handy.",
        ],
      },
    ),
    drink: drink(
      "Irish Breakfast Tea",
      "Tea",
      "tea",
      false,
      "Strong black breakfast tea with milk — the everyday non-alcoholic drink of Irish kitchens.",
    ),
    moreDrinks: [
      drink(
        "Irish Whiskey",
        "Fuisce",
        "spirit",
        true,
        "Triple-distilled whiskey that contains alcohol; traditionally sipped neat or with a drop of water.",
      ),
    ],
    moreRecipes: [
      r(
        "soda-bread",
        "Irish Soda Bread",
        "Arán Sóide",
        "side",
        [
          { name: "plain flour", quantity: 250, unit: "g" },
          { name: "wholemeal flour", quantity: 250, unit: "g" },
          { name: "baking soda", quantity: 8, unit: "g" },
          { name: "buttermilk", quantity: 400, unit: "ml" },
          { name: "salt", quantity: 5, unit: "g" },
        ],
        [
          "1. Mix flours, baking soda, and salt; stir in buttermilk quickly to a soft sticky dough.",
          "2. Shape into a round on a floured tray, cut a deep cross on top, and bake at 200°C about 35–40 minutes.",
          "3. Tap the base — it should sound hollow; cool wrapped in a cloth for a tender crust.",
        ],
        {
          description:
            "Quick buttermilk loaf with a cross-cut top — essential beside chowder and stew.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 10,
          cookMinutes: 40,
          difficulty: "easy",
          substitutions: [
            "Milk plus a spoon of lemon juice stands in for buttermilk.",
          ],
        },
      ),
    ],
  },
  status: "published",
};
