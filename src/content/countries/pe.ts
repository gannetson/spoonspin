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
    starter: r("causa", "Potato Causa", "Causa limeña", "starter", [
      { name: "yellow potatoes", quantity: 800, unit: "g" },
      { name: "lime", quantity: 3, unit: "pieces" },
      { name: "avocado", quantity: 2, unit: "pieces" },
    ]),
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
      ],
      "Fresh fish briefly cured in lime with chile, onion, sweet potato, and corn.",
    ),
    side: r("choclo", "Peruvian Corn", "Choclo", "side", [
      { name: "corn on cob", quantity: 4, unit: "pieces" },
      { name: "butter", quantity: 40, unit: "g" },
      { name: "fresh cheese", quantity: 150, unit: "g" },
    ]),
    dessert: r("arroz-zambito", "Spiced Rice Pudding", "Arroz zambito", "dessert", [
      { name: "rice", quantity: 180, unit: "g" },
      { name: "evaporated milk", quantity: 400, unit: "ml" },
      { name: "chancaca", quantity: 180, unit: "g" },
    ]),
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
        ],
        {
          description:
            "Wok-tossed beef with onion, tomato, and soy, served with fries and rice.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Lomo_saltado",
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
        ],
        {
          description:
            "Shredded chicken in a creamy yellow chilli sauce thickened with bread and nuts.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Ají_de_gallina",
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
          { name: "flour", quantity: 300, unit: "g" },
          { name: "chancaca or dark sugar", quantity: 200, unit: "g" },
        ],
        {
          description:
            "Pumpkin-sweet potato doughnuts soaked in spiced chancaca syrup.",
          dietaryLabels: ["vegetarian"],
          sourceUrl: "https://en.wikipedia.org/wiki/Picarones",
        },
      ),
    ],
  },
  status: "published",
};
