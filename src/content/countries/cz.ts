import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const czCountry: AuthoredCountry = {
  code: "cz",
  slug: "czechia",
  name: "Czechia",
  flag: "🇨🇿",
  region: "Europe",
  introduction:
    "Czech cooking centres on dumplings, sauces, pork, and beer-hall comfort. Creamy gravies and pickled sides balance rich roasts and slow braises.",
  cuisineAliases: [
    "Czech restaurant",
    "Tsjechisch restaurant",
    "Bohemian restaurant",
  ],
  nationalDishId: "svickova",
  nationalDrink: drink(
    "Pilsner Lager",
    "Plzeňské pivo",
    "beer",
    true,
    "Golden lager in the Pilsen style, the beer most closely tied to Czech pub culture.",
  ),
  menu: {
    starter: r(
      "cesnecka",
      "Garlic Soup",
      "Česnečka",
      "starter",
      [
        { name: "garlic", quantity: 8, unit: "cloves" },
        { name: "potato", quantity: 300, unit: "g" },
        { name: "chicken or vegetable stock", quantity: 1.2, unit: "litre" },
        { name: "marjoram", quantity: 3, unit: "g" },
        { name: "egg", quantity: 1, unit: "piece" },
        { name: "bread cubes", quantity: 80, unit: "g" },
        { name: "butter", quantity: 20, unit: "g" },
      ],
      [
        "1. Soften sliced garlic briefly in butter without browning; add diced potato and stock.",
        "2. Simmer until the potato is tender, then season with salt, pepper, and marjoram.",
        "3. Whisk in a beaten egg in a thin stream for ribbons, or poach egg separately.",
        "4. Serve with toasted bread cubes floated on top.",
      ],
      {
        description:
          "Garlicky clear soup with potato, marjoram, and toasted bread cubes.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 15,
        cookMinutes: 25,
        difficulty: "easy",
      },
    ),
    main: r(
      "svickova",
      "Svíčková",
      "Svíčková na smetaně",
      "main",
      [
        { name: "beef sirloin or topside", quantity: 800, unit: "g" },
        { name: "carrot", quantity: 2, unit: "pieces" },
        { name: "celeriac", quantity: 200, unit: "g" },
        { name: "parsley root or parsnip", quantity: 150, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "butter", quantity: 40, unit: "g" },
        { name: "double cream", quantity: 250, unit: "ml" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "sugar", quantity: 10, unit: "g" },
        { name: "bay leaves", quantity: 2, unit: "pieces" },
      ],
      [
        "1. Brown the beef, then roast or braise with chopped root vegetables, onion, bay, and a little water until tender.",
        "2. Blend the soft vegetables with pan juices into a smooth sauce base.",
        "3. Stir in cream, lemon juice, sugar, and salt; simmer gently until silky.",
        "4. Slice the beef and serve with bread dumplings, sauce, cranberry, and a lemon slice.",
      ],
      {
        description:
          "Marinated beef in a creamy root-vegetable sauce, often called Czechia's national dish.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 30,
        cookMinutes: 150,
        difficulty: "challenging",
        substitutions: [
          "Bread dumplings (houskové knedlíky) are in Czech shops frozen; boiled potato dumplings are a workable stand-in.",
        ],
      },
    ),
    side: r(
      "zeli",
      "Braised Red Cabbage",
      "Dušené zelí",
      "side",
      [
        { name: "red or white cabbage", quantity: 700, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "apple cider vinegar", quantity: 40, unit: "ml" },
        { name: "sugar", quantity: 20, unit: "g" },
        { name: "caraway seeds", quantity: 3, unit: "g" },
        { name: "lard or oil", quantity: 30, unit: "g" },
      ],
      [
        "1. Soften onion in fat, add shredded cabbage, caraway, and a splash of water.",
        "2. Cover and braise until tender, stirring occasionally.",
        "3. Season with vinegar, sugar, and salt for a sweet-sour balance.",
        "4. Serve warm with roast meat or dumplings.",
      ],
      {
        description:
          "Sweet-sour braised cabbage with caraway, a classic Czech roast-side.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 40,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "ovocne-knedliky",
      "Fruit Dumplings",
      "Ovocné knedlíky",
      "dessert",
      [
        { name: "quark or soft fresh cheese", quantity: 250, unit: "g" },
        { name: "egg", quantity: 1, unit: "piece" },
        { name: "plain flour", quantity: 200, unit: "g" },
        { name: "plums or apricots", quantity: 12, unit: "pieces" },
        { name: "butter", quantity: 60, unit: "g" },
        { name: "sugar", quantity: 40, unit: "g" },
        { name: "breadcrumbs", quantity: 40, unit: "g" },
      ],
      [
        "1. Mix quark, egg, a pinch of salt, and flour into a soft dough; rest 15 minutes.",
        "2. Wrap each stoned fruit in a dough portion, sealing well.",
        "3. Boil in salted water until they float plus 4–5 minutes.",
        "4. Toss with buttered breadcrumbs and sugar, or serve with melted butter and quark.",
      ],
      {
        description:
          "Soft cheese-dough dumplings filled with whole fruit and finished with buttered crumbs.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 35,
        cookMinutes: 20,
        difficulty: "medium",
        substitutions: [
          "Dutch kwark is a fine stand-in for tvaroh; strawberries work when stone fruit is out of season.",
        ],
      },
    ),
    drink: drink(
      "Kofola",
      "Kofola",
      "soft-drink",
      false,
      "A herbal Czech cola-style soft drink that is less sweet than mainstream cola.",
    ),
    moreDrinks: [
      drink(
        "Becherovka",
        "Becherovka",
        "spirit",
        true,
        "A bittersweet herbal liqueur from Karlovy Vary, often sipped chilled as a digestif.",
      ),
      drink(
        "Apple Must",
        "Jablečný mošt",
        "soft-drink",
        false,
        "Fresh pressed apple juice served still or lightly sparkling.",
      ),
    ],
  },
  status: "published",
};
