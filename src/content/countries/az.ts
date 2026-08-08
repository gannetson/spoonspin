import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const azCountry: AuthoredCountry = {
  code: "az",
  slug: "azerbaijan",
  name: "Azerbaijan",
  flag: "🇦🇿",
  region: "Asia",
  introduction:
    "Azerbaijani cooking prizes fragrant rice plovs, fresh herbs, and grilled or slow-cooked meats. Tea culture and generous hospitality shape every meal.",
  cuisineAliases: [
    "Azerbaijani restaurant",
    "Azerbeidzjaans restaurant",
    "Caucasian restaurant",
  ],
  nationalDishId: "plov",
  nationalDrink: drink(
    "Black Tea",
    "Çay",
    "tea",
    false,
    "Strong black tea served in pear-shaped glasses, the everyday national drink of Azerbaijan.",
  ),
  menu: {
    starter: r(
      "qutab",
      "Herb Qutab",
      "Qutab",
      "starter",
      [
        { name: "plain flour", quantity: 300, unit: "g" },
        { name: "mixed herbs (spinach, coriander, dill)", quantity: 300, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "butter", quantity: 40, unit: "g" },
        { name: "sumac", quantity: 5, unit: "g" },
      ],
      [
        "1. Knead flour, salt, and water into a soft dough; rest 20 minutes.",
        "2. Chop herbs and onion finely, season with salt and sumac.",
        "3. Roll thin rounds, fill half with herbs, fold into half-moons, and seal.",
        "4. Cook on a dry hot saj or pan until spotted, then brush with butter.",
      ],
      {
        description:
          "Thin griddled flatbreads folded around a bright herb filling and brushed with butter.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 30,
        cookMinutes: 20,
        difficulty: "medium",
        substitutions: [
          "Sumac is in Middle Eastern shops; a squeeze of lemon adds similar brightness.",
        ],
      },
    ),
    main: r(
      "plov",
      "Saffron Plov",
      "Aş / Plov",
      "main",
      [
        { name: "basmati or long-grain rice", quantity: 400, unit: "g" },
        { name: "lamb shoulder", quantity: 600, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "dried apricots", quantity: 80, unit: "g" },
        { name: "chestnuts or chickpeas", quantity: 150, unit: "g" },
        { name: "butter or oil", quantity: 80, unit: "g" },
        { name: "saffron", quantity: 0.3, unit: "g" },
        { name: "turmeric", quantity: 2, unit: "g" },
      ],
      [
        "1. Brown lamb with onion; add a little water and simmer until tender.",
        "2. Parboil rinsed rice in salted water until half-cooked; drain.",
        "3. Layer meat, fruit, and chickpeas or chestnuts under the rice; drizzle saffron water and butter.",
        "4. Steam covered on low heat until the rice is fluffy and a golden crust forms at the bottom.",
      ],
      {
        description:
          "Steamed saffron rice layered with lamb, dried fruit, and a crisp bottom crust.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 30,
        cookMinutes: 90,
        difficulty: "challenging",
        substitutions: [
          "A pinch of turmeric plus a little hot water stands in when saffron is scarce, though the aroma differs.",
        ],
      },
    ),
    side: r(
      "choban-salati",
      "Shepherd Salad",
      "Çoban salatı",
      "side",
      [
        { name: "tomatoes", quantity: 400, unit: "g" },
        { name: "cucumber", quantity: 300, unit: "g" },
        { name: "red onion", quantity: 1, unit: "piece" },
        { name: "fresh herbs (parsley, dill)", quantity: 30, unit: "g" },
        { name: "olive oil", quantity: 30, unit: "ml" },
        { name: "lemon", quantity: 1, unit: "piece" },
      ],
      [
        "1. Dice tomato, cucumber, and onion into even pieces.",
        "2. Chop herbs and toss everything with oil, lemon, and salt.",
        "3. Taste and adjust acidity.",
        "4. Serve immediately beside plov or grilled meats.",
      ],
      {
        description:
          "Fresh tomato-cucumber salad with plenty of herbs and lemon.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "pakhlava",
      "Pakhlava",
      "Paxlava",
      "dessert",
      [
        { name: "filo pastry", quantity: 400, unit: "g" },
        { name: "walnuts", quantity: 300, unit: "g" },
        { name: "sugar", quantity: 100, unit: "g" },
        { name: "butter", quantity: 200, unit: "g" },
        { name: "honey or sugar syrup", quantity: 250, unit: "g" },
        { name: "cardamom", quantity: 2, unit: "g" },
      ],
      [
        "1. Grind walnuts with sugar and cardamom for the filling.",
        "2. Layer buttered filo with nut filling in a tray, finishing with pastry on top.",
        "3. Cut into diamonds, bake at 170°C until deep golden.",
        "4. Pour warm syrup over the hot pastry and cool completely before serving.",
      ],
      {
        description:
          "Diamond-cut layered nut pastry soaked in honey or sugar syrup.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 40,
        cookMinutes: 45,
        difficulty: "challenging",
      },
    ),
    drink: drink(
      "Sherbet",
      "Şərbət",
      "soft-drink",
      false,
      "Sweet fruit or flower cordial diluted with cold water and served over ice.",
    ),
    moreDrinks: [
      drink(
        "Ayran",
        "Ayran",
        "soft-drink",
        false,
        "Salted yoghurt drink whisked until frothy and served ice-cold.",
      ),
      drink(
        "Pomegranate Wine",
        "Nar şərabı",
        "wine",
        true,
        "A sweet-tart wine made from pomegranates, a fruit emblematic of Azerbaijan.",
      ),
    ],
  },
  status: "published",
};
