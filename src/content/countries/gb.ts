import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const gbCountry: AuthoredCountry = {
  code: "gb",
  slug: "united-kingdom",
  name: "United Kingdom",
  flag: "🇬🇧",
  region: "Europe",
  introduction:
    "British cooking spans pub classics, coastal seafood, and regional baking. Expect hearty roasts, fried fish, and comforting puddings alongside modern market produce.",
  cuisineAliases: [
    "British restaurant",
    "Brits restaurant",
    "English restaurant",
  ],
  nationalDishId: "fish-and-chips",
  nationalDrink: drink(
    "Ale",
    "Bitter ale",
    "beer",
    true,
    "Traditional British beer style, often served with pub meals.",
  ),
  menu: {
    starter: r(
      "scotch-egg",
      "Scotch Egg",
      "Scotch egg",
      "starter",
      [
        { name: "eggs", quantity: 5, unit: "pieces", note: "4 for wrapping, 1 for coating" },
        { name: "sausage meat", quantity: 400, unit: "g" },
        { name: "breadcrumbs", quantity: 150, unit: "g" },
        { name: "plain flour", quantity: 40, unit: "g" },
        { name: "oil", quantity: 500, unit: "ml", note: "for frying" },
      ],
      [
        "1. Soft-boil 4 eggs (about 6–7 minutes), cool in iced water, and peel carefully.",
        "2. Flatten sausage meat into thin rounds, wrap each egg completely, and seal well.",
        "3. Dust with flour, dip in beaten egg, then coat in breadcrumbs.",
        "4. Deep-fry at 170°C until deep golden, or bake at 200°C after a brief fry; rest before halving.",
      ],
      {
        description:
          "Soft-boiled egg wrapped in seasoned sausage meat and fried crisp.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 30,
        cookMinutes: 20,
        difficulty: "medium",
      },
    ),
    main: r(
      "fish-and-chips",
      "Fish and Chips",
      "Fish and chips",
      "main",
      [
        { name: "white fish fillets", quantity: 700, unit: "g" },
        { name: "plain flour", quantity: 200, unit: "g" },
        { name: "potatoes", quantity: 1, unit: "kg" },
        { name: "beer", quantity: 250, unit: "ml", note: "for batter" },
        { name: "baking powder", quantity: 5, unit: "g" },
        { name: "oil", quantity: 1.5, unit: "litres", note: "for frying" },
      ],
      [
        "1. Cut potatoes into thick chips, rinse, and dry; fry once at 140°C until soft, then drain.",
        "2. Whisk flour, baking powder, salt, and cold beer into a thick batter.",
        "3. Dust fish in flour, dip in batter, and fry at 180°C until golden and cooked through.",
        "4. Refry chips at 180°C until crisp; serve with salt, vinegar, and lemon.",
      ],
      {
        description:
          "Crispy battered fish with thick-cut chips, a widely loved British takeaway classic.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 25,
        cookMinutes: 35,
        difficulty: "medium",
        substitutions: [
          "Cod or haddock are traditional; sparkling water can replace beer in the batter.",
        ],
      },
    ),
    side: r(
      "mushy-peas",
      "Mushy Peas",
      "Mushy peas",
      "side",
      [
        { name: "dried marrowfat peas", quantity: 300, unit: "g" },
        { name: "butter", quantity: 30, unit: "g" },
        { name: "fresh mint", quantity: 10, unit: "g" },
        { name: "bicarbonate of soda", quantity: 5, unit: "g", note: "for soaking" },
      ],
      [
        "1. Soak marrowfat peas overnight with bicarbonate of soda; rinse well.",
        "2. Simmer in fresh water until soft and collapsing.",
        "3. Mash roughly with butter, chopped mint, and salt.",
        "4. Serve hot beside fish and chips.",
      ],
      {
        description:
          "Soft mashed marrowfat peas finished with butter and mint.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 45,
        difficulty: "easy",
        substitutions: [
          "Tinned marrowfat peas or frozen garden peas work for a quicker version.",
        ],
      },
    ),
    dessert: r(
      "sticky-toffee-pudding",
      "Sticky Toffee Pudding",
      "Sticky toffee pudding",
      "dessert",
      [
        { name: "dates", quantity: 200, unit: "g" },
        { name: "plain flour", quantity: 175, unit: "g" },
        { name: "brown sugar", quantity: 150, unit: "g" },
        { name: "butter", quantity: 100, unit: "g" },
        { name: "eggs", quantity: 2, unit: "pieces" },
        { name: "bicarbonate of soda", quantity: 5, unit: "g" },
        { name: "double cream", quantity: 200, unit: "ml" },
      ],
      [
        "1. Soak chopped dates in hot water with bicarbonate of soda; mash lightly.",
        "2. Cream butter and sugar, beat in eggs, then fold in flour and the date mixture.",
        "3. Bake in a buttered dish at 180°C until risen and springy.",
        "4. Simmer cream with brown sugar and butter into a toffee sauce; pour over the warm pudding.",
      ],
      {
        description:
          "Date-studded sponge soaked in warm toffee sauce, a pub-dessert favourite.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 20,
        cookMinutes: 40,
        difficulty: "easy",
      },
    ),
    drink: drink(
      "Elderflower Cordial",
      "Elderflower cordial",
      "soft-drink",
      false,
      "Floral non-alcoholic cordial diluted with still or sparkling water.",
    ),
    moreRecipes: [
      r(
        "shepherd-pie",
        "Shepherd's Pie",
        "Shepherd's pie",
        "main",
        [
          { name: "minced lamb", quantity: 600, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "carrots", quantity: 2, unit: "pieces" },
          { name: "potatoes", quantity: 900, unit: "g" },
          { name: "lamb or beef stock", quantity: 300, unit: "ml" },
          { name: "Worcestershire sauce", quantity: 15, unit: "ml" },
          { name: "butter", quantity: 40, unit: "g" },
        ],
        [
          "1. Brown the lamb, then soften onion and carrot; add stock and Worcestershire and simmer until thick.",
          "2. Boil and mash potatoes with butter and a splash of milk.",
          "3. Tip the meat into a dish, spread mash on top, and rough up with a fork.",
          "4. Bake at 200°C until the top is golden and the edges bubble.",
        ],
        {
          description:
            "Minced lamb in gravy under a golden mashed-potato crust.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 25,
          cookMinutes: 45,
          difficulty: "easy",
          substitutions: [
            "Use beef mince for cottage pie; Dutch gehakt works if labelled as lamb or mixed.",
          ],
        },
      ),
      r(
        "sunday-roast",
        "Sunday Roast Chicken",
        "Sunday roast",
        "main",
        [
          { name: "whole chicken", quantity: 1500, unit: "g" },
          { name: "potatoes", quantity: 800, unit: "g" },
          { name: "carrots", quantity: 400, unit: "g" },
          { name: "chicken stock", quantity: 300, unit: "ml" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "fresh thyme", quantity: 10, unit: "g" },
        ],
        [
          "1. Season the chicken, stuff the cavity with onion and thyme, and roast at 200°C until juices run clear.",
          "2. Parboil potatoes, rough the edges, and roast in hot fat until crisp.",
          "3. Roast carrots alongside until tender.",
          "4. Deglaze the roasting tin with stock for gravy; rest the chicken before carving.",
        ],
        {
          description:
            "Roast chicken with gravy, roast potatoes, and seasonal vegetables.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 25,
          cookMinutes: 90,
          difficulty: "medium",
        },
      ),
      r(
        "scones",
        "Cream Scones",
        "Scones",
        "dessert",
        [
          { name: "plain flour", quantity: 350, unit: "g" },
          { name: "butter", quantity: 80, unit: "g" },
          { name: "milk", quantity: 150, unit: "ml" },
          { name: "baking powder", quantity: 15, unit: "g" },
          { name: "sugar", quantity: 40, unit: "g" },
          { name: "clotted cream or thick cream", quantity: 150, unit: "g" },
          { name: "strawberry jam", quantity: 100, unit: "g" },
        ],
        [
          "1. Rub butter into flour, baking powder, sugar, and salt until sandy.",
          "2. Stir in milk to a soft dough; pat out gently and cut rounds without twisting.",
          "3. Bake at 220°C until risen and golden.",
          "4. Split and serve with jam and thick cream.",
        ],
        {
          description:
            "Light tea-time scones split and filled with jam and thick cream.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 15,
          cookMinutes: 15,
          difficulty: "easy",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "English Breakfast Tea",
        "Tea",
        "tea",
        false,
        "Strong black tea usually served with milk alongside cakes and scones.",
      ),
      drink(
        "Cider",
        "Cider",
        "beer",
        true,
        "Apple cider ranging from dry to sweet, popular with pub food.",
      ),
    ],
  },
  status: "published",
};
