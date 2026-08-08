import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const clCountry: AuthoredCountry = {
  code: "cl",
  slug: "chile",
  name: "Chile",
  flag: "🇨🇱",
  region: "Americas",
  introduction:
    "Chilean cooking runs from Pacific seafood to Andean corn and slow stews. Empanadas, pebre, and sweet corn casseroles mark festive and everyday tables alike.",
  cuisineAliases: [
    "Chilean restaurant",
    "Chileens restaurant",
    "Latin American restaurant",
  ],
  nationalDishId: "pastel-de-choclo",
  nationalDrink: drink(
    "Pisco Sour",
    "Pisco sour",
    "cocktail",
    true,
    "Chilean pisco shaken with lemon, sugar, and egg white into a foamy cocktail.",
  ),
  menu: {
    starter: r(
      "empanadas-de-pino",
      "Beef Empanadas",
      "Empanadas de pino",
      "starter",
      [
        { name: "plain flour", quantity: 400, unit: "g" },
        { name: "butter or lard", quantity: 100, unit: "g" },
        { name: "beef mince", quantity: 400, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "raisins", quantity: 40, unit: "g" },
        { name: "black olives", quantity: 8, unit: "pieces" },
        { name: "hard-boiled eggs", quantity: 2, unit: "pieces" },
        { name: "cumin", quantity: 4, unit: "g" },
        { name: "sweet paprika", quantity: 5, unit: "g" },
      ],
      [
        "1. Soften onion, brown the beef with cumin and paprika, then cool; stir in raisins.",
        "2. Make a short pastry with flour, fat, salt, and warm water; rest and roll into discs.",
        "3. Fill each disc with beef, a piece of egg, and half an olive; seal firmly.",
        "4. Bake at 200°C until golden, brushing with egg wash if you like.",
      ],
      {
        description:
          "Baked pastry turnovers filled with spiced beef, onion, olive, egg, and raisins.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 40,
        cookMinutes: 35,
        difficulty: "medium",
      },
    ),
    main: r(
      "pastel-de-choclo",
      "Corn Pie",
      "Pastel de choclo",
      "main",
      [
        { name: "fresh or frozen corn kernels", quantity: 1, unit: "kg" },
        { name: "milk", quantity: 100, unit: "ml" },
        { name: "butter", quantity: 40, unit: "g" },
        { name: "sugar", quantity: 20, unit: "g" },
        { name: "beef mince", quantity: 400, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "raisins", quantity: 40, unit: "g" },
        { name: "black olives", quantity: 8, unit: "pieces" },
        { name: "hard-boiled eggs", quantity: 2, unit: "pieces" },
        { name: "chicken thigh meat", quantity: 200, unit: "g", note: "optional" },
      ],
      [
        "1. Cook a pino of onion and beef with cumin; cool and layer into a baking dish with olives, raisins, egg, and optional chicken.",
        "2. Blend corn with milk, then cook in butter with sugar and salt until thick like porridge.",
        "3. Spread the corn mash over the filling and sprinkle a little sugar on top.",
        "4. Bake at 190°C until the top is blistered and golden.",
      ],
      {
        description:
          "Sweet corn mash baked over a savoury beef filling, a celebrated Chilean main.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 35,
        cookMinutes: 50,
        difficulty: "medium",
        substitutions: [
          "Frozen sweetcorn works year-round; a food processor helps achieve a coarse mash.",
        ],
      },
    ),
    side: r(
      "ensalada-chilena",
      "Chilean Salad",
      "Ensalada chilena",
      "side",
      [
        { name: "tomatoes", quantity: 600, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "fresh coriander", quantity: 15, unit: "g" },
        { name: "olive oil", quantity: 30, unit: "ml" },
        { name: "lemon or vinegar", quantity: 15, unit: "ml" },
      ],
      [
        "1. Slice onion thinly and soak briefly in cold salted water; drain and squeeze dry.",
        "2. Slice tomatoes and arrange with the onion.",
        "3. Dress with oil, lemon, salt, and chopped coriander.",
        "4. Serve at room temperature beside empanadas or grilled meat.",
      ],
      {
        description:
          "Simple tomato-and-onion salad dressed with oil, lemon, and coriander.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "leche-asada",
      "Baked Milk Custard",
      "Leche asada",
      "dessert",
      [
        { name: "milk", quantity: 750, unit: "ml" },
        { name: "eggs", quantity: 4, unit: "pieces" },
        { name: "sugar", quantity: 120, unit: "g" },
        { name: "vanilla", quantity: 5, unit: "ml" },
        { name: "cinnamon", quantity: 2, unit: "g" },
      ],
      [
        "1. Whisk eggs with sugar, then slowly whisk in warm milk and vanilla.",
        "2. Pour into a baking dish and dust lightly with cinnamon.",
        "3. Bake in a water bath at 170°C until just set with a slight wobble.",
        "4. Cool, then chill before slicing or scooping.",
      ],
      {
        description:
          "Gently baked milk custard with vanilla and cinnamon, similar to a rustic flan.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 50,
        difficulty: "easy",
      },
    ),
    drink: drink(
      "Mote con Huesillo",
      "Mote con huesillo",
      "soft-drink",
      false,
      "Sweet dried-peach nectar served over cooked wheat mote as a traditional cooler.",
    ),
    moreDrinks: [
      drink(
        "Carmenère Wine",
        "Carmenère",
        "wine",
        true,
        "A soft red wine grape closely associated with Chilean vineyards.",
      ),
      drink(
        "Nescafé-style Instant Coffee",
        "Café",
        "coffee",
        false,
        "Everyday Chilean coffee often made from soluble grounds and served sweet.",
      ),
    ],
  },
  status: "published",
};
