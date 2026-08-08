import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const boCountry: AuthoredCountry = {
  code: "bo",
  slug: "bolivia",
  name: "Bolivia",
  flag: "🇧🇴",
  region: "Americas",
  introduction:
    "Bolivian cooking leans on potatoes, corn, quinoa, and bold ají heat from highland and lowland kitchens. Street snacks and hearty meat plates fuel cold Andean days.",
  cuisineAliases: [
    "Bolivian restaurant",
    "Boliviaans restaurant",
    "Andean restaurant",
  ],
  nationalDishId: "saltenas",
  nationalDrink: drink(
    "Singani",
    "Singani",
    "spirit",
    true,
    "A clear brandy distilled from muscat grapes in the Bolivian Andes, often mixed in cocktails.",
  ),
  menu: {
    starter: r(
      "llajwa",
      "Llajwa Salsa",
      "Llajwa",
      "starter",
      [
        { name: "tomatoes", quantity: 400, unit: "g" },
        { name: "locoto or hot chilli", quantity: 2, unit: "pieces" },
        { name: "fresh coriander", quantity: 20, unit: "g" },
        { name: "onion", quantity: 0.5, unit: "piece" },
        { name: "salt", quantity: 4, unit: "g" },
      ],
      [
        "1. Roughly chop tomato, chilli, onion, and coriander.",
        "2. Pound or pulse to a coarse salsa; do not make it completely smooth.",
        "3. Season with salt and rest 10 minutes for the flavours to bloom.",
        "4. Serve with bread, potatoes, or grilled meat as a sharp starter dip.",
      ],
      {
        description:
          "Fresh tomato-and-chilli salsa pounded with coriander, essential on Bolivian tables.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
        substitutions: [
          "Fresno or jalapeño chillies stand in for locoto when Andean peppers are unavailable.",
        ],
      },
    ),
    main: r(
      "saltenas",
      "Salteñas",
      "Salteñas",
      "main",
      [
        { name: "plain flour", quantity: 500, unit: "g" },
        { name: "butter or lard", quantity: 100, unit: "g" },
        { name: "egg", quantity: 2, unit: "pieces" },
        { name: "beef or chicken", quantity: 400, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "potato", quantity: 200, unit: "g" },
        { name: "peas", quantity: 80, unit: "g" },
        { name: "gelatine or broth jelly", quantity: 10, unit: "g" },
        { name: "cumin", quantity: 4, unit: "g" },
        { name: "sweet paprika", quantity: 5, unit: "g" },
        { name: "olives", quantity: 8, unit: "pieces" },
        { name: "hard-boiled eggs", quantity: 2, unit: "pieces" },
      ],
      [
        "1. Cook a juicy stew of meat, onion, potato, peas, and spices; dissolve gelatine in the hot broth and chill until jellied.",
        "2. Make an orange-tinted dough with flour, fat, egg, salt, and a pinch of paprika; rest.",
        "3. Fill dough rounds with jellied stew, egg, and olive; braid-seal into plump turnovers.",
        "4. Bake at 200°C until deep golden so the filling melts into a hot broth inside.",
      ],
      {
        description:
          "Juicy baked turnovers with a spiced meat stew that turns soupy when hot.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 50,
        cookMinutes: 40,
        difficulty: "challenging",
        substitutions: [
          "The gelatine step recreates the signature soupy interior; skip it only if you prefer a drier filling.",
        ],
      },
    ),
    side: r(
      "quinoa-salad",
      "Quinoa Salad",
      "Ensalada de quinua",
      "side",
      [
        { name: "quinoa", quantity: 250, unit: "g" },
        { name: "cucumber", quantity: 200, unit: "g" },
        { name: "tomato", quantity: 200, unit: "g" },
        { name: "fresh cheese or feta", quantity: 100, unit: "g" },
        { name: "lime", quantity: 2, unit: "pieces" },
        { name: "olive oil", quantity: 30, unit: "ml" },
        { name: "fresh herbs", quantity: 20, unit: "g" },
      ],
      [
        "1. Rinse quinoa and simmer until tender; fluff and cool.",
        "2. Dice cucumber and tomato; crumble the cheese.",
        "3. Dress with lime, oil, salt, and herbs.",
        "4. Toss gently and serve cool beside salteñas or grilled meats.",
      ],
      {
        description:
          "Cool Andean quinoa salad with tomato, cucumber, herbs, and fresh cheese.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 20,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "bunuelos",
      "Buñuelos",
      "Buñuelos",
      "dessert",
      [
        { name: "plain flour", quantity: 300, unit: "g" },
        { name: "eggs", quantity: 2, unit: "pieces" },
        { name: "milk", quantity: 150, unit: "ml" },
        { name: "aniseed", quantity: 5, unit: "g" },
        { name: "baking powder", quantity: 5, unit: "g" },
        { name: "oil", quantity: 1, unit: "litre", note: "for frying" },
        { name: "cane syrup or honey", quantity: 150, unit: "ml" },
      ],
      [
        "1. Mix flour, baking powder, aniseed, eggs, and milk into a soft sticky dough; rest 20 minutes.",
        "2. Stretch portions thin and fry until puffed and golden.",
        "3. Drain briefly on paper.",
        "4. Drizzle with warm cane syrup or honey and serve immediately.",
      ],
      {
        description:
          "Anise-scented fried dough puffs finished with warm cane syrup.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 25,
        cookMinutes: 20,
        difficulty: "medium",
      },
    ),
    drink: drink(
      "Api Morado",
      "Api morado",
      "soft-drink",
      false,
      "Warm purple-corn drink spiced with cinnamon and cloves, popular at breakfast.",
    ),
    moreDrinks: [
      drink(
        "Chuflay",
        "Chuflay",
        "cocktail",
        true,
        "Singani mixed with ginger ale and lime over ice, a classic Bolivian highball.",
      ),
      drink(
        "Mocochinchi",
        "Mocochinchi",
        "soft-drink",
        false,
        "Sweet dried-peach drink served cold with the rehydrated fruit in the glass.",
      ),
    ],
  },
  status: "published",
};
