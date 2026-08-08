import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const peCountry: AuthoredCountry = {
  code: "pe",
  slug: "peru",
  name: "Peru",
  flag: "🇵🇪",
  region: "Americas",
  introduction:
    "Peruvian food draws on coastal seafood, Andean potatoes and grains, Amazonian ingredients, and immigrant cooking. Its bright chile-and-lime flavours are recognisable around the world.",
  cuisineAliases: ["Peruvian restaurant", "Peruaans restaurant", "cevichería"],
  nationalDishId: "ceviche",
  nationalDrink: drink(
    "Pisco Sour",
    "Pisco sour",
    "cocktail",
    true,
    "Pisco, lime, sugar, and egg white shaken into a foamy cocktail.",
  ),
  menu: {
    starter: r(
      "causa",
      "Potato Causa",
      "Causa limeña",
      "starter",
      [
        { name: "yellow potatoes", quantity: 800, unit: "g" },
        { name: "lime", quantity: 3, unit: "pieces" },
        { name: "aji amarillo paste", quantity: 40, unit: "g" },
        { name: "avocado", quantity: 2, unit: "pieces" },
        { name: "cooked chicken or tuna", quantity: 250, unit: "g" },
        { name: "mayonnaise", quantity: 60, unit: "g" },
      ],
      [
        "1. Boil potatoes until soft, mash while hot, and season with lime, salt, oil, and aji amarillo paste.",
        "2. Mix chicken or tuna with mayonnaise for the filling.",
        "3. Layer potato, filling, and avocado in a mould or dish, finishing with potato.",
        "4. Chill until firm, then unmould and slice.",
      ],
      {
        description:
          "Layered lime-and-chile mashed potato cake filled with avocado and mayo salad.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 30,
        cookMinutes: 25,
        difficulty: "medium",
        substitutions: [
          "Aji amarillo paste is in Latin shops; a mild yellow chile paste plus turmeric colour is a rough stand-in.",
        ],
      },
    ),
    main: r(
      "ceviche",
      "Peruvian Ceviche",
      "Ceviche",
      "main",
      [
        { name: "very fresh white fish", quantity: 700, unit: "g" },
        { name: "lime juice", quantity: 250, unit: "ml" },
        { name: "red onion", quantity: 1, unit: "piece" },
        { name: "ají amarillo paste", quantity: 30, unit: "g" },
        { name: "fresh coriander", quantity: 20, unit: "g" },
        { name: "sweet potato", quantity: 400, unit: "g" },
        { name: "corn kernels or choclo", quantity: 200, unit: "g" },
      ],
      [
        "1. Cube the fish and season lightly with salt; slice onion into thin strips and rinse in cold water.",
        "2. Toss fish with lime juice and aji paste; rest 5–15 minutes until the outside turns opaque.",
        "3. Fold in onion and coriander.",
        "4. Serve immediately with boiled sweet potato and corn.",
      ],
      {
        description:
          "Fresh fish briefly cured in lime with chile, onion, sweet potato, and corn.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 25,
        cookMinutes: 20,
        difficulty: "medium",
        substitutions: [
          "Use sushi-grade fish from a trusted fishmonger; never use fish that smells strong.",
        ],
        servingSuggestion: "Serve at once while the fish is still firm.",
      },
    ),
    side: r(
      "choclo",
      "Peruvian Corn",
      "Choclo",
      "side",
      [
        { name: "corn on the cob", quantity: 4, unit: "pieces" },
        { name: "butter", quantity: 40, unit: "g" },
        { name: "fresh cheese or feta", quantity: 150, unit: "g" },
        { name: "salt", quantity: 5, unit: "g" },
      ],
      [
        "1. Boil the corn in salted water until tender.",
        "2. Drain and brush with butter while hot.",
        "3. Serve with crumbled fresh cheese on the side or sprinkled over.",
      ],
      {
        description:
          "Boiled corn on the cob served with butter and crumbled fresh cheese.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 5,
        cookMinutes: 20,
        difficulty: "easy",
        substitutions: [
          "Large sweetcorn stands in for Andean choclo; feta approximates queso fresco.",
        ],
      },
    ),
    dessert: r(
      "arroz-zambito",
      "Spiced Rice Pudding",
      "Arroz zambito",
      "dessert",
      [
        { name: "rice", quantity: 180, unit: "g" },
        { name: "evaporated milk", quantity: 400, unit: "ml" },
        { name: "chancaca or dark brown sugar", quantity: 180, unit: "g" },
        { name: "water", quantity: 500, unit: "ml" },
        { name: "cinnamon stick", quantity: 1, unit: "piece" },
        { name: "cloves", quantity: 3, unit: "pieces" },
        { name: "raisins", quantity: 50, unit: "g" },
      ],
      [
        "1. Simmer rice in water with cinnamon and cloves until mostly tender.",
        "2. Stir in evaporated milk, chancaca, and raisins; cook until thick and glossy.",
        "3. Remove spices and serve warm.",
      ],
      {
        description:
          "Dark, spice-scented rice pudding sweetened with chancaca-style sugar.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 40,
        difficulty: "easy",
        substitutions: [
          "Dark brown sugar plus a spoon of molasses approximates chancaca.",
        ],
      },
    ),
    drink: drink(
      "Chicha Morada",
      "Chicha morada",
      "soft-drink",
      false,
      "Purple-corn drink perfumed with pineapple, cinnamon, and clove.",
    ),
    moreRecipes: [
      r(
        "lomo-saltado",
        "Lomo Saltado",
        "Lomo saltado",
        "main",
        [
          { name: "beef sirloin", quantity: 600, unit: "g" },
          { name: "red onion", quantity: 2, unit: "pieces" },
          { name: "tomatoes", quantity: 3, unit: "pieces" },
          { name: "soy sauce", quantity: 40, unit: "ml" },
          { name: "vinegar", quantity: 20, unit: "ml" },
          { name: "frozen fries", quantity: 400, unit: "g" },
        ],
        [
          "1. Cut beef into strips and sear very hot in batches; set aside.",
          "2. Stir-fry onion wedges, then tomato, keeping them slightly crisp.",
          "3. Return beef with soy and vinegar; toss briefly.",
          "4. Fold in hot fries and serve with rice.",
        ],
        {
          description:
            "Wok-tossed beef with onion, tomato, and soy, served with fries and rice.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 20,
          cookMinutes: 20,
          difficulty: "medium",
        },
      ),
      r(
        "aji-de-gallina",
        "Aji de Gallina",
        "Ají de gallina",
        "main",
        [
          { name: "cooked chicken", quantity: 500, unit: "g" },
          { name: "aji amarillo paste", quantity: 40, unit: "g" },
          { name: "evaporated milk", quantity: 200, unit: "ml" },
          { name: "bread", quantity: 80, unit: "g" },
          { name: "walnuts or peanuts", quantity: 50, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
        ],
        [
          "1. Soak bread in evaporated milk, then blend with nuts and aji paste.",
          "2. Soften onion, add the blended sauce, and simmer until thick and creamy.",
          "3. Fold in shredded chicken and warm through.",
          "4. Serve with rice and boiled potato or egg.",
        ],
        {
          description:
            "Shredded chicken in a creamy yellow chilli sauce thickened with bread and nuts.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 25,
          cookMinutes: 25,
          difficulty: "medium",
        },
      ),
      r(
        "picarones",
        "Picarones",
        "Picarones",
        "dessert",
        [
          { name: "sweet potato", quantity: 250, unit: "g" },
          { name: "pumpkin puree", quantity: 200, unit: "g" },
          { name: "plain flour", quantity: 300, unit: "g" },
          { name: "yeast", quantity: 7, unit: "g" },
          { name: "chancaca or dark sugar", quantity: 200, unit: "g" },
          { name: "oil", quantity: 1, unit: "litre", note: "for frying" },
        ],
        [
          "1. Mash cooked sweet potato with pumpkin; mix with flour, yeast, and warm water into a sticky dough; rise 1 hour.",
          "2. Simmer dark sugar with water, cinnamon, and orange peel into a syrup; cool slightly.",
          "3. Shape rings of dough with wet hands and fry until golden.",
          "4. Drain and drizzle with the spiced syrup.",
        ],
        {
          description:
            "Pumpkin-sweet potato doughnuts soaked in spiced chancaca syrup.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 40,
          cookMinutes: 30,
          difficulty: "challenging",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Inca Kola",
        "Inca Kola",
        "soft-drink",
        false,
        "Bright yellow sweet soda with a unique herbal-bubblegum flavour.",
      ),
      drink(
        "Cusqueña / Peruvian Lager",
        "Cerveza",
        "beer",
        true,
        "Crisp lager that sits well with ceviche and stir-fried dishes.",
      ),
    ],
  },
  status: "published",
};
