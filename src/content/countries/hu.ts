import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const huCountry: AuthoredCountry = {
  code: "hu",
  slug: "hungary",
  name: "Hungary",
  flag: "🇭🇺",
  region: "Europe",
  introduction:
    "Hungarian cooking is paprika-forward, generous with onions, and built for cold evenings. Soups, stews, dumplings, and sour cream sit at the heart of home tables.",
  cuisineAliases: [
    "Hungarian restaurant",
    "Hongaars restaurant",
    "paprika restaurant",
  ],
  nationalDishId: "gulyas",
  nationalDrink: drink(
    "Pálinka",
    "Pálinka",
    "spirit",
    true,
    "Fruit brandy distilled from plums, apricots, or pears and traditionally sipped neat.",
  ),
  menu: {
    starter: r(
      "lecso",
      "Lecsó",
      "Lecsó",
      "starter",
      [
        { name: "yellow peppers", quantity: 600, unit: "g" },
        { name: "tomatoes", quantity: 400, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "sweet paprika", quantity: 15, unit: "g" },
        { name: "lard or oil", quantity: 40, unit: "g" },
        { name: "eggs", quantity: 4, unit: "pieces", note: "optional" },
      ],
      [
        "1. Soften sliced onions in fat until pale gold; stir in paprika off the heat so it does not scorch.",
        "2. Add sliced peppers and cook until they soften and release juice.",
        "3. Stir in chopped tomatoes and simmer until jammy and sweet.",
        "4. Season well; optionally scramble in eggs at the end and serve with bread.",
      ],
      {
        description:
          "Pepper-and-tomato stew flavoured with sweet paprika, often finished with eggs.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 30,
        difficulty: "easy",
        substitutions: [
          "Hungarian sweet paprika from a Central European shop gives the authentic colour and aroma.",
        ],
      },
    ),
    main: r(
      "gulyas",
      "Goulash",
      "Gulyás",
      "main",
      [
        { name: "beef chuck", quantity: 800, unit: "g" },
        { name: "onion", quantity: 3, unit: "pieces" },
        { name: "sweet paprika", quantity: 30, unit: "g" },
        { name: "caraway seeds", quantity: 5, unit: "g" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "carrots", quantity: 2, unit: "pieces" },
        { name: "potatoes", quantity: 400, unit: "g" },
        { name: "green pepper", quantity: 1, unit: "piece" },
        { name: "tomato paste", quantity: 20, unit: "g" },
      ],
      [
        "1. Cook finely chopped onions slowly in fat until soft and sweet; stir in paprika and caraway off the heat.",
        "2. Add cubed beef and garlic, coating well, then cover with water and simmer until nearly tender.",
        "3. Add carrot, potato, pepper, and tomato paste; continue simmering until vegetables and beef are soft.",
        "4. Adjust salt and serve as a thick soup-stew with fresh bread or csipetke dumplings.",
      ],
      {
        description:
          "Paprika-red beef stew with root vegetables, Hungary's most recognised national dish.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 25,
        cookMinutes: 120,
        difficulty: "medium",
        substitutions: [
          "Use Hungarian sweet paprika; hot paprika can replace a spoonful for heat.",
        ],
      },
    ),
    side: r(
      "uborkasalata",
      "Cucumber Salad",
      "Uborkasaláta",
      "side",
      [
        { name: "cucumbers", quantity: 600, unit: "g" },
        { name: "white vinegar", quantity: 40, unit: "ml" },
        { name: "sugar", quantity: 15, unit: "g" },
        { name: "sour cream", quantity: 100, unit: "g" },
        { name: "sweet paprika", quantity: 2, unit: "g" },
        { name: "garlic", quantity: 1, unit: "clove" },
      ],
      [
        "1. Slice cucumbers thinly, salt lightly, and rest 15 minutes; squeeze out excess liquid.",
        "2. Dissolve sugar in vinegar with a splash of water; toss with the cucumbers and garlic.",
        "3. Fold in sour cream and dust with paprika.",
        "4. Chill briefly and serve beside rich stews.",
      ],
      {
        description:
          "Thin cucumber salad in a sweet-sour dressing finished with sour cream and paprika.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 0,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "retes",
      "Apple Strudel",
      "Almás rétes",
      "dessert",
      [
        { name: "filo pastry", quantity: 250, unit: "g" },
        { name: "apples", quantity: 700, unit: "g" },
        { name: "sugar", quantity: 80, unit: "g" },
        { name: "ground cinnamon", quantity: 5, unit: "g" },
        { name: "breadcrumbs", quantity: 40, unit: "g" },
        { name: "butter", quantity: 80, unit: "g" },
        { name: "raisins", quantity: 40, unit: "g" },
      ],
      [
        "1. Toss grated or thinly sliced apples with sugar, cinnamon, and raisins.",
        "2. Brush filo sheets with melted butter, sprinkle lightly with breadcrumbs, and layer.",
        "3. Spread the apple filling along one edge, roll into a log, and brush with more butter.",
        "4. Bake at 190°C until golden; rest briefly, dust with icing sugar, and slice.",
      ],
      {
        description:
          "Buttery apple-filled strudel rolled in thin pastry and dusted with sugar.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 30,
        cookMinutes: 35,
        difficulty: "medium",
        substitutions: [
          "Filo is easier than stretching traditional strudel dough at home and works well here.",
        ],
      },
    ),
    drink: drink(
      "Soda Water",
      "Szóda",
      "soft-drink",
      false,
      "Plain sparkling water, the classic non-alcoholic partner to paprika-rich Hungarian meals.",
    ),
    moreDrinks: [
      drink(
        "Fröccs",
        "Fröccs",
        "wine",
        true,
        "Wine mixed with soda water in set ratios, a refreshing Hungarian summer spritzer.",
      ),
      drink(
        "Unicum",
        "Unicum",
        "spirit",
        true,
        "A bitter herbal liqueur traditionally taken as a digestif after heavy meals.",
      ),
    ],
  },
  status: "published",
};
