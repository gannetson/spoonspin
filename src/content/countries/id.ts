import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const idCountry: AuthoredCountry = {
  code: "id",
  slug: "indonesia",
  name: "Indonesia",
  flag: "🇮🇩",
  region: "Asia",
  introduction:
    "Indonesian cooking layers chile, aromatics, coconut, and fermented condiments across thousands of islands. Rice anchors meals that balance sweet, salty, tangy, and spicy flavours.",
  cuisineAliases: [
    "Indonesian restaurant",
    "Indonesisch restaurant",
    "Indische restaurant",
  ],
  nationalDishId: "rendang",
  nationalDrink: drink(
    "Teh Botol",
    "Teh botol",
    "tea",
    false,
    "Sweet jasmine tea served cold from a bottle.",
  ),
  menu: {
    starter: r(
      "gado-gado",
      "Vegetable Peanut Salad",
      "Gado-gado",
      "starter",
      [
        { name: "mixed vegetables", quantity: 600, unit: "g", note: "potato, beans, cabbage, beansprouts" },
        { name: "peanut sauce", quantity: 250, unit: "g" },
        { name: "firm tofu", quantity: 300, unit: "g" },
        { name: "eggs", quantity: 2, unit: "pieces" },
        { name: "prawn crackers", quantity: 40, unit: "g" },
      ],
      [
        "1. Blanch the vegetables until just tender; boil the eggs and fry tofu cubes until golden.",
        "2. Warm the peanut sauce with a splash of water until pourable; taste for sweet–salty balance.",
        "3. Arrange vegetables, tofu, and egg quarters on a platter and spoon over the sauce.",
        "4. Crush prawn crackers on top just before serving.",
      ],
      {
        description:
          "Blanched vegetables and tofu dressed with a rich sweet-salty peanut sauce.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 25,
        cookMinutes: 20,
        difficulty: "easy",
        substitutions: [
          "Ready satay/peanut sauce from Dutch shops works; thin with water and a little lime or tamarind.",
        ],
      },
    ),
    main: r(
      "rendang",
      "Beef Rendang",
      "Rendang",
      "main",
      [
        { name: "beef chuck", quantity: 900, unit: "g" },
        { name: "coconut milk", quantity: 800, unit: "ml" },
        { name: "lemongrass", quantity: 3, unit: "stalks" },
        { name: "rendang or chile paste", quantity: 80, unit: "g" },
        { name: "kaffir lime leaves", quantity: 4, unit: "pieces" },
        { name: "galangal or ginger", quantity: 40, unit: "g" },
      ],
      [
        "1. Cube the beef and bruise lemongrass; fry the paste until fragrant and the oil starts to separate.",
        "2. Add beef and coat thoroughly, then pour in coconut milk with lime leaves and galangal.",
        "3. Simmer uncovered, stirring often, until the liquid reduces and the meat is fork-tender (1.5–2.5 hours).",
        "4. Continue on low heat until the sauce turns dark, oily, and clings to the beef; serve with rice.",
      ],
      {
        description:
          "Slow-cooked beef reduced in coconut and spices until intensely savoury.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 25,
        cookMinutes: 150,
        difficulty: "challenging",
        substitutions: [
          "Ready rendang paste is widely available in Dutch Asian shops; ginger can stand in for galangal.",
        ],
      },
    ),
    side: r(
      "nasi-kuning",
      "Turmeric Rice",
      "Nasi kuning",
      "side",
      [
        { name: "jasmine rice", quantity: 400, unit: "g" },
        { name: "coconut milk", quantity: 300, unit: "ml" },
        { name: "water", quantity: 350, unit: "ml" },
        { name: "turmeric", quantity: 8, unit: "g" },
        { name: "lemongrass", quantity: 1, unit: "stalk" },
        { name: "pandan leaf", quantity: 1, unit: "piece", note: "optional" },
      ],
      [
        "1. Rinse the rice and drain well.",
        "2. Combine rice with coconut milk, water, turmeric, bruised lemongrass, and pandan in a pot.",
        "3. Bring to a simmer, cover, and cook on low until the liquid is absorbed.",
        "4. Rest 10 minutes, discard aromatics, and fluff before serving.",
      ],
      {
        description:
          "Fragrant coconut rice tinted golden with turmeric and lemongrass.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 10,
        cookMinutes: 25,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "klepon",
      "Coconut Rice Cakes",
      "Klepon",
      "dessert",
      [
        { name: "glutinous rice flour", quantity: 250, unit: "g" },
        { name: "palm sugar", quantity: 150, unit: "g" },
        { name: "grated coconut", quantity: 150, unit: "g" },
        { name: "pandan extract or juice", quantity: 5, unit: "ml" },
        { name: "water", quantity: 150, unit: "ml" },
      ],
      [
        "1. Mix flour with pandan and enough water for a soft, pliable dough.",
        "2. Flatten small pieces, wrap a nugget of palm sugar inside, and roll into balls.",
        "3. Boil until they float, then cook 1–2 minutes more; drain.",
        "4. Roll in lightly salted grated coconut and serve warm so the centres ooze.",
      ],
      {
        description:
          "Chewy pandan rice balls filled with molten palm sugar and rolled in coconut.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 30,
        cookMinutes: 15,
        difficulty: "medium",
        substitutions: [
          "Dark brown sugar works if palm sugar is hard to find; freeze-dried coconut can be moistened.",
        ],
      },
    ),
    drink: drink(
      "Jamu Kunyit Asam",
      "Jamu",
      "soft-drink",
      false,
      "Turmeric and tamarind tonic, sweetened and served chilled.",
    ),
    moreRecipes: [
      r(
        "sate-ayam",
        "Chicken Satay",
        "Sate ayam",
        "main",
        [
          { name: "chicken thigh", quantity: 700, unit: "g" },
          { name: "ketjap manis", quantity: 60, unit: "ml" },
          { name: "garlic", quantity: 3, unit: "cloves" },
          { name: "ground coriander", quantity: 5, unit: "g" },
          { name: "peanut sauce", quantity: 250, unit: "g" },
        ],
        [
          "1. Cut chicken into strips; marinate with ketjap, crushed garlic, coriander, and a little oil for 30 minutes.",
          "2. Thread onto skewers and grill or griddle until cooked and lacquered.",
          "3. Warm peanut sauce and serve alongside with cucumber and onion if you like.",
        ],
        {
          description:
            "Grilled skewers glazed with sweet soy and served with peanut sauce.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 35,
          cookMinutes: 15,
          difficulty: "easy",
        },
      ),
      r(
        "sambal-goreng-tempe",
        "Tempeh Sambal",
        "Sambal goreng tempe",
        "side",
        [
          { name: "tempeh", quantity: 400, unit: "g" },
          { name: "shallots", quantity: 100, unit: "g" },
          { name: "sambal or chile paste", quantity: 40, unit: "g" },
          { name: "ketjap manis", quantity: 30, unit: "ml" },
          { name: "lemongrass", quantity: 1, unit: "stalk" },
        ],
        [
          "1. Cube tempeh and fry until crisp and golden; drain.",
          "2. Soften sliced shallots with bruised lemongrass, then stir in sambal until fragrant.",
          "3. Toss the tempeh with the sambal and ketjap; cook briefly until sticky and glossy.",
        ],
        {
          description:
            "Crisp tempeh tossed in a fragrant chile relish for rice-table spreads.",
          dietaryLabels: ["vegetarian", "vegan"],
          prepMinutes: 15,
          cookMinutes: 20,
          difficulty: "easy",
          substitutions: [
            "Tempeh is common in Dutch supermarket Asian aisles; sambal oelek works as the heat base.",
          ],
        },
      ),
      r(
        "pisang-goreng",
        "Fried Banana",
        "Pisang goreng",
        "dessert",
        [
          { name: "ripe bananas", quantity: 4, unit: "pieces" },
          { name: "plain flour", quantity: 100, unit: "g" },
          { name: "rice flour", quantity: 50, unit: "g" },
          { name: "coconut milk", quantity: 120, unit: "ml" },
          { name: "oil", quantity: 500, unit: "ml", note: "for frying" },
        ],
        [
          "1. Whisk flours with coconut milk and a pinch of salt into a thick batter.",
          "2. Halve bananas lengthways, dip in batter, and fry in hot oil until deep golden.",
          "3. Drain on paper and serve warm, optionally dusted with sugar.",
        ],
        {
          description:
            "Batter-fried bananas, crisp outside and soft within.",
          dietaryLabels: ["vegetarian", "vegan"],
          prepMinutes: 10,
          cookMinutes: 15,
          difficulty: "easy",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Bintang Beer",
        "Bir Bintang",
        "beer",
        true,
        "A light Indonesian lager popular with spicy dishes.",
      ),
      drink(
        "Es Cendol",
        "Es cendol",
        "soft-drink",
        false,
        "Iced coconut drink with green rice-flour jelly and palm sugar.",
      ),
      drink(
        "Arak Bali",
        "Arak",
        "spirit",
        true,
        "Traditional distilled spirit; often sipped carefully with food.",
      ),
    ],
  },
  status: "published",
};
