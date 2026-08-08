import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const jmCountry: AuthoredCountry = {
  code: "jm",
  slug: "jamaica",
  name: "Jamaica",
  flag: "🇯🇲",
  region: "Americas",
  introduction:
    "Jamaican cooking is bold with allspice, Scotch bonnet chile, tropical fruit, and smoke. Its food carries African, Indigenous, British, and South Asian influences in vibrant island combinations.",
  cuisineAliases: [
    "Jamaican restaurant",
    "Jamaicaans restaurant",
    "Caribbean restaurant",
  ],
  nationalDishId: "ackee-saltfish",
  nationalDrink: drink(
    "Jamaican Rum",
    "Jamaicaanse rum",
    "spirit",
    true,
    "Full-flavoured sugarcane rum, served neat or in a mixed drink.",
  ),
  menu: {
    starter: r(
      "jamaican-patties",
      "Jamaican Patties",
      "Jamaican patties",
      "starter",
      [
        { name: "shortcrust or puff pastry", quantity: 400, unit: "g" },
        { name: "ground beef", quantity: 400, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "allspice", quantity: 5, unit: "g" },
        { name: "curry powder", quantity: 10, unit: "g" },
        { name: "Scotch bonnet or mild chile", quantity: 0.5, unit: "piece" },
        { name: "turmeric", quantity: 3, unit: "g", note: "for pastry colour" },
      ],
      [
        "1. Soften onion, brown the beef, and season with curry, allspice, thyme, chile, and salt; cool the filling.",
        "2. Roll pastry, brush lightly with turmeric oil if you like a golden crust, and cut into rounds.",
        "3. Fill, fold into half-moons, and crimp the edges.",
        "4. Bake at 200°C until puffed and deep golden.",
      ],
      {
        description:
          "Flaky golden pastry half-moons filled with spiced minced beef.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 30,
        cookMinutes: 30,
        difficulty: "medium",
        substitutions: [
          "Ready puff pastry from Dutch shops works; use mild chile if Scotch bonnet is too fierce.",
        ],
      },
    ),
    main: r(
      "ackee-saltfish",
      "Ackee and Saltfish",
      "Ackee and saltfish",
      "main",
      [
        { name: "salt cod", quantity: 500, unit: "g" },
        { name: "tinned ackee", quantity: 500, unit: "g" },
        { name: "tomatoes", quantity: 250, unit: "g" },
        { name: "Scotch bonnet", quantity: 1, unit: "piece" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "sweet pepper", quantity: 1, unit: "piece" },
        { name: "thyme", quantity: 5, unit: "g" },
      ],
      [
        "1. Soak salt cod in several changes of cold water (or simmer briefly) until pleasantly salty; flake the fish.",
        "2. Soften onion, pepper, tomato, thyme, and whole Scotch bonnet in oil without breaking the chile.",
        "3. Add the fish and warm through, then gently fold in drained ackee so it stays in soft chunks.",
        "4. Remove the chile and serve with fried dumplings or breadfruit if you have them.",
      ],
      {
        description:
          "Jamaica's iconic breakfast of flaked salt cod and buttery ackee with peppers.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 40,
        cookMinutes: 20,
        difficulty: "medium",
        substitutions: [
          "Tinned ackee is essential and sold in Caribbean shops; salt cod is in many Dutch fish counters.",
        ],
      },
    ),
    side: r(
      "rice-and-peas",
      "Rice and Peas",
      "Rice and peas",
      "side",
      [
        { name: "long-grain rice", quantity: 350, unit: "g" },
        { name: "cooked kidney beans", quantity: 400, unit: "g" },
        { name: "coconut milk", quantity: 400, unit: "ml" },
        { name: "water", quantity: 250, unit: "ml" },
        { name: "thyme", quantity: 5, unit: "g" },
        { name: "spring onion", quantity: 2, unit: "pieces" },
        { name: "allspice berries", quantity: 4, unit: "pieces" },
      ],
      [
        "1. Simmer beans with coconut milk, water, thyme, spring onion, and allspice for 10 minutes.",
        "2. Stir in rinsed rice, season with salt, and bring back to a simmer.",
        "3. Cover and cook on low until the liquid is absorbed and the rice is tender.",
        "4. Rest 5 minutes, remove aromatics, and fluff.",
      ],
      {
        description:
          "Coconut rice cooked with kidney beans, thyme, and allspice.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 30,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "coconut-drops",
      "Coconut Drops",
      "Coconut drops",
      "dessert",
      [
        { name: "fresh or frozen grated coconut", quantity: 400, unit: "g" },
        { name: "brown sugar", quantity: 180, unit: "g" },
        { name: "fresh ginger", quantity: 20, unit: "g" },
        { name: "water", quantity: 80, unit: "ml" },
        { name: "vanilla", quantity: 5, unit: "ml" },
      ],
      [
        "1. Combine coconut, sugar, grated ginger, and water in a heavy pan.",
        "2. Cook over medium heat, stirring, until the mixture thickens and pulls from the pan.",
        "3. Stir in vanilla, then spoon rough mounds onto baking paper.",
        "4. Cool until set and chewy.",
      ],
      {
        description:
          "Chewy ginger-scented coconut candy mounds cooled on the counter.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 25,
        difficulty: "medium",
      },
    ),
    drink: drink(
      "Sorrel Drink",
      "Sorrel",
      "soft-drink",
      false,
      "Spiced hibiscus drink often made for celebrations.",
    ),
    moreRecipes: [
      r(
        "jerk-chicken",
        "Jerk Chicken",
        "Jerk chicken",
        "main",
        [
          { name: "chicken thighs", quantity: 1000, unit: "g" },
          { name: "jerk seasoning or paste", quantity: 60, unit: "g" },
          { name: "Scotch bonnet", quantity: 1, unit: "piece" },
          { name: "lime", quantity: 2, unit: "pieces" },
          { name: "spring onions", quantity: 4, unit: "pieces" },
        ],
        [
          "1. Score the chicken and rub thoroughly with jerk paste, lime juice, and chopped spring onion; marinate overnight if possible.",
          "2. Grill over medium heat or roast at 200°C until cooked through and charred at the edges.",
          "3. Rest a few minutes and serve with extra lime.",
        ],
        {
          description:
            "Chicken marinated in fiery allspice-scotch bonnet paste and grilled until lacquered.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 20,
          cookMinutes: 40,
          difficulty: "medium",
          substitutions: [
            "Ready jerk paste is sold in many Dutch supermarkets; use less chile for a milder result.",
          ],
        },
      ),
      r(
        "callaloo",
        "Callaloo Greens",
        "Callaloo",
        "side",
        [
          { name: "callaloo or spinach", quantity: 500, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "tomato", quantity: 1, unit: "piece" },
          { name: "thyme", quantity: 5, unit: "g" },
          { name: "garlic", quantity: 2, unit: "cloves" },
        ],
        [
          "1. Soften onion and garlic in a little oil.",
          "2. Add chopped tomato and thyme, then pile in the washed greens.",
          "3. Cover and simmer until soft and silky; season with salt and black pepper.",
        ],
        {
          description:
            "Leafy greens simmered with onion, tomato, and thyme into a soft, savoury side.",
          dietaryLabels: ["vegetarian", "vegan"],
          prepMinutes: 10,
          cookMinutes: 15,
          difficulty: "easy",
        },
      ),
      r(
        "rum-cake",
        "Jamaican Rum Cake",
        "Rum cake",
        "dessert",
        [
          { name: "mixed dried fruit", quantity: 300, unit: "g" },
          { name: "dark rum", quantity: 120, unit: "ml" },
          { name: "butter", quantity: 200, unit: "g" },
          { name: "brown sugar", quantity: 200, unit: "g" },
          { name: "eggs", quantity: 3, unit: "pieces" },
          { name: "plain flour", quantity: 250, unit: "g" },
          { name: "baking powder", quantity: 10, unit: "g" },
        ],
        [
          "1. Soak dried fruit in rum for several hours or overnight.",
          "2. Cream butter and sugar, beat in eggs, then fold in flour, baking powder, and the soaked fruit.",
          "3. Bake in a lined tin at 160°C until a skewer comes out clean.",
          "4. Brush the warm cake with extra rum syrup and cool before slicing.",
        ],
        {
          description:
            "Dense fruit-studded cake soaked with dark rum syrup for festive gatherings.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 30,
          cookMinutes: 70,
          difficulty: "medium",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Red Stripe",
        "Red Stripe",
        "beer",
        true,
        "Jamaican lager often enjoyed with spicy grilled food.",
      ),
      drink(
        "Ginger Beer",
        "Ginger beer",
        "soft-drink",
        false,
        "Spicy-sweet ginger soda that cuts through rich jerk flavours.",
      ),
    ],
  },
  status: "published",
};
