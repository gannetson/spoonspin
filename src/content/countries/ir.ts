import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const irCountry: AuthoredCountry = {
  code: "ir",
  slug: "iran",
  name: "Iran",
  flag: "🇮🇷",
  region: "Asia",
  introduction:
    "Iranian cooking balances fragrant rice, slow stews, fresh herbs, yogurt, and saffron. Shared meals often include chelo, herb-packed khoresh, and endless cups of strong tea.",
  cuisineAliases: [
    "Iranian restaurant",
    "Iraans restaurant",
    "Persian restaurant",
  ],
  nationalDishId: "ghormeh-sabzi",
  nationalDrink: drink(
    "Persian Tea",
    "چای",
    "tea",
    false,
    "Strong black tea poured into small glasses, often with sugar cubes held between the teeth.",
  ),
  menu: {
    starter: r(
      "kashke-bademjan",
      "Eggplant with Whey",
      "کشک بادمجان",
      "starter",
      [
        { name: "aubergines", quantity: 3, unit: "pieces" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "kashk or thick yogurt", quantity: 150, unit: "g" },
        { name: "dried mint", quantity: 5, unit: "g" },
        { name: "walnut", quantity: 40, unit: "g" },
        { name: "oil", quantity: 60, unit: "ml" },
      ],
      [
        "1. Roast or pan-fry aubergine slices until soft and browned; mash roughly with salt.",
        "2. Fry sliced onion until deep golden; set some aside for garnish, cook garlic briefly in the pan.",
        "3. Fold aubergine into the onions, warm through, then swirl with kashk or seasoned yogurt.",
        "4. Top with fried onion, dried mint sizzled in oil, and crushed walnuts.",
      ],
      {
        description:
          "Smoky mashed aubergine finished with tangy kashk, fried onion, and mint — a beloved Persian starter.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 35,
        difficulty: "easy",
        substitutions: [
          "Kashk is in Iranian/Middle Eastern shops; thick Greek yogurt mixed with a pinch of salt is a Dutch-friendly stand-in.",
        ],
      },
    ),
    main: r(
      "ghormeh-sabzi",
      "Herb Stew with Beans",
      "قورمه سبزی",
      "main",
      [
        { name: "lamb or beef stew meat", quantity: 700, unit: "g" },
        { name: "fresh parsley", quantity: 200, unit: "g" },
        { name: "fresh coriander", quantity: 100, unit: "g" },
        { name: "fresh fenugreek or dried", quantity: 20, unit: "g" },
        { name: "leek or spring onion", quantity: 2, unit: "pieces" },
        { name: "dried red kidney beans", quantity: 150, unit: "g", note: "soaked overnight" },
        { name: "dried limes", quantity: 3, unit: "pieces" },
        { name: "turmeric", quantity: 5, unit: "g" },
        { name: "oil", quantity: 60, unit: "ml" },
      ],
      [
        "1. Brown the meat with turmeric and salt; add water and simmer until nearly tender.",
        "2. Finely chop the herbs and leek; fry in oil until dark green and fragrant (do not rush this step).",
        "3. Add fried herbs, soaked beans, and pierced dried limes to the meat; simmer 1½–2 hours until thick and oily on top.",
        "4. Adjust salt and sourness; serve with steamed basmati rice.",
      ],
      {
        description:
          "Iran's most iconic khoresh: slow-cooked herbs, kidney beans, and dried lime with tender meat.",
        dietaryLabels: ["contains-meat", "gluten-free", "dairy-free"],
        prepMinutes: 35,
        cookMinutes: 150,
        difficulty: "medium",
        substitutions: [
          "Dried fenugreek and limoo amani (dried limes) are sold in Iranian shops; lemon zest plus a squeeze of juice is an emergency souring stand-in.",
          "Tinned kidney beans can go in for the last 30 minutes if you skip soaking.",
        ],
      },
    ),
    side: r(
      "salad-shirazi",
      "Shirazi Salad",
      "سالاد شیرازی",
      "side",
      [
        { name: "cucumber", quantity: 3, unit: "pieces" },
        { name: "tomato", quantity: 3, unit: "pieces" },
        { name: "red onion", quantity: 1, unit: "piece" },
        { name: "lime or lemon", quantity: 2, unit: "pieces" },
        { name: "dried mint", quantity: 3, unit: "g" },
        { name: "olive oil", quantity: 30, unit: "ml" },
      ],
      [
        "1. Dice cucumber, tomato, and onion into small, even cubes.",
        "2. Dress with lime juice, olive oil, dried mint, and salt.",
        "3. Rest 10 minutes so the juices mingle; serve chilled beside rice and stew.",
      ],
      {
        description:
          "Finely diced cucumber, tomato, and onion brightened with lime and dried mint.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "sholeh-zard",
      "Saffron Rice Pudding",
      "شله زرد",
      "dessert",
      [
        { name: "short-grain rice", quantity: 150, unit: "g" },
        { name: "sugar", quantity: 200, unit: "g" },
        { name: "water", quantity: 1.2, unit: "litre" },
        { name: "saffron threads", quantity: 0.3, unit: "g" },
        { name: "rose water", quantity: 30, unit: "ml" },
        { name: "butter", quantity: 30, unit: "g" },
        { name: "slivered almonds", quantity: 40, unit: "g" },
        { name: "ground cinnamon", quantity: 5, unit: "g" },
      ],
      [
        "1. Rinse rice and simmer in water until the grains collapse into a soft porridge.",
        "2. Stir in sugar, bloomed saffron water, butter, and rose water; cook until glossy and thick.",
        "3. Pour into a shallow dish, cool, and decorate with cinnamon, almonds, and pistachios if you like.",
      ],
      {
        description:
          "Golden saffron-and-rose rice pudding traditionally served for celebrations and religious occasions.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 50,
        difficulty: "easy",
        substitutions: [
          "A generous pinch of saffron from any spice aisle works; rose water is in Middle Eastern shops.",
        ],
      },
    ),
    drink: drink(
      "Doogh",
      "دوغ",
      "soft-drink",
      false,
      "Salty yogurt drink often sparkling, seasoned with dried mint — non-alcoholic and cooling with khoresh.",
    ),
    moreDrinks: [
      drink(
        "Sekanjabin",
        "سکنجبین",
        "soft-drink",
        false,
        "Sweet-sour mint syrup mixed with water or grated cucumber for a refreshing non-alcoholic cooler.",
      ),
    ],
  },
  status: "published",
};
