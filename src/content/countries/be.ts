import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const beCountry: AuthoredCountry = {
  code: "be",
  slug: "belgium",
  name: "Belgium",
  flag: "🇧🇪",
  region: "Europe",
  introduction:
    "Belgian cooking bridges French technique and hearty northern comfort: mussels, fries, beer-braised beef, and chocolate share the table. Regional beers and waffles are as iconic as any single plate.",
  cuisineAliases: [
    "Belgian restaurant",
    "Belgisch restaurant",
    "Flemish restaurant",
  ],
  nationalDishId: "carbonnade",
  nationalDrink: drink(
    "Belgian Trappist Beer",
    "Trappistenbier",
    "beer",
    true,
    "Abbey-brewed ale that contains alcohol; sip slowly with stews or cheese.",
  ),
  menu: {
    starter: r(
      "garnaalkroketten",
      "Grey Shrimp Croquettes",
      "Garnaalkroketten",
      "starter",
      [
        { name: "grey shrimp", quantity: 250, unit: "g" },
        { name: "butter", quantity: 60, unit: "g" },
        { name: "plain flour", quantity: 60, unit: "g" },
        { name: "milk", quantity: 350, unit: "ml" },
        { name: "egg", quantity: 2, unit: "pieces" },
        { name: "breadcrumbs", quantity: 100, unit: "g" },
        { name: "nutmeg", quantity: 1, unit: "pinch" },
      ],
      [
        "1. Melt butter, stir in flour, then whisk in warm milk to a thick béchamel; season with salt, pepper, and nutmeg.",
        "2. Fold in the shrimp off the heat, cool the mixture until firm (chill at least 1 hour).",
        "3. Shape into cylinders, coat in flour, beaten egg, then breadcrumbs.",
        "4. Deep-fry at about 180°C until deep golden; drain and serve hot with lemon.",
      ],
      {
        description:
          "Crisp croquettes filled with North Sea grey shrimp in a nutmeg béchamel — a Belgian classic starter.",
        dietaryLabels: ["contains-seafood"],
        prepMinutes: 30,
        cookMinutes: 20,
        difficulty: "medium",
        substitutions: [
          "Fresh grey shrimp (Hollandse garnalen) are ideal; peeled frozen shrimp work in a pinch.",
        ],
      },
    ),
    main: r(
      "carbonnade",
      "Flemish Beer Beef Stew",
      "Stoofvlees / Carbonnade flamande",
      "main",
      [
        { name: "beef chuck", quantity: 900, unit: "g" },
        { name: "onion", quantity: 3, unit: "pieces" },
        { name: "Belgian brown beer", quantity: 500, unit: "ml" },
        { name: "beef stock", quantity: 250, unit: "ml" },
        { name: "mustard", quantity: 30, unit: "g" },
        { name: "gingerbread or ontbijtkoek", quantity: 2, unit: "slices" },
        { name: "butter", quantity: 40, unit: "g" },
        { name: "bay leaf", quantity: 2, unit: "pieces" },
        { name: "thyme", quantity: 5, unit: "g" },
      ],
      [
        "1. Brown cubed beef in butter in batches; soften the sliced onions in the same pot.",
        "2. Deglaze with beer, add stock, bay, thyme, and a spoon of mustard; return the beef.",
        "3. Lay gingerbread slices on top (mustard side down if spread), cover, and simmer gently 2–2½ hours until tender.",
        "4. Stir the softened bread into the sauce, reduce if needed, and season; serve with fries or mash.",
      ],
      {
        description:
          "Slow-braised beef in brown beer and onion, thickened with mustard-smeared gingerbread — Belgium's iconic stew.",
        dietaryLabels: ["contains-meat", "contains-alcohol"],
        prepMinutes: 25,
        cookMinutes: 150,
        difficulty: "medium",
        substitutions: [
          "Use a dark abbey-style beer from any Dutch supermarket; ontbijtkoek stands in for pain d'épices.",
        ],
      },
    ),
    side: r(
      "frietjes",
      "Belgian Fries",
      "Frietjes / Frites",
      "side",
      [
        { name: "floury potatoes", quantity: 1200, unit: "g" },
        { name: "frying oil", quantity: 1.5, unit: "litre" },
        { name: "coarse salt", quantity: 8, unit: "g" },
      ],
      [
        "1. Cut peeled potatoes into thick sticks, rinse until water runs clear, and dry thoroughly.",
        "2. First fry at about 150°C for 5–6 minutes until soft but pale; drain and cool.",
        "3. Second fry at 180–185°C until deep golden and crisp; salt immediately.",
      ],
      {
        description:
          "Twice-fried thick-cut chips — the side Belgians treat as seriously as any main course.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 25,
        difficulty: "medium",
        substitutions: [
          "Bintje or other floury potatoes work; sunflower oil is fine if beef fat is unavailable.",
        ],
        servingSuggestion: "Serve with mayonnaise, andalouse, or stoofvlees gravy.",
      },
    ),
    dessert: r(
      "liege-waffle",
      "Liège Waffle",
      "Gaufre de Liège",
      "dessert",
      [
        { name: "plain flour", quantity: 350, unit: "g" },
        { name: "butter", quantity: 200, unit: "g" },
        { name: "eggs", quantity: 2, unit: "pieces" },
        { name: "fresh yeast", quantity: 20, unit: "g" },
        { name: "milk", quantity: 100, unit: "ml" },
        { name: "pearl sugar", quantity: 200, unit: "g" },
        { name: "vanilla", quantity: 5, unit: "ml" },
      ],
      [
        "1. Dissolve yeast in warm milk; knead with flour, soft butter, eggs, sugar, and vanilla into a rich dough; rise 45 minutes.",
        "2. Knead in the pearl sugar gently so crystals stay mostly whole.",
        "3. Divide into balls and cook in a hot waffle iron until deep caramelised and sticky outside.",
        "4. Cool briefly on a rack; the sugar will crunch as it sets.",
      ],
      {
        description:
          "Dense yeasted waffles studded with pearl sugar that caramelises into a crunchy crust.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 25,
        cookMinutes: 20,
        difficulty: "medium",
        substitutions: [
          "Pearl sugar (parelsuiker) is sold in Dutch baking aisles; dry yeast works at half the fresh weight.",
        ],
      },
    ),
    drink: drink(
      "Chicory Coffee",
      "Koffie met cichorei",
      "coffee",
      false,
      "Mild coffee often blended with roasted chicory root — a non-alcoholic Belgian café staple.",
    ),
    moreDrinks: [
      drink(
        "Kriek",
        "Kriek",
        "beer",
        true,
        "Cherry lambic beer that contains alcohol; tart, lightly sweet, and best served chilled.",
      ),
    ],
  },
  status: "published",
};
