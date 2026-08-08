import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const snCountry: AuthoredCountry = {
  code: "sn",
  slug: "senegal",
  name: "Senegal",
  flag: "🇸🇳",
  region: "Africa",
  introduction:
    "Senegalese food brings Atlantic fish, rice, vegetables, peanuts, and chile together in generous one-pot dishes. Family cooking often begins with a flavourful onion-and-herb marinade.",
  cuisineAliases: [
    "Senegalese restaurant",
    "Senegalees restaurant",
    "West African restaurant",
  ],
  nationalDishId: "thieboudienne",
  nationalDrink: drink(
    "Bissap",
    "Bissap",
    "soft-drink",
    false,
    "A tart, ruby-red chilled hibiscus drink.",
  ),
  menu: {
    starter: r(
      "accras",
      "Fish Fritters",
      "Accras",
      "starter",
      [
        { name: "white fish", quantity: 300, unit: "g" },
        { name: "plain flour", quantity: 120, unit: "g" },
        { name: "spring onions", quantity: 3, unit: "pieces" },
        { name: "garlic", quantity: 2, unit: "cloves" },
        { name: "parsley", quantity: 15, unit: "g" },
        { name: "egg", quantity: 1, unit: "piece" },
        { name: "oil", quantity: 500, unit: "ml", note: "for frying" },
      ],
      [
        "1. Flake the fish and mix with chopped spring onion, garlic, parsley, egg, flour, and salt into a thick batter.",
        "2. Heat oil to about 170°C.",
        "3. Drop spoonfuls of batter into the oil and fry until puffed and golden.",
        "4. Drain and serve hot.",
      ],
      {
        description:
          "Herb-flecked fish fritters fried until crisp and golden.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 20,
        cookMinutes: 15,
        difficulty: "easy",
      },
    ),
    main: r(
      "thieboudienne",
      "Fish and Rice",
      "Ceebu jën",
      "main",
      [
        { name: "firm white fish steaks", quantity: 700, unit: "g" },
        { name: "broken rice or long-grain rice", quantity: 450, unit: "g" },
        { name: "tomatoes", quantity: 500, unit: "g" },
        { name: "tomato paste", quantity: 60, unit: "g" },
        { name: "cassava or potato", quantity: 300, unit: "g" },
        { name: "carrot", quantity: 200, unit: "g" },
        { name: "cabbage", quantity: 300, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
      ],
      [
        "1. Blend parsley, garlic, and a little chile into a marinade (rof); stuff or rub into scored fish and set aside.",
        "2. Fry onion and tomato paste, add chopped tomatoes and water, then simmer root vegetables and cabbage until nearly tender.",
        "3. Nestle in the fish and cook gently until just done; lift fish and vegetables out.",
        "4. Cook the rice in the remaining tomato broth until fluffy, then reassemble everything on a large platter.",
      ],
      {
        description:
          "Senegal's best-known fish, tomato, vegetable, and rice platter.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 35,
        cookMinutes: 60,
        difficulty: "challenging",
        substitutions: [
          "Broken rice is traditional; ordinary long-grain rice works. Potato replaces cassava easily.",
        ],
      },
    ),
    side: r(
      "peanut-salad",
      "Peanut Cabbage Salad",
      "Salade arachide",
      "side",
      [
        { name: "cabbage", quantity: 500, unit: "g" },
        { name: "roasted peanuts", quantity: 100, unit: "g" },
        { name: "lime", quantity: 2, unit: "pieces" },
        { name: "carrot", quantity: 1, unit: "piece" },
        { name: "oil", quantity: 30, unit: "ml" },
      ],
      [
        "1. Shred cabbage and carrot finely.",
        "2. Crush the peanuts roughly.",
        "3. Toss vegetables with lime juice, oil, salt, and peanuts; rest 10 minutes.",
      ],
      {
        description:
          "Crunchy cabbage salad brightened with lime and roasted peanuts.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "thiakry",
      "Millet Yogurt Dessert",
      "Thiakry",
      "dessert",
      [
        { name: "millet couscous or tiny pasta", quantity: 250, unit: "g" },
        { name: "yogurt", quantity: 500, unit: "g" },
        { name: "evaporated or whole milk", quantity: 150, unit: "ml" },
        { name: "raisins", quantity: 80, unit: "g" },
        { name: "sugar", quantity: 60, unit: "g" },
        { name: "nutmeg", quantity: 2, unit: "g" },
      ],
      [
        "1. Steam or soak the millet couscous until tender; cool.",
        "2. Whisk yogurt with milk, sugar, and nutmeg.",
        "3. Fold in the grains and raisins; chill at least 1 hour.",
        "4. Serve cold, optionally topped with more nutmeg.",
      ],
      {
        description:
          "Cool sweetened yogurt folded with millet grains and raisins.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 15,
        cookMinutes: 15,
        difficulty: "easy",
        substitutions: [
          "Fine couscous or tiny pasta (acini di pepe) can replace millet couscous.",
        ],
      },
    ),
    drink: drink(
      "Ginger Juice",
      "Gingembre",
      "soft-drink",
      false,
      "Fresh ginger, lemon, and sugar chilled over ice.",
    ),
    moreRecipes: [
      r(
        "yassa-poulet",
        "Chicken Yassa",
        "Yassa poulet",
        "main",
        [
          { name: "chicken pieces", quantity: 1000, unit: "g" },
          { name: "onions", quantity: 4, unit: "pieces" },
          { name: "lemons", quantity: 3, unit: "pieces" },
          { name: "Dijon mustard", quantity: 30, unit: "g" },
          { name: "garlic", quantity: 4, unit: "cloves" },
        ],
        [
          "1. Marinate chicken in lemon juice, mustard, garlic, and sliced onion for at least 2 hours.",
          "2. Grill or sear the chicken until browned.",
          "3. Caramelise the marinated onions in the pan, add a splash of water, and return the chicken to simmer until tender.",
          "4. Serve with rice, spooning over the tangy onion sauce.",
        ],
        {
          description:
            "Onion-lemon marinated chicken grilled then simmered in a tangy caramelised sauce.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 30,
          cookMinutes: 45,
          difficulty: "medium",
        },
      ),
      r(
        "maafe",
        "Peanut Stew",
        "Mafé",
        "main",
        [
          { name: "beef or chicken", quantity: 700, unit: "g" },
          { name: "natural peanut butter", quantity: 150, unit: "g" },
          { name: "tomato paste", quantity: 60, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "sweet potato or carrot", quantity: 300, unit: "g" },
        ],
        [
          "1. Brown the meat and soften onion in the same pot.",
          "2. Stir in tomato paste, then loosen peanut butter with stock or water and add it to the pot.",
          "3. Add root vegetables and simmer until the meat is tender and the sauce is thick and glossy.",
          "4. Season and serve over rice.",
        ],
        {
          description:
            "Rich peanut and tomato stew with tender meat or vegetables, served over rice.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 20,
          cookMinutes: 60,
          difficulty: "easy",
        },
      ),
      r(
        "fataya",
        "Fish Pastries",
        "Fataya",
        "snack",
        [
          { name: "plain flour", quantity: 300, unit: "g" },
          { name: "cooked flaked fish", quantity: 250, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "parsley", quantity: 20, unit: "g" },
          { name: "oil", quantity: 500, unit: "ml", note: "for frying" },
        ],
        [
          "1. Make a simple dough with flour, water, oil, and salt; rest 20 minutes.",
          "2. Soften onion, mix with flaked fish, parsley, and seasoning; cool.",
          "3. Roll dough, cut circles, fill, and seal into half-moons.",
          "4. Fry until golden and blistered; drain well.",
        ],
        {
          description:
            "Crisp half-moon pastries filled with seasoned fish, onion, and herbs.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 35,
          cookMinutes: 20,
          difficulty: "medium",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Attaya Tea",
        "Attaya",
        "tea",
        false,
        "Strong sweet green tea poured with a frothy head in small glasses.",
      ),
      drink(
        "Bouye Juice",
        "Bouye",
        "soft-drink",
        false,
        "Creamy baobab-fruit drink, sweetened and served cold.",
      ),
    ],
  },
  status: "published",
};
