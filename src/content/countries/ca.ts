import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const caCountry: AuthoredCountry = {
  code: "ca",
  slug: "canada",
  name: "Canada",
  flag: "🇨🇦",
  region: "Americas",
  introduction:
    "Canadian cooking spans Québécois comfort food, prairie baking, and coastal seafood. Maple, smoked fish, and hearty cheese-and-potato plates are recurring themes.",
  cuisineAliases: [
    "Canadian restaurant",
    "Canadees restaurant",
    "Québécois restaurant",
  ],
  nationalDishId: "poutine",
  nationalDrink: drink(
    "Ice Wine",
    "Icewine",
    "wine",
    true,
    "Sweet dessert wine pressed from grapes frozen on the vine, a Canadian specialty.",
  ),
  menu: {
    starter: r(
      "pea-soup",
      "Yellow Pea Soup",
      "Soupe aux pois",
      "starter",
      [
        { name: "yellow split peas", quantity: 300, unit: "g" },
        { name: "smoked ham hock or bacon", quantity: 250, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "carrot", quantity: 2, unit: "pieces" },
        { name: "celery", quantity: 2, unit: "stalks" },
        { name: "bay leaf", quantity: 1, unit: "piece" },
        { name: "thyme", quantity: 3, unit: "g" },
      ],
      [
        "1. Soak split peas if needed, then simmer with ham hock, onion, carrot, celery, and bay.",
        "2. Cook until the peas collapse into a thick soup; remove the bone and chop any meat back in.",
        "3. Season with pepper and thyme; add water if too thick.",
        "4. Serve hot with rustic bread.",
      ],
      {
        description:
          "Thick Québécois yellow pea soup simmered with smoked pork and aromatics.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 90,
        difficulty: "easy",
      },
    ),
    main: r(
      "poutine",
      "Poutine",
      "Poutine",
      "main",
      [
        { name: "floury potatoes", quantity: 1.2, unit: "kg" },
        { name: "cheese curds", quantity: 300, unit: "g" },
        { name: "beef or vegetable stock", quantity: 500, unit: "ml" },
        { name: "butter", quantity: 40, unit: "g" },
        { name: "flour", quantity: 40, unit: "g" },
        { name: "soy sauce", quantity: 10, unit: "ml" },
        { name: "oil", quantity: 1, unit: "litre", note: "for frying" },
      ],
      [
        "1. Cut potatoes into thick fries, rinse, dry, and fry twice until crisp; salt lightly.",
        "2. Make gravy by cooking flour in butter, whisking in hot stock and soy, and simmering until glossy.",
        "3. Pile fries in bowls, scatter cheese curds over while fries are hot.",
        "4. Ladle hot gravy over so the curds soften but do not fully melt.",
      ],
      {
        description:
          "Crisp fries topped with fresh cheese curds and hot brown gravy, Canada's iconic plate.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 30,
        cookMinutes: 40,
        difficulty: "medium",
        substitutions: [
          "Fresh cheese curds are ideal; torn mozzarella is an emergency stand-in but melts faster.",
          "Use vegetable stock for a meat-free gravy.",
        ],
      },
    ),
    side: r(
      "maple-carrots",
      "Maple Roasted Carrots",
      "Maple carrots",
      "side",
      [
        { name: "carrots", quantity: 700, unit: "g" },
        { name: "maple syrup", quantity: 40, unit: "ml" },
        { name: "butter", quantity: 20, unit: "g" },
        { name: "thyme", quantity: 3, unit: "g" },
        { name: "salt", quantity: 3, unit: "g" },
      ],
      [
        "1. Toss carrot batons with melted butter, maple syrup, thyme, and salt.",
        "2. Roast at 200°C until tender and caramelised at the edges.",
        "3. Taste and add a little more maple if you want them sweeter.",
        "4. Serve warm beside roast meat or poutine night leftovers.",
      ],
      {
        description:
          "Caramelised carrots glazed with maple syrup and thyme.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 30,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "butter-tarts",
      "Butter Tarts",
      "Butter tarts",
      "dessert",
      [
        { name: "shortcrust pastry", quantity: 300, unit: "g" },
        { name: "brown sugar", quantity: 150, unit: "g" },
        { name: "butter", quantity: 80, unit: "g" },
        { name: "egg", quantity: 1, unit: "piece" },
        { name: "golden syrup or corn syrup", quantity: 60, unit: "ml" },
        { name: "vanilla", quantity: 5, unit: "ml" },
        { name: "raisins", quantity: 60, unit: "g", note: "optional" },
      ],
      [
        "1. Line muffin tins with pastry circles.",
        "2. Whisk melted butter with brown sugar, syrup, egg, vanilla, and a pinch of salt.",
        "3. Divide raisins among the shells if using, then fill with the mixture.",
        "4. Bake at 190°C until the filling is set but still slightly soft in the centre.",
      ],
      {
        description:
          "Flaky pastry cups filled with a gooey brown-sugar butter filling.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 25,
        cookMinutes: 20,
        difficulty: "medium",
      },
    ),
    drink: drink(
      "Maple Lemonade",
      "Maple lemonade",
      "soft-drink",
      false,
      "Fresh lemonade sweetened with maple syrup instead of white sugar.",
    ),
    moreDrinks: [
      drink(
        "Caesar",
        "Bloody Caesar",
        "cocktail",
        true,
        "Vodka and clamato cocktail rimmed with celery salt, Canada's brunch classic.",
      ),
      drink(
        "Canadian Whisky",
        "Rye whisky",
        "spirit",
        true,
        "Smooth rye-forward whisky traditionally sipped neat or over ice.",
      ),
    ],
  },
  status: "published",
};
