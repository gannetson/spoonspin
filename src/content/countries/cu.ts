import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const cuCountry: AuthoredCountry = {
  code: "cu",
  slug: "cuba",
  name: "Cuba",
  flag: "🇨🇺",
  region: "Americas",
  introduction:
    "Cuban cooking is citrusy, garlicky, and built on slow-braised meats with rice and beans. Spanish, African, and Caribbean influences meet in home kitchens and street stalls.",
  cuisineAliases: [
    "Cuban restaurant",
    "Cubaans restaurant",
    "Caribbean restaurant",
  ],
  nationalDishId: "ropa-vieja",
  nationalDrink: drink(
    "Cuban Rum",
    "Ron",
    "spirit",
    true,
    "Aged sugarcane rum traditionally sipped neat or used in classic Cuban cocktails.",
  ),
  menu: {
    starter: r(
      "tostones",
      "Tostones",
      "Tostones",
      "starter",
      [
        { name: "green plantains", quantity: 3, unit: "pieces" },
        { name: "oil", quantity: 400, unit: "ml", note: "for frying" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "lime", quantity: 1, unit: "piece" },
        { name: "salt", quantity: 5, unit: "g" },
      ],
      [
        "1. Peel plantains, cut into thick slices, and fry until soft but pale.",
        "2. Smash flat, dip briefly in salted garlic water, then fry again until crisp.",
        "3. Season with salt and a squeeze of lime.",
        "4. Serve hot as a starter or side with mojo.",
      ],
      {
        description:
          "Twice-fried smashed green plantains seasoned with garlic salt and lime.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 20,
        difficulty: "easy",
      },
    ),
    main: r(
      "ropa-vieja",
      "Ropa Vieja",
      "Ropa vieja",
      "main",
      [
        { name: "flank steak or brisket", quantity: 900, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "red and green peppers", quantity: 2, unit: "pieces" },
        { name: "garlic", quantity: 5, unit: "cloves" },
        { name: "tomatoes", quantity: 400, unit: "g" },
        { name: "cumin", quantity: 5, unit: "g" },
        { name: "dried oregano", quantity: 3, unit: "g" },
        { name: "bay leaf", quantity: 1, unit: "piece" },
        { name: "white wine or stock", quantity: 150, unit: "ml" },
      ],
      [
        "1. Simmer the beef in salted water with onion and bay until shreddable; reserve some broth.",
        "2. Shred the meat. Soften onion, peppers, and garlic, then add tomato, cumin, and oregano.",
        "3. Return the beef with wine or broth and simmer until the sauce is rich and coating.",
        "4. Serve with rice, beans, and fried plantains.",
      ],
      {
        description:
          "Shredded beef braised with peppers, onion, and tomato until soft and saucy.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 25,
        cookMinutes: 150,
        difficulty: "medium",
      },
    ),
    side: r(
      "moros-y-cristianos",
      "Black Beans and Rice",
      "Moros y cristianos",
      "side",
      [
        { name: "dried black beans", quantity: 250, unit: "g" },
        { name: "long-grain rice", quantity: 300, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "green pepper", quantity: 1, unit: "piece" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "cumin", quantity: 3, unit: "g" },
        { name: "bay leaf", quantity: 1, unit: "piece" },
        { name: "olive oil", quantity: 30, unit: "ml" },
      ],
      [
        "1. Soak and simmer black beans with bay until tender; reserve the cooking liquid.",
        "2. Soften onion, pepper, and garlic in oil; stir in cumin and the drained beans.",
        "3. Add rice and enough bean liquid (plus water if needed) to cook the rice.",
        "4. Cover and simmer until the rice is tender and the grains separate.",
      ],
      {
        description:
          "Rice cooked with black beans and a sofrito of onion, pepper, and garlic.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 90,
        difficulty: "medium",
        substitutions: [
          "Canned black beans work if you use their liquid plus stock for cooking the rice.",
        ],
      },
    ),
    dessert: r(
      "flan",
      "Cuban Flan",
      "Flan",
      "dessert",
      [
        { name: "eggs", quantity: 5, unit: "pieces" },
        { name: "evaporated milk", quantity: 350, unit: "ml" },
        { name: "condensed milk", quantity: 300, unit: "ml" },
        { name: "vanilla", quantity: 5, unit: "ml" },
        { name: "sugar", quantity: 150, unit: "g", note: "for caramel" },
      ],
      [
        "1. Melt sugar in a pan until amber caramel; pour into a mould and swirl to coat.",
        "2. Blend eggs with both milks and vanilla; pour over the set caramel.",
        "3. Bake in a water bath at 170°C until just set.",
        "4. Chill thoroughly, then invert onto a plate so the caramel runs over the top.",
      ],
      {
        description:
          "Silky baked custard unmoulded over a dark sugar caramel sauce.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 55,
        difficulty: "medium",
      },
    ),
    drink: drink(
      "Guarapo",
      "Guarapo",
      "soft-drink",
      false,
      "Fresh sugarcane juice pressed and served over ice, sometimes with a squeeze of lime.",
    ),
    moreDrinks: [
      drink(
        "Mojito",
        "Mojito",
        "cocktail",
        true,
        "White rum muddled with mint, lime, sugar, and soda into a classic Cuban highball.",
      ),
      drink(
        "Café Cubano",
        "Cafecito",
        "coffee",
        false,
        "Strong espresso-style coffee whipped with the first drops into a sweet foam.",
      ),
    ],
  },
  status: "published",
};
