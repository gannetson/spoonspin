import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const maCountry: AuthoredCountry = {
  code: "ma",
  slug: "morocco",
  name: "Morocco",
  flag: "🇲🇦",
  region: "Africa",
  introduction:
    "Moroccan cooking layers sweet, sour, warm spices, and slow-cooked textures. Bread, fragrant mint tea, and communal tagines are central to hospitality.",
  cuisineAliases: ["Moroccan restaurant", "Marokkaans restaurant", "Maghreb restaurant"],
  nationalDishId: "chicken-tagine",
  nationalDrink: drink(
    "Mint Tea",
    "Atay",
    "tea",
    false,
    "Sweet green tea poured high with fresh spearmint.",
  ),
  menu: {
    starter: r("zaalouk", "Smoky Aubergine Salad", "Zaalouk", "starter", [
      { name: "aubergines", quantity: 600, unit: "g" },
      { name: "tomatoes", quantity: 400, unit: "g" },
      { name: "garlic", quantity: 3, unit: "cloves" },
    ]),
    main: r(
      "chicken-tagine",
      "Chicken Tagine",
      "طاجين الدجاج",
      "main",
      [
        { name: "chicken thighs", quantity: 800, unit: "g" },
        { name: "preserved lemon", quantity: 1, unit: "piece" },
        { name: "green olives", quantity: 150, unit: "g" },
        { name: "couscous", quantity: 300, unit: "g" },
      ],
      "A slow-braised chicken tagine with olives, preserved lemon, and aromatic spices.",
    ),
    side: r("carrot-chermoula", "Chermoula Carrots", "سلطة الجزر", "side", [
      { name: "carrots", quantity: 700, unit: "g" },
      { name: "coriander", quantity: 20, unit: "g" },
      { name: "cumin", quantity: 6, unit: "g" },
    ]),
    dessert: r("orange-cinnamon", "Cinnamon Oranges", "برتقال بالقرفة", "dessert", [
      { name: "oranges", quantity: 6, unit: "pieces" },
      { name: "cinnamon", quantity: 5, unit: "g" },
      { name: "orange blossom water", quantity: 10, unit: "ml" },
    ]),
    drink: drink(
      "Orange Juice",
      "عصير البرتقال",
      "soft-drink",
      false,
      "Freshly squeezed sweet orange juice.",
    ),
    moreRecipes: [
      r(
        "harira",
        "Harira Soup",
        "حريرة",
        "starter",
        [
          { name: "lamb or beef", quantity: 300, unit: "g" },
          { name: "red lentils", quantity: 100, unit: "g" },
          { name: "chickpeas", quantity: 200, unit: "g" },
          { name: "tomatoes", quantity: 400, unit: "g" },
        ],
        {
          description:
            "Tomato, lentil, and chickpea soup thickened with flour and brightened with herbs and lemon.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Harira",
        },
      ),
      r(
        "couscous-tfaya",
        "Couscous with Tfaya",
        "كسكس",
        "main",
        [
          { name: "couscous", quantity: 400, unit: "g" },
          { name: "onions", quantity: 3, unit: "pieces" },
          { name: "raisins", quantity: 80, unit: "g" },
          { name: "chickpeas", quantity: 250, unit: "g" },
        ],
        {
          description:
            "Steamed couscous topped with caramelised onion-raisin tfaya and a fragrant broth.",
          dietaryLabels: ["vegetarian"],
          sourceUrl: "https://en.wikipedia.org/wiki/Couscous",
        },
      ),
      r(
        "chebakia",
        "Sesame Honey Pastries",
        "شباكية",
        "dessert",
        [
          { name: "flour", quantity: 400, unit: "g" },
          { name: "sesame seeds", quantity: 80, unit: "g" },
          { name: "honey", quantity: 300, unit: "g" },
          { name: "orange blossom water", quantity: 30, unit: "ml" },
        ],
        {
          description:
            "Flower-shaped fried pastries soaked in honey and coated with sesame.",
          dietaryLabels: ["vegetarian"],
          sourceUrl: "https://en.wikipedia.org/wiki/Chebakia",
        },
      ),
    ],
  },
  status: "published",
};
