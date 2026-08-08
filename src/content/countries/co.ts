import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const coCountry: AuthoredCountry = {
  code: "co",
  slug: "colombia",
  name: "Colombia",
  flag: "🇨🇴",
  region: "Americas",
  introduction:
    "Colombian cooking varies by coast, Andes, and plains, but comfort plates of soup, corn, plantain, and slow-cooked meats are shared nationwide. Aji and lime keep flavours bright.",
  cuisineAliases: [
    "Colombian restaurant",
    "Colombiaans restaurant",
    "Latin American restaurant",
  ],
  nationalDishId: "ajiaco",
  nationalDrink: drink(
    "Aguardiente",
    "Aguardiente",
    "spirit",
    true,
    "Anise-scented sugarcane spirit traditionally shared neat at celebrations.",
  ),
  menu: {
    starter: r(
      "empanadas",
      "Potato Empanadas",
      "Empanadas de papa",
      "starter",
      [
        { name: "yellow cornmeal (masarepa)", quantity: 300, unit: "g" },
        { name: "potato", quantity: 400, unit: "g" },
        { name: "ground beef or chicken", quantity: 250, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "cumin", quantity: 4, unit: "g" },
        { name: "oil", quantity: 1, unit: "litre", note: "for frying" },
      ],
      [
        "1. Mix masarepa with hot salted water into a soft dough; rest 10 minutes.",
        "2. Cook and mash potato; fry onion with meat and cumin, then mix into the potato.",
        "3. Flatten dough discs, fill, seal into half-moons, and fry until deep gold.",
        "4. Drain and serve hot with ají sauce.",
      ],
      {
        description:
          "Crisp cornmeal turnovers filled with spiced potato and meat, served with hot sauce.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 35,
        cookMinutes: 30,
        difficulty: "medium",
        substitutions: [
          "Masarepa (pre-cooked cornmeal) is in Latin shops; do not substitute raw polenta meal.",
        ],
      },
    ),
    main: r(
      "ajiaco",
      "Ajiaco",
      "Ajiaco santafereño",
      "main",
      [
        { name: "chicken thighs", quantity: 800, unit: "g" },
        { name: "potato (mixed varieties)", quantity: 1, unit: "kg" },
        { name: "corn on the cob", quantity: 2, unit: "pieces" },
        { name: "guascas", quantity: 10, unit: "g", note: "dried if needed" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "double cream", quantity: 100, unit: "ml" },
        { name: "capers", quantity: 40, unit: "g" },
        { name: "avocado", quantity: 2, unit: "pieces" },
      ],
      [
        "1. Simmer chicken with onion, garlic, and salt until tender; shred the meat and reserve the broth.",
        "2. Add cubed potatoes and corn rounds to the broth and cook until some potatoes break down and thicken the soup.",
        "3. Stir in guascas and return the chicken; simmer a few minutes more.",
        "4. Serve in deep bowls with cream, capers, and sliced avocado on the side.",
      ],
      {
        description:
          "Bogotá chicken-and-potato soup thickened by mixed potatoes and scented with guascas.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 25,
        cookMinutes: 75,
        difficulty: "medium",
        substitutions: [
          "Dried guascas are sold in Latin American shops; a little oregano is a weak emergency substitute.",
        ],
      },
    ),
    side: r(
      "patacones",
      "Patacones",
      "Patacones",
      "side",
      [
        { name: "green plantains", quantity: 4, unit: "pieces" },
        { name: "oil", quantity: 500, unit: "ml", note: "for frying" },
        { name: "salt", quantity: 5, unit: "g" },
        { name: "garlic", quantity: 2, unit: "cloves", note: "optional dip" },
      ],
      [
        "1. Peel green plantains and cut into thick rounds.",
        "2. Fry once until pale, smash flat, then fry again until crisp and golden.",
        "3. Sprinkle with salt while hot.",
        "4. Serve with hogao, guacamole, or ají.",
      ],
      {
        description:
          "Twice-fried green plantain discs smashed flat and salted while hot.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 20,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "arroz-con-leche",
      "Rice Pudding",
      "Arroz con leche",
      "dessert",
      [
        { name: "short-grain rice", quantity: 150, unit: "g" },
        { name: "milk", quantity: 1, unit: "litre" },
        { name: "condensed milk", quantity: 200, unit: "ml" },
        { name: "cinnamon stick", quantity: 1, unit: "piece" },
        { name: "sugar", quantity: 40, unit: "g" },
        { name: "raisins", quantity: 40, unit: "g" },
      ],
      [
        "1. Simmer rice with milk and cinnamon, stirring often, until soft and creamy.",
        "2. Stir in condensed milk, sugar, and raisins; cook a few minutes more.",
        "3. Remove the cinnamon stick and cool slightly.",
        "4. Serve warm or chilled with a dusting of ground cinnamon.",
      ],
      {
        description:
          "Creamy cinnamon rice pudding sweetened with condensed milk.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 45,
        difficulty: "easy",
      },
    ),
    drink: drink(
      "Limonada de Coco",
      "Limonada de coco",
      "soft-drink",
      false,
      "Blended coconut, lime, and ice into a creamy non-alcoholic cooler.",
    ),
    moreDrinks: [
      drink(
        "Café Colombiano",
        "Tinto",
        "coffee",
        false,
        "Small cups of black Colombian coffee, often lightly sweetened.",
      ),
      drink(
        "Club Colombia-style Lager",
        "Cerveza",
        "beer",
        true,
        "A clean golden lager commonly drunk with fried snacks and grilled meat.",
      ),
    ],
  },
  status: "published",
};
