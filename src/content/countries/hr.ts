import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const hrCountry: AuthoredCountry = {
  code: "hr",
  slug: "croatia",
  name: "Croatia",
  flag: "🇭🇷",
  region: "Europe",
  introduction:
    "Croatian cooking shifts from Adriatic seafood and olive oil to inland stews, grilled meats, and fresh cheese. Coastal blitva and slow pašticada sit comfortably beside continental comfort food.",
  cuisineAliases: [
    "Croatian restaurant",
    "Kroatisch restaurant",
    "Dalmatian restaurant",
  ],
  nationalDishId: "pasticada",
  nationalDrink: drink(
    "Rakija",
    "Rakija",
    "spirit",
    true,
    "Fruit brandy that contains alcohol; often homemade and sipped as a welcome drink.",
  ),
  menu: {
    starter: r(
      "octopus-salad",
      "Dalmatian Octopus Salad",
      "Salata od hobotnice",
      "starter",
      [
        { name: "octopus", quantity: 800, unit: "g" },
        { name: "red onion", quantity: 1, unit: "piece" },
        { name: "parsley", quantity: 20, unit: "g" },
        { name: "olive oil", quantity: 60, unit: "ml" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "garlic", quantity: 2, unit: "cloves" },
      ],
      [
        "1. Simmer octopus gently until tender (45–75 minutes depending on size); cool in the liquid, then cut into bite-size pieces.",
        "2. Toss with thinly sliced onion, minced garlic, parsley, olive oil, lemon juice, salt, and pepper.",
        "3. Rest at least 20 minutes so the dressing soaks in; serve at room temperature.",
      ],
      {
        description:
          "Tender octopus dressed with olive oil, lemon, and red onion — a classic Adriatic starter.",
        dietaryLabels: ["contains-seafood", "dairy-free", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 70,
        difficulty: "medium",
        substitutions: [
          "Frozen cleaned octopus works well; a bay leaf in the simmering water helps tenderness.",
        ],
      },
    ),
    main: r(
      "pasticada",
      "Dalmatian Pašticada",
      "Pašticada",
      "main",
      [
        { name: "beef topside or round", quantity: 1200, unit: "g" },
        { name: "bacon or pancetta", quantity: 80, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "carrot", quantity: 2, unit: "pieces" },
        { name: "prunes", quantity: 80, unit: "g" },
        { name: "red wine", quantity: 250, unit: "ml" },
        { name: "prošek or sweet dessert wine", quantity: 100, unit: "ml", note: "optional" },
        { name: "tomato paste", quantity: 40, unit: "g" },
        { name: "garlic", quantity: 4, unit: "cloves" },
        { name: "cloves", quantity: 4, unit: "pieces" },
        { name: "apple cider vinegar", quantity: 40, unit: "ml" },
      ],
      [
        "1. Lard the beef with garlic and bacon strips; marinate overnight in vinegar, wine, and cloves if you have time.",
        "2. Brown the meat, then soften onion and carrot in the same pot; add tomato paste, prunes, wine, and a little water.",
        "3. Cover and braise gently 2½–3 hours until the beef slices easily; remove meat and blend or mash the sauce until glossy.",
        "4. Slice the beef, return to the sauce, and serve traditionally with gnocchi.",
      ],
      {
        description:
          "Slow-braised Dalmatian beef in a sweet-sour wine sauce with prunes — widely considered Croatia's celebration roast.",
        dietaryLabels: ["contains-meat", "contains-alcohol"],
        prepMinutes: 30,
        cookMinutes: 180,
        difficulty: "challenging",
        substitutions: [
          "A splash of port or sweet red wine stands in for prošek; Dutch gnocchi pair well with the sauce.",
        ],
      },
    ),
    side: r(
      "blitva",
      "Swiss Chard with Potatoes",
      "Blitva",
      "side",
      [
        { name: "Swiss chard", quantity: 600, unit: "g" },
        { name: "potato", quantity: 400, unit: "g" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "olive oil", quantity: 45, unit: "ml" },
      ],
      [
        "1. Boil cubed potatoes until nearly tender; add chopped chard stems, then leaves, until wilted.",
        "2. Drain well; warm olive oil with sliced garlic until fragrant (do not burn).",
        "3. Toss greens and potatoes in the garlic oil with salt; serve warm beside grilled fish or meat.",
      ],
      {
        description:
          "Everyday Dalmatian side of soft potatoes and chard glossed with garlic olive oil.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 25,
        difficulty: "easy",
        substitutions: [
          "Spinach or beet greens work when chard is scarce in Dutch shops.",
        ],
      },
    ),
    dessert: r(
      "fritule",
      "Fritule",
      "Fritule",
      "dessert",
      [
        { name: "plain flour", quantity: 300, unit: "g" },
        { name: "eggs", quantity: 2, unit: "pieces" },
        { name: "yogurt or sour cream", quantity: 150, unit: "g" },
        { name: "sugar", quantity: 40, unit: "g" },
        { name: "raisins", quantity: 50, unit: "g" },
        { name: "lemon zest", quantity: 1, unit: "piece" },
        { name: "rum or brandy", quantity: 20, unit: "ml", note: "optional" },
        { name: "baking powder", quantity: 8, unit: "g" },
        { name: "oil", quantity: 1, unit: "litre", note: "for frying" },
      ],
      [
        "1. Mix eggs, yogurt, sugar, zest, and rum; fold in flour, baking powder, and soaked raisins to a thick batter.",
        "2. Drop small spoonfuls into hot oil and fry until golden, turning once.",
        "3. Drain and dust generously with icing sugar; serve warm.",
      ],
      {
        description:
          "Bite-size carnival doughnuts speckled with raisins and citrus — a festive Croatian sweet.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 20,
        cookMinutes: 20,
        difficulty: "easy",
        substitutions: [
          "Skip the rum for a non-alcoholic batch; orange zest works as well as lemon.",
        ],
      },
    ),
    drink: drink(
      "Elderflower Cordial",
      "Sok od bazge",
      "soft-drink",
      false,
      "Floral homemade elderflower syrup diluted with still or sparkling water — non-alcoholic.",
    ),
    moreDrinks: [
      drink(
        "Croatian Malvazija",
        "Malvazija",
        "wine",
        true,
        "Crisp Istrian white wine that contains alcohol; pairs with seafood and blitva.",
      ),
    ],
  },
  status: "published",
};
