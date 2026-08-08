import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const auCountry: AuthoredCountry = {
  code: "au",
  slug: "australia",
  name: "Australia",
  flag: "🇦🇺",
  region: "Oceania",
  introduction:
    "Australian home cooking mixes British roast traditions with beachside seafood and multicultural city flavours. Weekend barbecues and pavlova remain lasting icons.",
  cuisineAliases: [
    "Australian restaurant",
    "Australisch restaurant",
    "Aussie restaurant",
  ],
  nationalDishId: "roast-lamb",
  nationalDrink: drink(
    "Australian Lager",
    "Beer",
    "beer",
    true,
    "A cold pale lager, the everyday drink of barbecues and pub meals across Australia.",
  ),
  menu: {
    starter: r(
      "pumpkin-soup",
      "Roast Pumpkin Soup",
      "Pumpkin soup",
      "starter",
      [
        { name: "Jap or butternut pumpkin", quantity: 1, unit: "kg" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "garlic", quantity: 2, unit: "cloves" },
        { name: "vegetable or chicken stock", quantity: 800, unit: "ml" },
        { name: "cream", quantity: 80, unit: "ml" },
        { name: "olive oil", quantity: 30, unit: "ml" },
        { name: "thyme", quantity: 3, unit: "g" },
      ],
      [
        "1. Roast cubed pumpkin with onion, garlic, oil, and thyme until caramelised.",
        "2. Blend with hot stock until smooth; simmer briefly to marry flavours.",
        "3. Stir in cream, season with salt and pepper.",
        "4. Serve with crusty bread or damper.",
      ],
      {
        description:
          "Silky roasted pumpkin soup finished with cream, a staple of Australian winter tables.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 40,
        difficulty: "easy",
      },
    ),
    main: r(
      "roast-lamb",
      "Roast Lamb",
      "Sunday roast lamb",
      "main",
      [
        { name: "leg of lamb", quantity: 1.5, unit: "kg" },
        { name: "garlic", quantity: 6, unit: "cloves" },
        { name: "fresh rosemary", quantity: 10, unit: "g" },
        { name: "olive oil", quantity: 30, unit: "ml" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "potatoes", quantity: 800, unit: "g" },
        { name: "salt", quantity: 8, unit: "g" },
      ],
      [
        "1. Score the lamb lightly and rub with oil, crushed garlic, rosemary, lemon zest, and salt.",
        "2. Roast at 200°C for 20 minutes, then at 170°C until medium-rare to medium (about 20 minutes per 500 g).",
        "3. Toss potatoes in the pan juices and roast until crisp.",
        "4. Rest the lamb 15 minutes, carve, and serve with gravy or mint sauce.",
      ],
      {
        description:
          "Garlic-and-rosemary roast leg of lamb with crisp potatoes, often named Australia's national dish.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 90,
        difficulty: "medium",
      },
    ),
    side: r(
      "damper",
      "Damper",
      "Damper",
      "side",
      [
        { name: "self-raising flour", quantity: 450, unit: "g" },
        { name: "butter", quantity: 40, unit: "g" },
        { name: "milk", quantity: 250, unit: "ml" },
        { name: "salt", quantity: 4, unit: "g" },
      ],
      [
        "1. Rub butter into flour and salt, then mix in milk to a soft dough.",
        "2. Shape into a round loaf and score a cross on top.",
        "3. Bake at 200°C until hollow-sounding and golden, about 30 minutes.",
        "4. Serve warm with butter, golden syrup, or beside the roast.",
      ],
      {
        description:
          "Simple bush bread baked as a round loaf, traditionally cooked in campfire coals.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 15,
        cookMinutes: 30,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "pavlova",
      "Pavlova",
      "Pavlova",
      "dessert",
      [
        { name: "egg whites", quantity: 4, unit: "pieces" },
        { name: "caster sugar", quantity: 220, unit: "g" },
        { name: "cornflour", quantity: 10, unit: "g" },
        { name: "white vinegar", quantity: 5, unit: "ml" },
        { name: "vanilla", quantity: 5, unit: "ml" },
        { name: "double cream", quantity: 300, unit: "ml" },
        { name: "mixed berries and passionfruit", quantity: 300, unit: "g" },
      ],
      [
        "1. Whip egg whites to soft peaks, then gradually beat in sugar until thick and glossy.",
        "2. Fold in cornflour, vinegar, and vanilla; mound onto baking paper and shape a nest.",
        "3. Bake at 120°C for about 75 minutes, then cool in the oven with the door ajar.",
        "4. Top with whipped cream and fresh fruit just before serving.",
      ],
      {
        description:
          "Crisp-shelled meringue cake with a marshmallow centre, cream, and summer fruit.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 25,
        cookMinutes: 75,
        difficulty: "medium",
      },
    ),
    drink: drink(
      "Lemon Squash",
      "Lemon squash",
      "soft-drink",
      false,
      "Sweet lemon cordial diluted with cold or sparkling water over ice.",
    ),
    moreDrinks: [
      drink(
        "Flat White",
        "Flat white",
        "coffee",
        false,
        "Espresso topped with velvety microfoam milk, an Australian café classic.",
      ),
      drink(
        "Shiraz",
        "Shiraz",
        "wine",
        true,
        "Full-bodied red wine from Australian vineyards, excellent with roast lamb.",
      ),
    ],
  },
  status: "published",
};
