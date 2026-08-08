import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const ilCountry: AuthoredCountry = {
  code: "il",
  slug: "israel",
  name: "Israel",
  flag: "🇮🇱",
  region: "Asia",
  introduction:
    "Israeli cooking blends Levantine mezze, Jewish diaspora recipes, and market-fresh produce. Shared tables fill with tahini, herbs, chickpeas, and bright pickles.",
  cuisineAliases: [
    "Israeli restaurant",
    "Israëlisch restaurant",
    "Middle Eastern restaurant",
  ],
  nationalDishId: "falafel",
  nationalDrink: drink(
    "Arak",
    "ערק",
    "spirit",
    true,
    "Anise-flavoured distilled spirit traditionally diluted with water and ice until cloudy.",
  ),
  menu: {
    starter: r(
      "hummus",
      "Hummus",
      "חומוס",
      "starter",
      [
        { name: "dried chickpeas", quantity: 250, unit: "g" },
        { name: "tahini", quantity: 120, unit: "g" },
        { name: "garlic", quantity: 2, unit: "cloves" },
        { name: "lemon", quantity: 2, unit: "pieces" },
        { name: "cumin", quantity: 3, unit: "g" },
        { name: "olive oil", quantity: 40, unit: "ml" },
      ],
      [
        "1. Soak chickpeas overnight, then simmer with a pinch of bicarbonate until very soft; reserve some cooking liquid.",
        "2. Blend hot chickpeas with tahini, garlic, lemon juice, cumin, and salt until silky, loosening with cooking liquid.",
        "3. Spread in a shallow bowl, swirl the centre, and drizzle generously with olive oil.",
        "4. Serve warm with warm pita and pickles.",
      ],
      {
        description:
          "Silky chickpea and tahini dip finished with olive oil, a cornerstone of Israeli mezze.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 90,
        difficulty: "easy",
        substitutions: [
          "Canned chickpeas work if simmered soft first; good tahini from a Middle Eastern shop makes the biggest difference.",
        ],
      },
    ),
    main: r(
      "falafel",
      "Falafel",
      "פלאפל",
      "main",
      [
        { name: "dried chickpeas", quantity: 400, unit: "g", note: "not canned" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "garlic", quantity: 4, unit: "cloves" },
        { name: "fresh parsley", quantity: 40, unit: "g" },
        { name: "fresh coriander", quantity: 40, unit: "g" },
        { name: "cumin", quantity: 8, unit: "g" },
        { name: "coriander seed", quantity: 5, unit: "g" },
        { name: "baking powder", quantity: 5, unit: "g" },
        { name: "oil", quantity: 1, unit: "litre", note: "for frying" },
      ],
      [
        "1. Soak chickpeas 18–24 hours; drain well and do not cook them.",
        "2. Pulse chickpeas with onion, garlic, herbs, spices, and salt to a coarse paste; chill 30 minutes, then mix in baking powder.",
        "3. Shape into small balls or patties and fry at 170–175°C until deep green-gold.",
        "4. Drain and serve in pita with salad, pickles, and tahini sauce.",
      ],
      {
        description:
          "Herb-packed chickpea fritters fried crisp and tucked into warm pita with tahini.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 30,
        cookMinutes: 20,
        difficulty: "medium",
        substitutions: [
          "Dried chickpeas are essential for texture; canned chickpeas make soggy falafel.",
        ],
      },
    ),
    side: r(
      "israeli-salad",
      "Israeli Salad",
      "סלט ישראלי",
      "side",
      [
        { name: "cucumber", quantity: 400, unit: "g" },
        { name: "tomatoes", quantity: 400, unit: "g" },
        { name: "red onion", quantity: 0.5, unit: "piece" },
        { name: "fresh parsley", quantity: 20, unit: "g" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "olive oil", quantity: 30, unit: "ml" },
      ],
      [
        "1. Dice cucumber and tomato into small, even cubes; finely chop onion and parsley.",
        "2. Toss with lemon juice, olive oil, and salt just before serving.",
        "3. Taste and add more lemon if you want it sharper.",
        "4. Serve cold beside falafel, grilled meat, or eggs.",
      ],
      {
        description:
          "Finely diced cucumber-tomato salad dressed simply with lemon and olive oil.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "malabi",
      "Malabi",
      "מלבי",
      "dessert",
      [
        { name: "milk", quantity: 700, unit: "ml" },
        { name: "cream", quantity: 200, unit: "ml" },
        { name: "sugar", quantity: 80, unit: "g" },
        { name: "cornflour", quantity: 50, unit: "g" },
        { name: "rose water", quantity: 15, unit: "ml" },
        { name: "pomegranate molasses or syrup", quantity: 40, unit: "ml" },
        { name: "chopped pistachios", quantity: 40, unit: "g" },
      ],
      [
        "1. Whisk cornflour with a splash of cold milk; heat remaining milk, cream, and sugar until steaming.",
        "2. Whisk in the cornflour mixture and cook, stirring, until thick and glossy.",
        "3. Stir in rose water, pour into cups, and chill until set.",
        "4. Top with syrup and pistachios before serving.",
      ],
      {
        description:
          "Chilled milk pudding scented with rose water and finished with syrup and pistachios.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 15,
        difficulty: "easy",
        substitutions: [
          "Rose water is in Middle Eastern shops; orange blossom water is a good alternative.",
        ],
      },
    ),
    drink: drink(
      "Limonana",
      "לימונענע",
      "soft-drink",
      false,
      "Iced lemonade blended with fresh mint leaves until frothy and fragrant.",
    ),
    moreDrinks: [
      drink(
        "Turkish Coffee",
        "קפה שחור",
        "coffee",
        false,
        "Finely ground coffee brewed in a small pot and served unfiltered in tiny cups.",
      ),
      drink(
        "Goldstar-style Lager",
        "בירה",
        "beer",
        true,
        "A malty amber lager commonly paired with grilled meats and mezze.",
      ),
    ],
  },
  status: "published",
};
