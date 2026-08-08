import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const vnCountry: AuthoredCountry = {
  code: "vn",
  slug: "vietnam",
  name: "Vietnam",
  flag: "🇻🇳",
  region: "Asia",
  introduction:
    "Vietnamese food balances fresh herbs, rice noodles, savoury broths, lime, and chile. Each region brings its own accent, from clear northern soups to southern sweetness.",
  cuisineAliases: ["Vietnamese restaurant", "Vietnamees restaurant", "phở restaurant"],
  nationalDishId: "pho-bo",
  nationalDrink: drink(
    "Vietnamese Coffee",
    "Cà phê sữa đá",
    "coffee",
    false,
    "Dark drip coffee over ice with condensed milk.",
  ),
  menu: {
    starter: r(
      "goi-cuon",
      "Fresh Summer Rolls",
      "Gỏi cuốn",
      "starter",
      [
        { name: "rice paper", quantity: 12, unit: "sheets" },
        { name: "prawns", quantity: 300, unit: "g" },
        { name: "rice vermicelli", quantity: 150, unit: "g" },
        { name: "lettuce", quantity: 100, unit: "g" },
        { name: "fresh mint and coriander", quantity: 30, unit: "g" },
        { name: "hoisin-peanut dipping sauce", quantity: 100, unit: "ml" },
      ],
      [
        "1. Poach prawns until just pink; cook vermicelli and rinse under cold water.",
        "2. Soften a rice paper sheet in warm water until pliable.",
        "3. Layer lettuce, herbs, noodles, and prawns; roll tightly, tucking in the sides.",
        "4. Serve with hoisin-peanut or nuoc cham dipping sauce.",
      ],
      {
        description:
          "Fresh rice-paper rolls packed with prawns, herbs, and cool vermicelli.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 30,
        cookMinutes: 10,
        difficulty: "medium",
        substitutions: [
          "Tofu replaces prawns for a vegetarian roll; ready dipping sauces are widely available.",
        ],
      },
    ),
    main: r(
      "pho-bo",
      "Beef Noodle Soup",
      "Phở bò",
      "main",
      [
        { name: "beef bones", quantity: 1500, unit: "g" },
        { name: "flat rice noodles", quantity: 400, unit: "g" },
        { name: "beef sirloin", quantity: 400, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "fresh ginger", quantity: 80, unit: "g" },
        { name: "star anise", quantity: 4, unit: "pieces" },
        { name: "cinnamon stick", quantity: 1, unit: "piece" },
        { name: "fish sauce", quantity: 45, unit: "ml" },
      ],
      [
        "1. Char onion and ginger under a grill or in a dry pan; blanch bones briefly and rinse.",
        "2. Simmer bones with charred aromatics, star anise, and cinnamon 3–4 hours; skim and season with fish sauce and salt.",
        "3. Strain the broth, cook the noodles, and slice raw sirloin very thin.",
        "4. Place noodles and beef in bowls, ladle boiling broth over to cook the beef, and serve with herbs, lime, and chile.",
      ],
      {
        description:
          "An aromatic beef broth with rice noodles, herbs, and thinly sliced beef.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 40,
        cookMinutes: 240,
        difficulty: "challenging",
        substitutions: [
          "Good shop-bought pho broth plus extra spices shortens the process for a weeknight version.",
        ],
      },
    ),
    side: r(
      "do-chua",
      "Pickled Carrot and Daikon",
      "Đồ chua",
      "side",
      [
        { name: "daikon radish", quantity: 300, unit: "g" },
        { name: "carrots", quantity: 300, unit: "g" },
        { name: "rice vinegar", quantity: 150, unit: "ml" },
        { name: "sugar", quantity: 80, unit: "g" },
        { name: "water", quantity: 150, unit: "ml" },
        { name: "salt", quantity: 8, unit: "g" },
      ],
      [
        "1. Cut carrot and daikon into thin matchsticks.",
        "2. Dissolve sugar and salt in vinegar and water.",
        "3. Pack the vegetables into a jar, pour over the brine, and chill at least 1 hour.",
      ],
      {
        description:
          "Quick-pickled carrot and daikon matchsticks for bánh mì and rice plates.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 20,
        cookMinutes: 0,
        difficulty: "easy",
        substitutions: [
          "If daikon is unavailable, use extra carrot or mild white radish.",
        ],
      },
    ),
    dessert: r(
      "che-chuoi",
      "Banana Coconut Pudding",
      "Chè chuối",
      "dessert",
      [
        { name: "ripe bananas", quantity: 5, unit: "pieces" },
        { name: "coconut milk", quantity: 500, unit: "ml" },
        { name: "tapioca pearls", quantity: 100, unit: "g" },
        { name: "sugar", quantity: 60, unit: "g" },
        { name: "toasted sesame or peanuts", quantity: 30, unit: "g" },
      ],
      [
        "1. Simmer tapioca pearls in water until translucent; drain.",
        "2. Warm coconut milk with sugar, add thick banana slices, and cook gently until soft.",
        "3. Fold in the tapioca and simmer a minute more.",
        "4. Serve warm or chilled with toasted sesame or crushed peanuts.",
      ],
      {
        description:
          "Warm banana and coconut pudding thickened with chewy tapioca pearls.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 25,
        difficulty: "easy",
      },
    ),
    drink: drink(
      "Lime Soda",
      "Soda chanh",
      "soft-drink",
      false,
      "Sparkling water sharply flavoured with fresh lime.",
    ),
    moreRecipes: [
      r(
        "banh-mi",
        "Vietnamese Banh Mi",
        "Bánh mì",
        "main",
        [
          { name: "baguettes", quantity: 4, unit: "pieces" },
          { name: "pork or tofu", quantity: 300, unit: "g" },
          { name: "pickled carrot and daikon", quantity: 150, unit: "g" },
          { name: "fresh coriander", quantity: 20, unit: "g" },
          { name: "mayonnaise", quantity: 60, unit: "g" },
          { name: "liver pâté", quantity: 60, unit: "g", note: "optional" },
        ],
        [
          "1. Season and cook pork (or pan-fry tofu) until caramelised.",
          "2. Split warm baguettes, smear with mayo and pâté if using.",
          "3. Layer protein, pickles, cucumber, coriander, and sliced chile.",
          "4. Finish with a splash of soy or Maggi-style seasoning.",
        ],
        {
          description:
            "Crisp baguette filled with pâté, mayo, pickled vegetables, herbs, and seasoned protein.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 25,
          cookMinutes: 15,
          difficulty: "easy",
        },
      ),
      r(
        "bun-cha",
        "Hanoi Bun Cha",
        "Bún chả",
        "main",
        [
          { name: "minced pork", quantity: 400, unit: "g" },
          { name: "pork belly slices", quantity: 300, unit: "g" },
          { name: "rice vermicelli", quantity: 300, unit: "g" },
          { name: "fish sauce", quantity: 60, unit: "ml" },
          { name: "sugar", quantity: 40, unit: "g" },
          { name: "garlic", quantity: 4, unit: "cloves" },
        ],
        [
          "1. Season minced pork with fish sauce, sugar, and garlic; form small patties.",
          "2. Grill patties and pork belly until charred and cooked through.",
          "3. Mix a dipping broth of dilute fish sauce, sugar, lime, garlic, and chile.",
          "4. Serve grilled pork in the broth with noodles and a heap of herbs on the side.",
        ],
        {
          description:
            "Grilled pork patties and slices in a sweet-salty broth with rice noodles and herbs.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 30,
          cookMinutes: 25,
          difficulty: "medium",
        },
      ),
      r(
        "banh-xeo",
        "Sizzling Crepes",
        "Bánh xèo",
        "starter",
        [
          { name: "rice flour", quantity: 200, unit: "g" },
          { name: "turmeric", quantity: 3, unit: "g" },
          { name: "coconut milk", quantity: 100, unit: "ml" },
          { name: "prawns", quantity: 200, unit: "g" },
          { name: "beansprouts", quantity: 150, unit: "g" },
          { name: "spring onion", quantity: 2, unit: "pieces" },
        ],
        [
          "1. Whisk rice flour, turmeric, coconut milk, and water into a thin batter; rest 20 minutes.",
          "2. Heat a well-oiled pan until very hot, pour a thin crepe, and scatter prawns and beansprouts.",
          "3. Cover briefly, then cook uncovered until the edges are lacy and crisp.",
          "4. Fold and eat wrapped in lettuce with herbs and dipping sauce.",
        ],
        {
          description:
            "Turmeric rice crepes filled with prawns and beansprouts, eaten in lettuce wraps.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 25,
          cookMinutes: 20,
          difficulty: "medium",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Bia Saigon / Vietnamese Lager",
        "Bia",
        "beer",
        true,
        "Light lager that pairs well with herbs, noodles, and grilled pork.",
      ),
      drink(
        "Tra Da",
        "Trà đá",
        "tea",
        false,
        "Iced jasmine or green tea served throughout the meal.",
      ),
    ],
  },
  status: "published",
};
