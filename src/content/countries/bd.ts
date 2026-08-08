import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const bdCountry: AuthoredCountry = {
  code: "bd",
  slug: "bangladesh",
  name: "Bangladesh",
  flag: "🇧🇩",
  region: "Asia",
  introduction:
    "Bangladeshi cooking is mustard-forward, river-fish rich, and generous with rice, dal, and aromatic biryani. Everyday tables balance sharp bhortas with slow bhunas and sweet mishti.",
  cuisineAliases: [
    "Bangladeshi restaurant",
    "Bangla restaurant",
    "Bengaals restaurant",
  ],
  nationalDishId: "hilsa-mustard",
  nationalDrink: drink(
    "Bengali Tea",
    "Cha",
    "tea",
    false,
    "Strong milk tea boiled with sugar — the everyday non-alcoholic drink across Bangladesh.",
  ),
  menu: {
    starter: r(
      "begun-bhaja",
      "Fried Aubergine",
      "Begun Bhaja",
      "starter",
      [
        { name: "aubergine", quantity: 2, unit: "pieces" },
        { name: "turmeric", quantity: 3, unit: "g" },
        { name: "red chili powder", quantity: 3, unit: "g" },
        { name: "mustard oil", quantity: 80, unit: "ml" },
        { name: "salt", quantity: 5, unit: "g" },
      ],
      [
        "1. Slice aubergine into thick rounds, salt lightly, and dust with turmeric and chili.",
        "2. Shallow-fry in mustard oil until both sides are deep golden and soft inside.",
        "3. Drain on paper and serve hot with rice or as a starter with dal.",
      ],
      {
        description:
          "Crisp-edged aubergine fried in pungent mustard oil — a simple Bengali starter staple.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 20,
        difficulty: "easy",
        substitutions: [
          "Mustard oil is in South Asian shops; mix neutral oil with a spoon of Dijon for a milder echo.",
        ],
      },
    ),
    main: r(
      "hilsa-mustard",
      "Hilsa in Mustard Sauce",
      "Ilish Macher Jhal",
      "main",
      [
        { name: "hilsa or oily fish steaks", quantity: 800, unit: "g" },
        { name: "yellow mustard seeds", quantity: 40, unit: "g" },
        { name: "green chiles", quantity: 4, unit: "pieces" },
        { name: "turmeric", quantity: 4, unit: "g" },
        { name: "mustard oil", quantity: 60, unit: "ml" },
        { name: "nigella seeds", quantity: 3, unit: "g" },
        { name: "water", quantity: 200, unit: "ml" },
      ],
      [
        "1. Soak mustard seeds 20 minutes; grind with green chile, turmeric, and a little water into a paste.",
        "2. Rub fish with turmeric and salt; lightly fry in mustard oil and set aside.",
        "3. Temper nigella in the same oil, add mustard paste and water, and simmer gently without boiling hard.",
        "4. Slip fish back in, cover, and cook until just done; finish with a drizzle of raw mustard oil.",
      ],
      {
        description:
          "Bangladesh’s most iconic fish curry: hilsa in a sharp mustard-chile sauce — widely considered a national favourite.",
        dietaryLabels: ["contains-seafood", "gluten-free", "dairy-free"],
        prepMinutes: 25,
        cookMinutes: 30,
        difficulty: "medium",
        substitutions: [
          "Fresh hilsa is rare in the Netherlands; use mackerel, herring, or salmon steaks from the fishmonger.",
          "Mustard seeds and mustard oil are stocked in Indian/Bangladeshi shops.",
        ],
      },
    ),
    side: r(
      "aloo-bhorta",
      "Mashed Potato Bhorta",
      "Aloo Bhorta",
      "side",
      [
        { name: "potato", quantity: 600, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "fresh coriander", quantity: 15, unit: "g" },
        { name: "green chile", quantity: 2, unit: "pieces" },
        { name: "mustard oil", quantity: 30, unit: "ml" },
      ],
      [
        "1. Boil potatoes until soft; drain and mash while hot.",
        "2. Mix in finely sliced onion, chopped chile, coriander, salt, and mustard oil.",
        "3. Taste for heat and pungency; serve warm beside rice and fish curry.",
      ],
      {
        description:
          "Hand-mashed potatoes punched up with raw onion, chile, and mustard oil — everyday Bengali comfort.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 25,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "mishti-doi",
      "Sweet Yogurt",
      "Mishti Doi",
      "dessert",
      [
        { name: "whole milk", quantity: 1, unit: "litre" },
        { name: "sugar", quantity: 120, unit: "g" },
        { name: "plain yogurt starter", quantity: 80, unit: "g" },
        { name: "evaporated milk", quantity: 100, unit: "ml", note: "optional richness" },
      ],
      [
        "1. Reduce milk gently by about a third; caramelise some sugar in a pan and dissolve it into the hot milk for colour and flavour.",
        "2. Cool the sweetened milk to lukewarm; whisk in yogurt starter and evaporated milk if using.",
        "3. Pour into pots, keep warm (oven with light on or yogurt maker) until set, then chill thoroughly.",
      ],
      {
        description:
          "Caramel-sweet set yogurt — Bangladesh’s best-known festive dessert.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 40,
        difficulty: "medium",
        substitutions: [
          "A spoon of caramel syrup can stand in for home-caramelised sugar if you are short on time.",
        ],
      },
    ),
    drink: drink(
      "Borhani",
      "Borhani",
      "soft-drink",
      false,
      "Spiced yogurt drink with mint and mustard — non-alcoholic and traditionally served with biryani.",
    ),
    moreDrinks: [
      drink(
        "Green Coconut Water",
        "Dab",
        "soft-drink",
        false,
        "Fresh young coconut water drunk chilled — naturally non-alcoholic and deeply refreshing.",
      ),
    ],
    moreRecipes: [
      r(
        "kacchi-biryani",
        "Kacchi Biryani",
        "Kacchi Biryani",
        "main",
        [
          { name: "basmati rice", quantity: 400, unit: "g" },
          { name: "lamb or mutton", quantity: 800, unit: "g" },
          { name: "yogurt", quantity: 200, unit: "g" },
          { name: "onion", quantity: 3, unit: "pieces" },
          { name: "ginger-garlic paste", quantity: 40, unit: "g" },
          { name: "biryani spices", quantity: 15, unit: "g" },
          { name: "potato", quantity: 3, unit: "pieces" },
          { name: "saffron milk", quantity: 50, unit: "ml" },
          { name: "ghee", quantity: 60, unit: "g" },
        ],
        [
          "1. Marinate meat in yogurt, ginger-garlic, fried onion, and spices for several hours.",
          "2. Parboil rice with whole spices; layer raw marinated meat and potato with rice in a heavy pot.",
          "3. Drizzle ghee and saffron milk, seal the lid, and cook on low (dum) until meat and rice are tender.",
          "4. Rest 10 minutes, then gently mix and serve with borhani.",
        ],
        {
          description:
            "Dhaka-style layered biryani where marinated meat cooks under fragrant rice — a celebration centrepiece.",
          dietaryLabels: ["contains-meat", "gluten-free"],
          prepMinutes: 40,
          cookMinutes: 90,
          difficulty: "challenging",
          substitutions: [
            "Ready biryani masala from South Asian shops speeds seasoning; beef works when mutton is scarce.",
          ],
        },
      ),
    ],
  },
  status: "published",
};
